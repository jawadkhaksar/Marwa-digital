import type { LayoutNode, StyleClassDefinition, TimedAnimationDefinition, BlockTimeline } from "@marwa/builder";
import { getBlockDefinition, parseLayoutDocumentSafe } from "@marwa/builder";
import type { PostContextData } from "@/lib/api";
import { BLOCK_COMPONENTS } from "./blockComponents";
import { resolveDynamicTokens, type SiteTagData } from "./resolveDynamicTokens";
import { resolveNodeStyle, resolveClassStyles } from "./resolveNodeStyle";
import { PreviewBridge } from "./PreviewBridge";
import { MotionPathScrollBinder } from "./MotionPathScrollBinder";
import { AnimatedBox } from "./AnimatedBox";
import { EmptyContainerDropzone } from "./EmptyContainerDropzone";
import { CanvasAddSectionBanner } from "./CanvasAddSectionBanner";

const EMPTY_CLASSES_MAP: Map<string, StyleClassDefinition> = new Map();
const EMPTY_TIMED_ANIMATIONS_MAP: Map<string, TimedAnimationDefinition> = new Map();

/**
 * Resolves any `timedAnimationId` references in a node's own timelines
 * against the site-wide shared library — same "purely additive, opt-in"
 * shape as resolveClassStyles: a timeline with no `timedAnimationId` passes
 * through completely untouched. The shared definition supplies everything
 * except `trigger` (which stays local — the trigger belongs to whichever
 * element+event is starting the animation, not the reusable animation
 * itself) and `delay` (also local, since delay is per-trigger).
 */
// Custom Attributes (Settings tab, Phase 4) — values ultimately come from an
// authenticated admin's builder session (same trust boundary as customCss/
// htmlClasses elsewhere), but event-handler and href/src keys are rejected
// as cheap defense in depth: an `onX` attribute would execute admin-entered
// text as JS on every visitor's page, and href/src already have their own
// dedicated, validated fields on link/image blocks.
const DANGEROUS_HTML_ATTR = /^on|^href$|^src$/i;
function sanitizeHtmlAttributes(attrs: Record<string, string> | undefined): Record<string, string> {
  if (!attrs) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (!key || DANGEROUS_HTML_ATTR.test(key)) continue;
    out[key] = value;
  }
  return out;
}

function resolveTimedAnimations(timelines: BlockTimeline[] | undefined, timedAnimationsById: Map<string, TimedAnimationDefinition>): BlockTimeline[] | undefined {
  if (!timelines?.length) return timelines;
  return timelines.map((bt) => {
    if (!bt.timedAnimationId) return bt;
    const shared = timedAnimationsById.get(bt.timedAnimationId);
    if (!shared) return bt;
    return { ...bt, ...shared.timeline, trigger: bt.trigger, delay: bt.delay };
  });
}

/**
 * An onMount entrance's first keyframe (its authored "from" opacity) has to
 * be in the DOM before any JS runs, or the block flashes fully visible for
 * however long GSAP's dynamic import takes (AnimatedBox.tsx plays the real
 * animation once it loads). This used to be computed *inside* AnimatedBox —
 * a Client Component — via `cloneElement(child, { style: {...child.props
 * .style, opacity} })`. That silently broke hydration: AnimatedBox's own
 * client-side re-render reconstructs that merged style object from
 * `child.props.style` as it arrives over the RSC/Flight wire, and — despite
 * the *value* being correct — this reconstruction landed a "server HTML
 * doesn't match client properties" warning on every animated node's style
 * attribute in the admin builder's dev console. Computing it here instead,
 * server-side, means it's baked into the SAME rootStyle object used to
 * generate the SSR HTML in the first place — already present by the time
 * that object crosses into AnimatedBox, so AnimatedBox never has to touch
 * `style` at all and there's nothing left to diverge.
 */
function firstOnMountOpacity(timelines: BlockTimeline[] | undefined): number | undefined {
  if (!timelines?.length) return undefined;
  for (const bt of timelines) {
    if (bt.trigger?.mode !== "onMount") continue;
    for (const track of bt.tracks) {
      if (track.property !== "opacity") continue;
      const first = [...track.keyframes].sort((a, b) => a.time - b.time)[0];
      if (first) return Number(first.value);
    }
  }
  return undefined;
}

/**
 * Renders a `Page.layout` JSON tree (see packages/builder). Stays fully
 * synchronous — it's invoked both from real Server Components (page routes)
 * AND directly inside "use client" components (SiteHeader/SiteFooter render
 * their resolved template's blocks this way), and an async Client Component
 * is a hard React error. Because of that, reusable StyleClass resolution
 * (Phase 2 of the builder-engine upgrade) can't do its own fetch in here —
 * callers that want attached classes to resolve must fetch the site's class
 * map themselves (see styleClassCache.ts's `getStyleClassesMap`, awaitable
 * from any real `async` Server Component) and pass it down via
 * `classesById`; omitting it just means classIds-attached nodes fall back to
 * their own instance style, identical to today's behavior.
 */
export function LayoutRenderer({
  blocks,
  showAddSectionBanner = true,
  classesById = EMPTY_CLASSES_MAP,
  timedAnimationsById = EMPTY_TIMED_ANIMATIONS_MAP,
  isBuilderPreview = false,
  postContext,
  siteContext,
}: {
  blocks: unknown;
  /** Off for header/footer/nested-Template renders — the bottom "add a
   * section" dropzone only makes sense for the tree actually being edited
   * as a page in its own right, not a shared header/footer displayed
   * (unedited, inline) underneath a page's own content, or another
   * template's content recursed into via a Template block. */
  showAddSectionBanner?: boolean;
  classesById?: Map<string, StyleClassDefinition>;
  timedAnimationsById?: Map<string, TimedAnimationDefinition>;
  /** True only when this render is genuinely inside the admin builder's own
   * iframe — decided server-side by the calling page route (reading
   * `__builder_preview` from `searchParams`), never inferred client-side.
   * Defaults to false so every caller that doesn't explicitly opt in (blog
   * templates, SiteHeader/SiteFooter, nested Template blocks, and above all
   * every real visitor route) renders zero editor chrome by construction. */
  isBuilderPreview?: boolean;
  /** The real post being viewed — set when rendering an active "blog_single"
   * SiteTemplate (see apps/web/src/app/blog/[...parts]/page.tsx and the
   * preview/template/[id] route), OR once per post inside a `Posts` block's
   * loop-card repetition (PostsBlock.tsx — there it's a lightweight
   * PostCard, not a full Post, hence this being typed PostContextData
   * rather than Post). Threaded down to every node so the dynamic
   * PostTitle/PostFeaturedImage/PostContent/PostExcerpt/PostInfo blocks (and
   * CTAButton's own-post-link fallback) can read real post data — the only
   * "arbitrary page data" channel LayoutRenderer has; every other prop here
   * is rendering plumbing, not business data. Undefined everywhere else,
   * which each of those blocks already renders a placeholder for. */
  postContext?: PostContextData;
  /** Backs `{{site.*}}` dynamic tags (see resolveDynamicTokens.ts) — a small
   *  projection of SiteSettings, threaded the same way as postContext.
   *  Unlike postContext this is usually available (most pages already fetch
   *  settings somewhere); when a caller genuinely has none, `{{site.*}}`
   *  tokens simply resolve to empty strings, same as any other missing
   *  context. */
  siteContext?: SiteTagData;
}) {
  const doc = parseLayoutDocumentSafe(blocks);
  return (
    <>
      <PreviewBridge isBuilderPreview={isBuilderPreview} />
      <MotionPathScrollBinder />
      {doc.nodes.map((node) => (
        <LayoutNodeRenderer
          key={node.id}
          node={node}
          classesById={classesById}
          timedAnimationsById={timedAnimationsById}
          isBuilderPreview={isBuilderPreview}
          postContext={postContext}
          siteContext={siteContext}
        />
      ))}
      {showAddSectionBanner && <CanvasAddSectionBanner isBuilderPreview={isBuilderPreview} />}
    </>
  );
}

function LayoutNodeRenderer({
  node,
  parentIsFlexRow,
  classesById = EMPTY_CLASSES_MAP,
  timedAnimationsById = EMPTY_TIMED_ANIMATIONS_MAP,
  isBuilderPreview = false,
  postContext,
  siteContext,
}: {
  node: LayoutNode;
  parentIsFlexRow?: boolean;
  classesById?: Map<string, StyleClassDefinition>;
  timedAnimationsById?: Map<string, TimedAnimationDefinition>;
  isBuilderPreview?: boolean;
  postContext?: PostContextData;
  siteContext?: SiteTagData;
}) {
  const definition = getBlockDefinition(node.type);
  const Component = BLOCK_COMPONENTS[node.type];

  if (!definition || !Component) {
    if (process.env.NODE_ENV !== "production") {
      return (
        <div className="border border-dashed border-red-500/60 bg-red-500/10 p-4 text-xs text-red-400">
          Unknown block type &quot;{node.type}&quot; — not in BLOCK_REGISTRY.
        </div>
      );
    }
    return null;
  }

  const parsedProps = definition.propsSchema.safeParse(node.props);
  const rawProps = parsedProps.success ? parsedProps.data : definition.defaultProps;
  // Global Dynamic Tags: substitutes any `{{post.title}}`/`{{site.title}}`-
  // style tokens found in rawProps' string values (including inside
  // repeater-item arrays) with real data, before anything downstream reads
  // props — resolveNodeStyle's --exr-* var minting, childIsFlexRow, and both
  // <Component> spreads below all see the resolved values for free from one
  // call. See resolveDynamicTokens.ts for the token grammar and resolution
  // rules (unresolved tokens become "", never leak {{...}} to a visitor).
  const props = resolveDynamicTokens(rawProps, { post: postContext, site: siteContext });

  // Whether THIS node's own children are laid out side-by-side (a flex/grid
  // row) — passed down so a child Section (see its own `flexChild` prop)
  // knows whether applying a width-derived `flex-basis` to itself is safe.
  // Without this, a Section's own Width/Content-Width sizing (meant for "my
  // share of a row of columns") would apply just as literally to a Section
  // that's merely stacked among unrelated page-level siblings — and if THAT
  // Section's own parent context happens to be a flex *column* instead
  // (common for a page's own top-level block stack), the exact same
  // flex-basis value lands on the vertical axis instead of the horizontal
  // one, turning a "1280px wide" intent into "1280px tall" in practice.
  const propsRecord = props as Record<string, unknown>;
  const childIsFlexRow =
    definition.isContainer &&
    propsRecord.layoutMode !== "grid" &&
    (propsRecord.direction === "row" || propsRecord.direction === "row-reverse");

  const children = node.children?.length
    ? node.children.map((child) => (
        <LayoutNodeRenderer
          key={child.id}
          node={child}
          parentIsFlexRow={childIsFlexRow}
          classesById={classesById}
          timedAnimationsById={timedAnimationsById}
          isBuilderPreview={isBuilderPreview}
          postContext={postContext}
          siteContext={siteContext}
        />
      ))
    : definition.isContainer
      ? <EmptyContainerDropzone blockId={node.id} isBuilderPreview={isBuilderPreview} />
      : undefined;

  // Legacy singleton sections render exactly as they do on the current
  // homepage — no wrapper, since several of them (Hero, in particular) rely
  // on being an unwrapped, unstyled direct child (absolute-positioned
  // header overlay, full-bleed background) that a generic styled <div>
  // would break.
  if (definition.singleton) {
    return <Component />;
  }

  const blockClassName = `blk-${node.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const effectiveStyle = node.classIds?.length ? resolveClassStyles(node.classIds, classesById, node.style) : node.style;
  const { className, style, responsiveCss, htmlId } = resolveNodeStyle(effectiveStyle, props as Record<string, unknown>, blockClassName, parentIsFlexRow);
  // Divider's own "Alignment" (left/center/right) centers a fixed-width line
  // via margin-left/right:auto — which only has room to work if ITS OWN
  // wrapper is genuinely full-width. Left to the parent's own `alignItems`
  // (e.g. a deliberately left-aligned text column), a flex item with no
  // explicit width shrink-wraps to content, leaving margin:auto nothing to
  // distribute. `alignSelf: stretch` overrides just this one flex item,
  // regardless of what the parent's alignItems is set to.
  //
  // ProcessSteps hits the same shrink-wrap default from the other direction:
  // its mobile carousel measures its own scrollable content's natural
  // (max-content) width for the parent's intrinsic-sizing pass, even though
  // overflow-x:auto clips it visually — so an unstretched wrapper could
  // size itself to that oversized max-content width instead of the column's
  // actual available width, dragging the whole page into horizontal
  // overflow on mobile. Same fix, same root cause class.
  const resolvedTimelines = node.timelines?.length ? resolveTimedAnimations(node.timelines, timedAnimationsById) : undefined;
  const onMountOpacity = firstOnMountOpacity(resolvedTimelines);
  const rootStyle =
    node.type === "Divider" || node.type === "ProcessSteps"
      ? { ...style, alignSelf: "stretch" as const, ...(onMountOpacity !== undefined ? { opacity: onMountOpacity } : null) }
      : onMountOpacity !== undefined
        ? { ...style, opacity: onMountOpacity }
        : style;
  const rootAttrs = {
    id: htmlId,
    className: className || undefined,
    style: rootStyle,
    "data-block-id": node.id,
    "data-block-type": node.type,
    ...sanitizeHtmlAttributes(node.style?.htmlAttributes),
  };

  // Container blocks (Section, Columns) render their own background/border
  // on their own root element — wrapping them in a second <div> for the
  // generic padding/margin/background (Advanced tab) would put that div's
  // padding *outside* the element that has the background-image, visibly
  // inset from the edges instead of the image filling behind the padding
  // the way CSS actually composes. So these get the wrapper's attributes
  // merged directly onto their own root instead of wrapped a second time.
  const inner = definition.isContainer ? (
    <Component {...props} wrapperProps={rootAttrs} parentIsFlexRow={parentIsFlexRow} postContext={postContext} siteContext={siteContext}>
      {children}
    </Component>
  ) : (
    <div {...rootAttrs}>
      <Component {...props} postContext={postContext} siteContext={siteContext}>{children}</Component>
    </div>
  );

  return (
    <>
      {responsiveCss && <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />}
      {resolvedTimelines ? <AnimatedBox timelines={resolvedTimelines}>{inner}</AnimatedBox> : inner}
    </>
  );
}
