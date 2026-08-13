import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  Unlink,
  Box,
  LayoutGrid,
  Maximize2,
  Code,
  Eye,
  Layers,
  Move,
  Sparkles,
  Sliders,
  Lock,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  EyeOff,
  Scissors,
  Pin,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Plus,
  Trash2,
  Crop,
  MousePointer,
  Puzzle,
} from "lucide-react";
import { api, type Menu } from "@/lib/api";
import { useStyleClasses } from "./useStyleClasses";
import { useTimedAnimations } from "./useTimedAnimations";
import { SelectorStateHeader, type PseudoState } from "./SelectorStateHeader";
import type { TimedAnimation } from "@/lib/api";
import {
  ANIMATION_EASE_VALUES,
  SPLIT_TEXT_VALUES,
  CLIP_REVEAL_VALUES,
  describePropsSchema,
  getBlockDefinition,
  type AnimationEase,
  type AnimationTrigger,
  type AnimationTweenValues,
  type BlockTimeline,
  type Breakpoint,
  type ClipRevealDirection,
  type HoverAnimation,
  type LayoutNode,
  type LayoutNodeStyle,
  type MouseScope,
  type NodeAnimationConfig,
  type PropFieldDescriptor,
  type ResponsiveStyleFields,
  type SliderSlide,
  type SplitTextMode,
  type FormFieldDef,
  FORM_ACTION_VALUES,
  NAV_MENU_HOVER_EFFECT_VALUES,
  NAV_MENU_ALIGNMENT_VALUES,
  BORDER_STYLE_VALUES,
  DIVIDER_STYLE_VALUES,
  ICON_LIST_ALIGN_VALUES,
  type IconListItem,
  STYLE_KEYS,
  STRUCTURAL_STYLE_KEYS,
  BOX_MODEL_KEYS,
  type ScrollMarqueeItem,
  type TestimonialPlatformItem,
  type PillLinkItem,
  type FaqItem,
  type ProcessStepItem,
  type IconBulletItem,
  type TimelineBulletItem,
  type ShapeBulletItem,
  SHAPE_BULLET_SHAPE_VALUES,
  type IconAccordionItem,
  type StackedImageItem,
  type SocialLink,
  SOCIAL_LINK_PLATFORM_VALUES,
  type PriceFeature,
  type BusinessHourItem,
  type MultiButtonItem,
  type FaqSchemaItem,
  type HotspotPoint,
  type VideoPlaylistItem,
  type TabItem,
  type ItineraryRoadmapItem,
  type RouteCardItem,
  type StaticTourItem,
  type DefinitionRowItem,
  type TourInfoFact,
  type TechStackItem,
  MULTI_BUTTON_ICON_POSITION_VALUES,
  BG_POSITION_VALUES,
  BG_ATTACHMENT_VALUES,
  BG_REPEAT_VALUES,
  BG_SIZE_VALUES,
  BG_GRADIENT_TYPE_VALUES,
  isDynamicToken,
  extractDynamicTagKey,
  getDynamicTagLabel,
  type StyleOverrideBag,
} from "@marwa/builder";

// Blocks whose own text content can be split into chars/words/lines for a
// staggered reveal (see the Split Text control in the Interactions tab).
const TEXT_BLOCK_TYPES = new Set(["Heading", "RichText"]);
const ACTION_LABELS: Record<(typeof FORM_ACTION_VALUES)[number], string> = {
  collectSubmissions: "Collect Submissions",
  email: "Email",
  redirect: "Redirect",
  webhook: "Webhook",
};
import { ImagePicker } from "@/components/ImagePicker";
import { IconLibraryPicker } from "@/components/IconLibraryPicker";
import { SlidesEditor } from "@/components/builder/SlidesEditor";
import { FieldsEditor } from "@/components/builder/FieldsEditor";
import { StringListEditor } from "@/components/builder/StringListEditor";
import { IconListEditor } from "@/components/builder/IconListEditor";
import { ServiceItemsEditor, type ServiceItem } from "@/components/builder/ServiceItemsEditor";
import { SimpleRepeaterEditor } from "@/components/builder/SimpleRepeaterEditor";
import { LoopTemplateSelect } from "@/components/builder/LoopTemplateSelect";
import { DynamicTagButton } from "@/components/builder/DynamicTagButton";
import { TableEditor } from "@/components/builder/TableEditor";
import { RichTextEditor } from "@/components/RichTextEditor";
import { generateNodeId } from "@/lib/builder/tree";
import { LengthField } from "@/components/builder/sharedFields";
import { ColorField } from "@/components/builder/ColorField";
import { SegmentedField } from "@/components/builder/SegmentedField";
import { TypographyField, TYPOGRAPHY_FIELD_KEYS } from "@/components/builder/TypographyField";
import { animationConfigToBlockTimeline, blockTimelineToAnimationConfig } from "@/components/builder/animationConfigAdapter";

// Fields that hold a single image URL, rendered with the real upload/media-library
// picker instead of a raw text input. Any block can opt in just by naming its
// image prop one of these keys.
const IMAGE_FIELD_KEYS = new Set(["backgroundImage", "sectionBackgroundImage", "src", "logoImageOverride", "menuIcon", "closeIcon", "frontImage", "beforeImage", "afterImage", "photo", "image", "carImage", "skylineImage", "route2SkylineImage", "route2CarImage", "route3SkylineImage", "route3CarImage", "card1ImageLeft", "card1ImageRight", "card2ImageLeft", "card2ImageRight", "card3ImageLeft", "card3ImageRight"]);

// Enum fields whose options are a spatial/directional concept (alignment,
// position, flex direction, ...) rather than an arbitrary named preset —
// these get SegmentedField's icon-button row instead of a plain <select> of
// raw CSS values ("flex-start", "flex-end", ...). Global by field name, same
// pattern as IMAGE_FIELD_KEYS/COLOR_FIELD_KEYS above: any block's prop opts
// in just by using one of these names. Deliberately excludes non-directional
// enums (borderStyle, variant, textTransform, ...) and backgroundPosition
// (a 9-way 2D grid, not a row — needs its own picker, not in this pass).
const SEGMENTED_FIELD_KEYS = new Set([
  "align",
  "captionAlign",
  "imageAlign",
  "alignment",
  "mobileAlignment",
  "textAlign",
  "blockAlign",
  "justifyContent",
  "alignItems",
  "direction",
  "flipDirection",
  "iconPosition",
  "submitIconPosition",
  "imagePosition",
  "listAlign",
  "iconHorizontalAlign",
  "iconVerticalAlign",
  "imageAlignment",
  "titleAlignment",
  "readMoreAlignment",
  "buttonAlignment",
  "arrowPosition",
]);

// CSS length fields rendered with a unit dropdown + slider instead of a raw
// text input. Range/step is per-field since "reasonable width" and
// "reasonable border width" are very different scales; new length props can
// opt in by adding an entry here.
const LENGTH_FIELD_RANGES: Record<string, { min: number; max: number; step: number; unit?: string }> = {
  width: { min: 0, max: 1920, step: 10 },
  minHeight: { min: 0, max: 1000, step: 10 },
  backgroundBlur: { min: 0, max: 40, step: 1 },
  gap: { min: 0, max: 200, step: 4 },
  borderWidth: { min: 0, max: 20, step: 1 },
  borderRadius: { min: 0, max: 100, step: 2 },
  fontSize: { min: 8, max: 120, step: 1 },
  lineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  letterSpacing: { min: -5, max: 20, step: 0.5 },
  wordSpacing: { min: -10, max: 50, step: 1 },
  textStrokeWidth: { min: 0, max: 10, step: 0.5 },
  columnsGap: { min: 0, max: 100, step: 2 },
  itemGap: { min: 0, max: 100, step: 2 },
  factsGap: { min: 0, max: 100, step: 2 },
  paragraphSpacing: { min: 0, max: 60, step: 1 },
  paddingTop: { min: 0, max: 100, step: 1 },
  paddingRight: { min: 0, max: 100, step: 1 },
  paddingBottom: { min: 0, max: 100, step: 1 },
  paddingLeft: { min: 0, max: 100, step: 1 },
  size: { min: 8, max: 200, step: 2 },
  padding: { min: 0, max: 100, step: 1 },
  slideBorderRadius: { min: 0, max: 100, step: 2 },
  slidePadding: { min: 0, max: 100, step: 1 },
  imageSpacing: { min: 0, max: 100, step: 2 },
  iconSpacing: { min: 0, max: 100, step: 2 },
  contentSpacing: { min: 0, max: 100, step: 2 },
  imageWidth: { min: 0, max: 100, step: 1, unit: "%" },
  imageHeight: { min: 0, max: 800, step: 10 },
  subHeadingFontSize: { min: 8, max: 60, step: 1 },
  headingFontSize: { min: 12, max: 120, step: 1 },
  cardTitleFontSize: { min: 10, max: 50, step: 1 },
  cardSubtitleFontSize: { min: 8, max: 30, step: 1 },
  cardBodyFontSize: { min: 8, max: 30, step: 1 },
  cardPadding: { min: 0, max: 80, step: 2 },
  cardGap: { min: 0, max: 80, step: 2 },
  sectionPaddingTop: { min: 0, max: 200, step: 4 },
  sectionPaddingBottom: { min: 0, max: 200, step: 4 },
  arrowSize: { min: 24, max: 80, step: 2 },
  autoplayInterval: { min: 1, max: 20, step: 1, unit: "s" },
  featuredCardScale: { min: 0.8, max: 1.5, step: 0.01 },
  cardHoverScale: { min: 1.0, max: 1.3, step: 0.01 },
  imageHoverScale: { min: 1.0, max: 1.5, step: 0.02 },
  cardImageHeight: { min: 120, max: 500, step: 8 },
  cardImagePadding: { min: 0, max: 48, step: 2 },
  cardImageRadius: { min: 0, max: 48, step: 2 },
  activeCardScale: { min: 1.0, max: 1.2, step: 0.01 },
  activeCardBorderWidth: { min: 0, max: 8, step: 1 },
  titleFontSize: { min: 8, max: 120, step: 1 },
  titleLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  titleLetterSpacing: { min: -5, max: 20, step: 0.5 },
  titleWordSpacing: { min: -10, max: 50, step: 1 },
  titleTextStrokeWidth: { min: 0, max: 10, step: 0.5 },
  descFontSize: { min: 8, max: 120, step: 1 },
  descLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  descLetterSpacing: { min: -5, max: 20, step: 0.5 },
  descWordSpacing: { min: -10, max: 50, step: 1 },
  containerHeight: { min: 0, max: 1000, step: 10 },
  overlayHeight: { min: 0, max: 300, step: 5 },
  readMoreBorderWidth: { min: 0, max: 20, step: 1 },
  readMoreFontSize: { min: 8, max: 120, step: 1 },
  readMoreLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  readMoreLetterSpacing: { min: -5, max: 20, step: 0.5 },
  readMoreWordSpacing: { min: -10, max: 50, step: 1 },
  scrollbarWidth: { min: 0, max: 20, step: 1 },
  scrollbarRadius: { min: 0, max: 20, step: 1 },
  rowsGap: { min: 0, max: 100, step: 2 },
  labelSpacing: { min: 0, max: 60, step: 1 },
  htmlFieldSpacing: { min: 0, max: 60, step: 1 },
  buttonBorderWidth: { min: 0, max: 20, step: 1 },
  labelFontSize: { min: 8, max: 120, step: 1 },
  labelLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  labelLetterSpacing: { min: -5, max: 20, step: 0.5 },
  labelWordSpacing: { min: -10, max: 50, step: 1 },
  htmlFieldFontSize: { min: 8, max: 120, step: 1 },
  htmlFieldLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  htmlFieldLetterSpacing: { min: -5, max: 20, step: 0.5 },
  htmlFieldWordSpacing: { min: -10, max: 50, step: 1 },
  fieldFontSize: { min: 8, max: 120, step: 1 },
  fieldLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  fieldLetterSpacing: { min: -5, max: 20, step: 0.5 },
  fieldWordSpacing: { min: -10, max: 50, step: 1 },
  buttonFontSize: { min: 8, max: 120, step: 1 },
  buttonLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  buttonLetterSpacing: { min: -5, max: 20, step: 0.5 },
  buttonWordSpacing: { min: -10, max: 50, step: 1 },
  messagesFontSize: { min: 8, max: 120, step: 1 },
  messagesLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  messagesLetterSpacing: { min: -5, max: 20, step: 0.5 },
  messagesWordSpacing: { min: -10, max: 50, step: 1 },
  imageMaxWidth: { min: 0, max: 100, step: 1, unit: "%" },
  horizontalPadding: { min: 0, max: 100, step: 1 },
  verticalPadding: { min: 0, max: 100, step: 1 },
  itemSpacing: { min: 0, max: 100, step: 2 },
  triggerIconSize: { min: 8, max: 64, step: 1 },
  triggerBorderWidth: { min: 0, max: 20, step: 1 },
  triggerBorderRadius: { min: 0, max: 100, step: 2 },
  menuFontSize: { min: 8, max: 120, step: 1 },
  menuLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  menuLetterSpacing: { min: -5, max: 20, step: 0.5 },
  menuWordSpacing: { min: -10, max: 50, step: 1 },
  dropdownFontSize: { min: 8, max: 120, step: 1 },
  dropdownLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  dropdownLetterSpacing: { min: -5, max: 20, step: 0.5 },
  dropdownWordSpacing: { min: -10, max: 50, step: 1 },
  dropdownBorderWidth: { min: 0, max: 20, step: 1 },
  dropdownWidth: { min: 0, max: 600, step: 10 },
  dropdownPaddingH: { min: 0, max: 100, step: 1 },
  dropdownPaddingV: { min: 0, max: 100, step: 1 },
  dropdownTopDistance: { min: 0, max: 60, step: 1 },
  dropdownItemGap: { min: 0, max: 40, step: 1 },
  rowSpacing: { min: 0, max: 100, step: 2 },
  buttonPaddingH: { min: 0, max: 60, step: 1 },
  buttonPaddingV: { min: 0, max: 60, step: 1 },
  textFontSize: { min: 8, max: 40, step: 1 },
  cardBorderWidth: { min: 0, max: 20, step: 1 },
  cardBorderRadius: { min: 0, max: 100, step: 2 },
  cardPaddingTop: { min: 0, max: 100, step: 1 },
  cardPaddingRight: { min: 0, max: 100, step: 1 },
  cardPaddingBottom: { min: 0, max: 100, step: 1 },
  cardPaddingLeft: { min: 0, max: 100, step: 1 },
  imageBorderRadius: { min: 0, max: 100, step: 2 },
  badgeFontSize: { min: 8, max: 40, step: 1 },
  featuresFontSize: { min: 8, max: 40, step: 1 },
  featuresItemSpacing: { min: 0, max: 60, step: 1 },
  listGap: { min: 0, max: 60, step: 1 },
  dividerThickness: { min: 0, max: 20, step: 1 },
  dividerWidth: { min: 0, max: 100, step: 1, unit: "%" },
  iconSize: { min: 8, max: 80, step: 1 },
  iconGap: { min: 0, max: 60, step: 1 },
  iconVerticalOffset: { min: -40, max: 40, step: 1 },
  textLineHeight: { min: 0.5, max: 3, step: 0.1, unit: "em" },
  textLetterSpacing: { min: -5, max: 20, step: 0.5 },
  textWordSpacing: { min: -10, max: 50, step: 1 },
};

/** Fetches Admin → Menus and lets a Nav Menu block pick which one to render — empty stays "use the site's primary menu". */
function MenuPickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [menus, setMenus] = useState<Menu[]>([]);

  useEffect(() => {
    api.getMenus().then(setMenus).catch(() => {});
  }, []);

  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">Menu</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
      >
        <option value="">(Primary Menu)</option>
        {menus.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] text-zinc-500">
        Go to <a href="/menus" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Menus</a> to manage items.
      </p>
    </div>
  );
}

/** A range+number field with no unit (0–1 opacity, seconds, etc). */
function UnitlessField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  isOverridden = false,
  inheritedFrom,
  onReset,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  isOverridden?: boolean;
  inheritedFrom?: "desktop" | "tablet";
  onReset?: () => void;
}) {
  const num = value === "" ? min : Number(value);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className={`text-xs ${isOverridden ? "font-semibold text-amber-400" : "text-zinc-400"}`}>{label}</label>
          {inheritedFrom && !isOverridden && (
            <span className="rounded bg-zinc-800 px-1 py-0.2 text-[9px] text-zinc-500 uppercase tracking-wide">{inheritedFrom}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isOverridden && onReset ? (
            <button type="button" onClick={onReset} title="Reset override" className="text-[11px] font-bold text-amber-400 hover:text-amber-300">
              ⟲ reset
            </button>
          ) : (
            value !== "" && (
              <button type="button" onClick={() => onChange("")} title="Clear" className="text-[11px] text-red-400 hover:text-red-300">
                ✕
              </button>
            )
          )}
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={num} onChange={(e) => onChange(e.target.value)} className="flex-1 accent-amber-400" />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={(e) => onChange(e.target.value)}
          className={`w-16 rounded-lg border bg-zinc-950 px-2 py-1 text-sm ${isOverridden ? "border-amber-400/80 ring-1 ring-amber-400/30" : "border-zinc-700"}`}
        />
      </div>
    </div>
  );
}

/** A range+number field with a fixed (non-selectable) unit, e.g. always "px" or always "%" — for filter sub-values, which don't make sense in other units. */
function UnitField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  isOverridden = false,
  inheritedFrom,
  onReset,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  isOverridden?: boolean;
  inheritedFrom?: "desktop" | "tablet";
  onReset?: () => void;
}) {
  const num = value ? parseFloat(value) || 0 : min;
  return (
    <div className="mt-2 first:mt-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className={`text-xs ${isOverridden ? "font-semibold text-amber-400" : "text-zinc-400"}`}>{label}</label>
          {inheritedFrom && !isOverridden && (
            <span className="rounded bg-zinc-800 px-1 py-0.2 text-[9px] text-zinc-500 uppercase tracking-wide">{inheritedFrom}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isOverridden && onReset ? (
            <button type="button" onClick={onReset} title="Reset override" className="text-[11px] font-bold text-amber-400 hover:text-amber-300">
              ⟲ reset
            </button>
          ) : (
            value && (
              <button type="button" onClick={() => onChange("")} title="Clear" className="text-[11px] text-red-400 hover:text-red-300">
                ✕
              </button>
            )
          )}
          <span className="text-[11px] text-zinc-500">{unit}</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={(e) => onChange(`${e.target.value}${unit}`)}
          className="flex-1 accent-amber-400"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={(e) => onChange(`${e.target.value}${unit}`)}
          className={`w-16 rounded-lg border bg-zinc-950 px-2 py-1 text-sm ${isOverridden ? "border-amber-400/80 ring-1 ring-amber-400/30" : "border-zinc-700"}`}
        />
      </div>
    </div>
  );
}

const BOX_SHADOW_PATTERN = /^(-?\d+)px (-?\d+)px (\d+)px (\d+)px (.+)$/;

/** Composes Color/Horizontal/Vertical/Blur/Spread into one `box-shadow` CSS value — parses the existing string back into those five parts on a best-effort basis, defaulting to 0/none when it doesn't match (e.g. a hand-edited value). */
function BoxShadowField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const match = value.match(BOX_SHADOW_PATTERN);
  const [h, v, blur, spread, color] = match ? match.slice(1) : ["0", "4", "10", "0", "rgba(0,0,0,0.3)"];

  function compose(next: { h?: string; v?: string; blur?: string; spread?: string; color?: string }) {
    onChange(
      `${next.h ?? h}px ${next.v ?? v}px ${next.blur ?? blur}px ${next.spread ?? spread}px ${next.color ?? color}`
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ColorField label="Color (hex/rgba)" value={value ? color : ""} onChange={(c) => compose({ color: c || "rgba(0,0,0,0.3)" })} />
      <div className="grid grid-cols-2 gap-2">
        <LabeledNumber label="Horizontal" value={value ? h : "0"} onChange={(n) => compose({ h: n })} />
        <LabeledNumber label="Vertical" value={value ? v : "0"} onChange={(n) => compose({ v: n })} />
        <LabeledNumber label="Blur" value={value ? blur : "0"} onChange={(n) => compose({ blur: n })} />
        <LabeledNumber label="Spread" value={value ? spread : "0"} onChange={(n) => compose({ spread: n })} />
      </div>
      {value && (
        <button type="button" onClick={() => onChange("")} className="w-fit text-[11px] text-red-400 hover:text-red-300">
          ✕ Remove shadow
        </button>
      )}
    </div>
  );
}

function LabeledNumber({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-zinc-500">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
      />
    </div>
  );
}

/** A bigger, bolder divider than the gray uppercase sub-headers (Typography groups etc) — marks one of a block's few top-level style sections (e.g. NavMenu's Menu/Dropdown/Trigger) so a long Style tab reads as distinct groups instead of one undifferentiated list. */
function StyleSectionHeader({ label }: { label: string }) {
  return <h4 className="mt-5 border-b border-amber-400/30 pb-2 text-xs font-bold uppercase tracking-wider text-amber-400 first:mt-0">{label}</h4>;
}

/**
 * Elementor-style "Normal | Hover" segmented toggle that swaps which color
 * field is shown/edited, instead of two always-visible "Color"/"Hover Color"
 * rows (the pattern used everywhere else in this panel) — requested
 * explicitly so the state being edited is unambiguous at a glance.
 */
function NormalHoverColorField({
  label,
  normalValue,
  onNormalChange,
  hoverValue,
  onHoverChange,
}: {
  label: string;
  normalValue?: string;
  onNormalChange: (v: string) => void;
  hoverValue?: string;
  onHoverChange: (v: string) => void;
}) {
  const [tab, setTab] = useState<"normal" | "hover">("normal");
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs text-zinc-400">{label}</label>
        <div className="flex rounded-md bg-zinc-800 p-0.5">
          {(["normal", "hover"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-2.5 py-0.5 text-[11px] font-semibold capitalize transition-colors ${
                tab === t ? "bg-amber-400 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {tab === "normal" ? (
        <ColorField value={normalValue} onChange={onNormalChange} compact />
      ) : (
        <ColorField value={hoverValue} onChange={onHoverChange} compact />
      )}
    </div>
  );
}

const BREAKPOINTS: { value: Breakpoint; label: string }[] = [
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet (≤1024px)" },
  { value: "mobile", label: "Mobile (≤640px)" },
];

/** Real device-shaped icons instead of emoji — 📱/📲 render as near-identical phones on most systems, so Tablet and Mobile were indistinguishable at this size. Widths mirror actual device proportions (tablet wider/squarer, mobile narrow/tall) so the three are unambiguous even without the tooltip. */
export function BreakpointIcon({ value }: { value: Breakpoint }) {
  if (value === "desktop") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="4" width="19" height="13" rx="1.5" />
        <path d="M8 20.5h8M12 17v3.5" />
      </svg>
    );
  }
  if (value === "tablet") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2.5" width="16" height="19" rx="2" />
        <path d="M12 18.2h.01" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7.5" y="2.5" width="9" height="19" rx="2" />
      <path d="M12 18.2h.01" />
    </svg>
  );
}

// Presentation-only grouping — packages/builder's schema doesn't know about
// "tabs", it's just a flat props object. Any prop key not listed here falls
// back to the "Content" tab, so new blocks work without touching this map;
// container-ish blocks (Section) use the Layout keys, and any block with a
// "look" property (color, typography, border, shadow...) reusing one of
// these names automatically lands in Style instead of Content.
const LAYOUT_KEYS = new Set(["layoutMode", "direction", "justifyContent", "alignItems", "gap", "wrap", "contentWidth", "width", "minHeight", "columnCount", "ratio"]);
// STYLE_KEYS/STRUCTURAL_STYLE_KEYS now live in packages/builder (imported
// above) — apps/web's resolveNodeStyle needs the same list to know which
// props to mint as `--exr-*` custom properties, so it can no longer be
// admin-local.
// Shown under the Advanced tab's "Additional Options", not Content.
const ADVANCED_PROP_KEYS = new Set(["overflow", "htmlTag"]);

// Style-tab fields rendered as a single grouped control (BoxShadowField,
// FourSideField, UnitField) below the generic per-field loop instead of within it.
const GROUPED_STYLE_KEYS = new Set([
  "boxShadow",
  "hoverBoxShadow",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "rotate",
  "borderRadiusTop",
  "borderRadiusRight",
  "borderRadiusBottom",
  "borderRadiusLeft",
  "slideBoxShadow",
  "imageOpacity",
  "titleFontFamily",
  "titleFontSize",
  "titleFontWeight",
  "titleTextTransform",
  "titleFontStyle",
  "titleTextDecoration",
  "titleLineHeight",
  "titleLetterSpacing",
  "titleWordSpacing",
  "descFontFamily",
  "descFontSize",
  "descFontWeight",
  "descTextTransform",
  "descFontStyle",
  "descTextDecoration",
  "descLineHeight",
  "descLetterSpacing",
  "descWordSpacing",
  "imageBoxShadow",
  "imageBorderRadiusTop",
  "imageBorderRadiusRight",
  "imageBorderRadiusBottom",
  "imageBorderRadiusLeft",
  "imagePaddingTop",
  "imagePaddingRight",
  "imagePaddingBottom",
  "imagePaddingLeft",
  "imageMarginTop",
  "imageMarginRight",
  "imageMarginBottom",
  "imageMarginLeft",
  "titlePaddingTop",
  "titlePaddingRight",
  "titlePaddingBottom",
  "titlePaddingLeft",
  "titleMarginTop",
  "titleMarginRight",
  "titleMarginBottom",
  "titleMarginLeft",
  "contentBorderRadiusTop",
  "contentBorderRadiusRight",
  "contentBorderRadiusBottom",
  "contentBorderRadiusLeft",
  "contentBoxShadow",
  "contentPaddingTop",
  "contentPaddingRight",
  "contentPaddingBottom",
  "contentPaddingLeft",
  "contentMarginTop",
  "contentMarginRight",
  "contentMarginBottom",
  "contentMarginLeft",
  "readMoreFontFamily",
  "readMoreFontSize",
  "readMoreFontWeight",
  "readMoreTextTransform",
  "readMoreFontStyle",
  "readMoreTextDecoration",
  "readMoreLineHeight",
  "readMoreLetterSpacing",
  "readMoreWordSpacing",
  "readMoreBorderRadiusTop",
  "readMoreBorderRadiusRight",
  "readMoreBorderRadiusBottom",
  "readMoreBorderRadiusLeft",
  "readMorePaddingTop",
  "readMorePaddingRight",
  "readMorePaddingBottom",
  "readMorePaddingLeft",
  "readMoreMarginTop",
  "readMoreMarginRight",
  "readMoreMarginBottom",
  "readMoreMarginLeft",
  "labelFontFamily",
  "labelFontSize",
  "labelFontWeight",
  "labelTextTransform",
  "labelFontStyle",
  "labelTextDecoration",
  "labelLineHeight",
  "labelLetterSpacing",
  "labelWordSpacing",
  "htmlFieldFontFamily",
  "htmlFieldFontSize",
  "htmlFieldFontWeight",
  "htmlFieldTextTransform",
  "htmlFieldFontStyle",
  "htmlFieldTextDecoration",
  "htmlFieldLineHeight",
  "htmlFieldLetterSpacing",
  "htmlFieldWordSpacing",
  "fieldFontFamily",
  "fieldFontSize",
  "fieldFontWeight",
  "fieldTextTransform",
  "fieldFontStyle",
  "fieldTextDecoration",
  "fieldLineHeight",
  "fieldLetterSpacing",
  "fieldWordSpacing",
  "fieldBorderWidthTop",
  "fieldBorderWidthRight",
  "fieldBorderWidthBottom",
  "fieldBorderWidthLeft",
  "fieldBorderRadiusTop",
  "fieldBorderRadiusRight",
  "fieldBorderRadiusBottom",
  "fieldBorderRadiusLeft",
  "buttonFontFamily",
  "buttonFontSize",
  "buttonFontWeight",
  "buttonTextTransform",
  "buttonFontStyle",
  "buttonTextDecoration",
  "buttonLineHeight",
  "buttonLetterSpacing",
  "buttonWordSpacing",
  "buttonBorderRadiusTop",
  "buttonBorderRadiusRight",
  "buttonBorderRadiusBottom",
  "buttonBorderRadiusLeft",
  "buttonPaddingTop",
  "buttonPaddingRight",
  "buttonPaddingBottom",
  "buttonPaddingLeft",
  // MultiButtons only (Form doesn't declare these) — safe to group without
  // orphaning Form's own, already-flat buttonMargin/BoxShadow controls.
  "buttonMarginTop",
  "buttonMarginRight",
  "buttonMarginBottom",
  "buttonMarginLeft",
  "buttonBoxShadow",
  "buttonHoverBoxShadow",
  // Tabs (trigger row typography/padding/radius + content panel typography)
  "tabFontFamily",
  "tabFontSize",
  "tabFontWeight",
  "tabLineHeight",
  "tabLetterSpacing",
  "tabTextTransform",
  "tabPaddingTop",
  "tabPaddingRight",
  "tabPaddingBottom",
  "tabPaddingLeft",
  "tabBorderRadiusTop",
  "tabBorderRadiusRight",
  "tabBorderRadiusBottom",
  "tabBorderRadiusLeft",
  "contentFontFamily",
  "contentFontSize",
  "contentFontWeight",
  "contentLineHeight",
  "contentLetterSpacing",
  "contentTextTransform",
  "contentFontStyle",
  "contentTextDecoration",
  "contentWordSpacing",
  // DefinitionRows / ItineraryRoadmap (shared container-padding widget)
  "containerPaddingTop",
  "containerPaddingRight",
  "containerPaddingBottom",
  "containerPaddingLeft",
  // ItineraryRoadmap
  "timeFontFamily",
  "timeFontSize",
  "timeFontWeight",
  "timeTextTransform",
  "timeFontStyle",
  "timeTextDecoration",
  "timeLineHeight",
  "timeLetterSpacing",
  "timeWordSpacing",
  // Columns
  "columnsBackground",
  "columnsHoverBackground",
  "columnsBorderColor",
  "columnsHoverBorderColor",
  "columnsBorderRadius",
  "columnsBoxShadow",
  "columnsHoverBoxShadow",
  "counterPaddingTop",
  "counterPaddingRight",
  "counterPaddingBottom",
  "counterPaddingLeft",
  "counterBorderRadius",
  "counterBoxShadow",
  "quoteFontFamily",
  "quoteFontSize",
  "quoteFontWeight",
  "quoteLineHeight",
  "quoteLetterSpacing",
  "quoteTextTransform",
  "quoteFontStyle",
  "quoteTextDecoration",
  "quoteWordSpacing",
  "authorNameFontFamily",
  "authorNameFontSize",
  "authorNameFontWeight",
  "authorNameTextTransform",
  "authorNameFontStyle",
  "authorNameTextDecoration",
  "authorNameLineHeight",
  "authorNameLetterSpacing",
  "authorNameWordSpacing",
  "messagesFontFamily",
  "messagesFontSize",
  "messagesFontWeight",
  "messagesTextTransform",
  "messagesFontStyle",
  "messagesTextDecoration",
  "messagesLineHeight",
  "messagesLetterSpacing",
  "messagesWordSpacing",
  "imageHoverOpacity",
  "menuFontFamily",
  "menuFontSize",
  "menuFontWeight",
  "menuTextTransform",
  "menuFontStyle",
  "menuTextDecoration",
  "menuLineHeight",
  "menuLetterSpacing",
  "menuWordSpacing",
  "dropdownFontFamily",
  "dropdownFontSize",
  "dropdownFontWeight",
  "dropdownTextTransform",
  "dropdownFontStyle",
  "dropdownTextDecoration",
  "dropdownLineHeight",
  "dropdownLetterSpacing",
  "dropdownWordSpacing",
  "dropdownBorderRadiusTop",
  "dropdownBorderRadiusRight",
  "dropdownBorderRadiusBottom",
  "dropdownBorderRadiusLeft",
  "dropdownBoxShadow",
  "cardPaddingTop",
  "cardPaddingRight",
  "cardPaddingBottom",
  "cardPaddingLeft",
  "cardBoxShadow",
  "platformBoxShadow",
  "eyebrowFontFamily",
  "eyebrowFontSize",
  "eyebrowFontWeight",
  "eyebrowTextTransform",
  "eyebrowFontStyle",
  "eyebrowTextDecoration",
  "eyebrowLineHeight",
  "eyebrowLetterSpacing",
  "eyebrowWordSpacing",
  "questionFontFamily",
  "questionFontSize",
  "questionFontWeight",
  "questionTextTransform",
  "questionFontStyle",
  "questionTextDecoration",
  "questionLineHeight",
  "questionLetterSpacing",
  "questionWordSpacing",
  "answerFontFamily",
  "answerFontSize",
  "answerFontWeight",
  "answerTextTransform",
  "answerFontStyle",
  "answerTextDecoration",
  "answerLineHeight",
  "answerLetterSpacing",
  "answerWordSpacing",
  "headingFontFamily",
  "headingFontSize",
  "headingFontWeight",
  "headingTextTransform",
  "headingFontStyle",
  "headingTextDecoration",
  "headingLineHeight",
  "headingLetterSpacing",
  "headingWordSpacing",
  "ctaFontFamily",
  "ctaFontSize",
  "ctaFontWeight",
  "ctaTextTransform",
  "ctaFontStyle",
  "ctaTextDecoration",
  "ctaLineHeight",
  "ctaLetterSpacing",
  "ctaWordSpacing",
  // Services carousel — Feature Bullets typography (featuresColor stays
  // OUT of this set: it renders in the generic flat loop with a ColorField
  // swatch, same as every other *Color field, sitting alongside — not
  // inside — the grouped Typography control below).
  "featuresFontFamily",
  "featuresFontSize",
  "featuresFontWeight",
  "featuresTextTransform",
  "featuresFontStyle",
  "featuresTextDecoration",
  "featuresLineHeight",
  "featuresLetterSpacing",
  "featuresWordSpacing",
  // PricingOverview — Table Header / Table Row typography (rendered via a
  // dedicated section further down, alongside their non-typography
  // siblings like tableHeaderRadius/tableRowDividerColor).
  "tableHeaderFontFamily",
  "tableHeaderFontSize",
  "tableHeaderFontWeight",
  "tableHeaderTextTransform",
  "tableHeaderFontStyle",
  "tableHeaderTextDecoration",
  "tableHeaderLineHeight",
  "tableHeaderLetterSpacing",
  "tableHeaderWordSpacing",
  "tableRowFontFamily",
  "tableRowFontSize",
  "tableRowFontWeight",
  "tableRowTextTransform",
  "tableRowFontStyle",
  "tableRowTextDecoration",
  "tableRowLineHeight",
  "tableRowLetterSpacing",
  "tableRowWordSpacing",
  // FeaturedRoutesCarousel — Card Title / Sub Label / Card Description
  // typography (rendered via dedicated sections further down). Excluded
  // here so they don't also render a second time via the generic flat loop.
  "cardTitleFontFamily",
  "cardTitleFontSize",
  "cardTitleFontWeight",
  "cardTitleTextTransform",
  "cardTitleFontStyle",
  "cardTitleTextDecoration",
  "cardTitleLineHeight",
  "cardTitleLetterSpacing",
  "cardTitleWordSpacing",
  "subLabelFontFamily",
  "subLabelFontSize",
  "subLabelFontWeight",
  "subLabelTextTransform",
  "subLabelFontStyle",
  "subLabelTextDecoration",
  "subLabelLineHeight",
  "subLabelLetterSpacing",
  "subLabelWordSpacing",
  "cardDescFontFamily",
  "cardDescFontSize",
  "cardDescFontWeight",
  "cardDescTextTransform",
  "cardDescFontStyle",
  "cardDescTextDecoration",
  "cardDescLineHeight",
  "cardDescLetterSpacing",
  "cardDescWordSpacing",
  // Faq — See More button typography
  "showMoreFontFamily",
  "showMoreFontSize",
  "showMoreFontWeight",
  "showMoreTextTransform",
  "showMoreFontStyle",
  "showMoreTextDecoration",
  "showMoreLineHeight",
  "showMoreLetterSpacing",
  "showMoreWordSpacing",
  // Batch 2 — Interactive/Button Chrome (fields with a hand-built control
  // in a dedicated per-block section below, excluded here to avoid also
  // rendering via the generic flat loop)
  "tabBorderStyle",
  "tabBorderWidth",
  "tabBoxShadow",
  "contentBorderStyle",
  "contentBorderWidth",
  "contentBorderColor",
  "triggerBoxShadow",
  "modalBoxShadow",
  "panelBoxShadow",
  // Batch 3 — Stat & Info Cluster (AdvancedHeading's Subtitle, TeamMember's
  // Name/Role/Bio — each gets its own dedicated TypographyField section)
  "subtitleFontFamily",
  "subtitleFontSize",
  "subtitleFontWeight",
  "subtitleTextTransform",
  "subtitleFontStyle",
  "subtitleTextDecoration",
  "subtitleLineHeight",
  "subtitleLetterSpacing",
  "subtitleWordSpacing",
  "nameFontFamily",
  "nameFontSize",
  "nameFontWeight",
  "nameTextTransform",
  "nameFontStyle",
  "nameTextDecoration",
  "nameLineHeight",
  "nameLetterSpacing",
  "nameWordSpacing",
  "platformNameFontFamily",
  "platformNameFontSize",
  "platformNameFontWeight",
  "platformNameTextTransform",
  "platformNameFontStyle",
  "platformNameTextDecoration",
  "platformNameLineHeight",
  "platformNameLetterSpacing",
  "platformNameWordSpacing",
  "viewReviewsFontFamily",
  "viewReviewsFontSize",
  "viewReviewsFontWeight",
  "viewReviewsTextTransform",
  "viewReviewsFontStyle",
  "viewReviewsTextDecoration",
  "viewReviewsLineHeight",
  "viewReviewsLetterSpacing",
  "viewReviewsWordSpacing",
  "roleFontFamily",
  "roleFontSize",
  "roleFontWeight",
  "roleTextTransform",
  "roleFontStyle",
  "roleTextDecoration",
  "roleLineHeight",
  "roleLetterSpacing",
  "roleWordSpacing",
  "bioFontFamily",
  "bioFontSize",
  "bioFontWeight",
  "bioTextTransform",
  "bioFontStyle",
  "bioTextDecoration",
  "bioLineHeight",
  "bioLetterSpacing",
  "bioWordSpacing",
  // Per-side Border Width upgrade — both the flat legacy value AND its new
  // Top/Right/Bottom/Left siblings render together as ONE BorderWidthField
  // widget in each block's existing dedicated section, so all of these
  // (including the flat one) are excluded from the generic flat loop here
  // to avoid also rendering a second, plain duplicate control for it.
  "cardBorderWidth",
  "cardBorderWidthTop",
  "cardBorderWidthRight",
  "cardBorderWidthBottom",
  "cardBorderWidthLeft",
  "buttonBorderWidth",
  "buttonBorderWidthTop",
  "buttonBorderWidthRight",
  "buttonBorderWidthBottom",
  "buttonBorderWidthLeft",
  "triggerBorderWidth",
  "triggerBorderWidthTop",
  "triggerBorderWidthRight",
  "triggerBorderWidthBottom",
  "triggerBorderWidthLeft",
  "columnsBorderWidth",
  "columnsBorderWidthTop",
  "columnsBorderWidthRight",
  "columnsBorderWidthBottom",
  "columnsBorderWidthLeft",
  "imageBorderWidth",
  "imageBorderWidthTop",
  "imageBorderWidthRight",
  "imageBorderWidthBottom",
  "imageBorderWidthLeft",
  "counterBorderWidth",
  "counterBorderWidthTop",
  "counterBorderWidthRight",
  "counterBorderWidthBottom",
  "counterBorderWidthLeft",
  "readMoreBorderWidth",
  "readMoreBorderWidthTop",
  "readMoreBorderWidthRight",
  "readMoreBorderWidthBottom",
  "readMoreBorderWidthLeft",
  "iconBorderWidth",
  "iconBorderWidthTop",
  "iconBorderWidthRight",
  "iconBorderWidthBottom",
  "iconBorderWidthLeft",
  "contentBorderWidthTop",
  "contentBorderWidthRight",
  "contentBorderWidthBottom",
  "contentBorderWidthLeft",
  "dropdownBorderWidth",
  "dropdownBorderWidthTop",
  "dropdownBorderWidthRight",
  "dropdownBorderWidthBottom",
  "dropdownBorderWidthLeft",
  "modalBorderWidth",
  "modalBorderWidthTop",
  "modalBorderWidthRight",
  "modalBorderWidthBottom",
  "modalBorderWidthLeft",
  // Per-side border-width / per-corner border-radius upgrade for blocks
  // with their own bare (unprefixed) border fields.
  "borderWidthTop",
  "borderWidthRight",
  "borderWidthBottom",
  "borderWidthLeft",
  "borderRadiusTopLeft",
  "borderRadiusTopRight",
  "borderRadiusBottomRight",
  "borderRadiusBottomLeft",
  "borderWidth",
  "borderRadius",
  "columnsBackgroundBlur",
  "badgeFontFamily",
  "badgeFontSize",
  "badgeFontWeight",
  "badgeTextTransform",
  "badgeFontStyle",
  "badgeTextDecoration",
  "badgeLineHeight",
  "badgeLetterSpacing",
  "badgeWordSpacing",
  // TourInfoSection
  "descriptionFontFamily",
  "descriptionFontSize",
  "descriptionFontWeight",
  "descriptionTextTransform",
  "descriptionFontStyle",
  "descriptionTextDecoration",
  "descriptionLineHeight",
  "descriptionLetterSpacing",
  "factLabelFontFamily",
  "factLabelFontSize",
  "factLabelFontWeight",
  "factLabelTextTransform",
  "factLabelLetterSpacing",
  "factValueFontFamily",
  "factValueFontSize",
  "factValueFontWeight",
  "factValueLineHeight",
  "primaryCtaFontFamily",
  "primaryCtaFontSize",
  "primaryCtaFontWeight",
  "primaryCtaTextTransform",
  "primaryCtaFontStyle",
  "primaryCtaTextDecoration",
  "primaryCtaLineHeight",
  "primaryCtaLetterSpacing",
  "primaryCtaWordSpacing",
  "secondaryCtaFontFamily",
  "secondaryCtaFontSize",
  "secondaryCtaFontWeight",
  "secondaryCtaTextTransform",
  "secondaryCtaFontStyle",
  "secondaryCtaTextDecoration",
  "secondaryCtaLineHeight",
  "secondaryCtaLetterSpacing",
  "secondaryCtaWordSpacing",
  "sectionPaddingTop",
  "sectionPaddingRight",
  "sectionPaddingBottom",
  "sectionPaddingLeft",
  // Checklist
  "pillFontFamily",
  "pillFontSize",
  "pillFontWeight",
  "itemFontFamily",
  "itemFontSize",
  "itemFontWeight",
  "itemLineHeight",
  ...TYPOGRAPHY_FIELD_KEYS,
]);

// Section declares its own background AND border/shadow cluster as genuine
// content props (see registry.ts's sectionBlock) — not just inheriting the
// generic wrapper-level BOX_MODEL_KEYS bridge like most blocks. Its own
// component (blockComponents.tsx) reads these straight from props and
// spreads them over wrapperProps.style, so the same names ALSO existing as
// generic BOX_MODEL_KEYS fields is a real collision: binding() must route
// them to props for Section specifically, or an edit lands in node.style
// (harmless everywhere else) and gets silently overwritten right back to
// nothing by Section's own props-based render — same class of bug already
// fixed once for direction/gap/width (LAYOUT_KEYS) and background, just not
// yet extended to cover border/shadow, which is the same collision on the
// same block. The (Color/Image/Position/Attachment/Repeat/Size/Blur/Overlay)
// half of this list is ALSO grouped under its own header below instead of
// the generic per-field loop — not put in GROUPED_STYLE_KEYS globally
// because bare "background" is also used, unrelated, by several other
// blocks that still need it in the generic loop.
const SECTION_OWN_STYLE_KEYS = new Set([
  "background",
  "backgroundImage",
  "backgroundPosition",
  "backgroundAttachment",
  "backgroundRepeat",
  "backgroundSize",
  "backgroundBlur",
  "backgroundOverlayType",
  "backgroundOverlayColor",
  "backgroundOverlayImage",
  "backgroundOverlayPosition",
  "backgroundOverlayAttachment",
  "backgroundOverlayRepeat",
  "backgroundOverlaySize",
  "backgroundOverlayGradientType",
  "backgroundOverlayGradientAngle",
  "backgroundOverlayGradientColor1",
  "backgroundOverlayGradientStop1",
  "backgroundOverlayGradientColor2",
  "backgroundOverlayGradientStop2",
  "borderStyle",
  "borderWidth",
  "borderWidthTop",
  "borderWidthRight",
  "borderWidthBottom",
  "borderWidthLeft",
  "borderColor",
  "borderRadius",
  "borderRadiusTopLeft",
  "borderRadiusTopRight",
  "borderRadiusBottomRight",
  "borderRadiusBottomLeft",
  "boxShadow",
]);

// GoogleMaps has the exact same collision as Section above, just with a
// different field cluster and no fallback chain at all (its own component
// reads height/grayscale/borderRadius* straight from props with nothing
// else to fall back to — see blockComponents.tsx's GoogleMaps — so a
// misrouted edit isn't just silently overridden, it has literally zero
// effect). Confirmed live: toggling "Grayscale" wrote a boolean into
// node.style.grayscale (which expects a string, the generic CSS filter
// percentage), failing the save-time schema validation entirely; setting
// "Height" wrote into node.style.height, which nothing reads.
const GOOGLE_MAPS_OWN_STYLE_KEYS = new Set(["height", "grayscale", "borderRadius", "borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"]);

// DefinitionRows renders its decorative `backgroundImage` as a plain <img>
// read straight from props (not a CSS `background-image` the wrapper's
// var-bridge could feed) — see DefinitionRowsBlock.tsx. Routing a Tablet/
// Mobile edit into the generic responsive style bag (what "backgroundImage"
// normally means, e.g. for Section) would silently do nothing here, same
// collision class as Section/GoogleMaps above.
const DEFINITION_ROWS_OWN_STYLE_KEYS = new Set(["backgroundImage"]);

// One lookup for every block known to declare its own prop under a name
// BOX_MODEL_KEYS also reserves for the generic wrapper-level bridge — add a
// new Set + entry here (not a new one-off boolean in binding() below) the
// next time this collision class turns up on another block. Scoped per
// node.type since e.g. bare "background"/"borderRadius" are legitimate,
// correctly-routed wrapper fields for every OTHER block that doesn't
// declare its own same-named prop.
// backgroundImage/Position/Attachment/Repeat/Size are still in
// SECTION_OWN_STYLE_KEYS above (so they stay excluded from the generic
// per-field loop below — Section renders them via its own bespoke
// Background Image/Position/Size/Repeat/Attachment controls instead) but
// Section's own component now reads them through var(--exr-key, …) (see
// blockComponents.tsx), so unlike background/backgroundBlur/the overlay
// cluster they're safe to treat as normal per-breakpoint fields instead of
// forcing every edit to node.props regardless of the active breakpoint —
// that was the actual bug behind "editing Background Image in Mobile View
// edits the desktop background instead of a mobile-only override".
const SECTION_RESPONSIVE_BG_KEYS = new Set(["backgroundImage", "backgroundPosition", "backgroundAttachment", "backgroundRepeat", "backgroundSize"]);
const SECTION_ALWAYS_PROPS_KEYS = new Set([...SECTION_OWN_STYLE_KEYS].filter((k) => !SECTION_RESPONSIVE_BG_KEYS.has(k)));

const BLOCK_OWN_STYLE_KEYS: Record<string, Set<string>> = {
  Section: SECTION_ALWAYS_PROPS_KEYS,
  GoogleMaps: GOOGLE_MAPS_OWN_STYLE_KEYS,
  DefinitionRows: DEFINITION_ROWS_OWN_STYLE_KEYS,
};

// Style-tab fields rendered with the visual color-picker swatch instead of a
// plain text input — see ColorField.
// IconAccordion's Question/Answer typography renders via the dedicated
// TypographyField sections shared with Faq/AccordionItem further down (see
// typographyBinding("question")/("answer")); everything else here (icon,
// divider, item box) is new and would otherwise dump into one flat
// undifferentiated list.
const ICON_ACCORDION_GROUP_HEADERS: Record<string, string> = {
  iconColor: "Icon",
  dividerColor: "Divider",
  itemBackground: "Item",
};

/** Display labels for SOCIAL_LINK_PLATFORM_VALUES — used by both the "Social
 *  Icons" and "Team Member" blocks' social-link repeaters. */
const SOCIAL_LINK_PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter / X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  pinterest: "Pinterest",
  website: "Website",
  custom: "Custom",
};

const COLOR_FIELD_KEYS = new Set([
  "background",
  "color",
  "borderColor",
  // Button-parity pass — hover/border colors for cta*/showMore*/
  // primaryCta*/secondaryCta*/bookNow*/readMore*/viewMore* button families.
  "ctaBorderColor",
  "showMoreHoverColor",
  "showMoreHoverBorderColor",
  "showMoreBorderColor",
  "primaryCtaHoverBackground",
  "primaryCtaHoverColor",
  "primaryCtaBorderColor",
  "secondaryCtaBackground",
  "secondaryCtaHoverBackground",
  "secondaryCtaHoverColor",
  "bookNowHoverColor",
  "bookNowBorderColor",
  "readMoreHoverBorderColor",
  "viewMoreColor",
  "viewMoreHoverColor",
  "viewMoreBackground",
  "viewMoreHoverBackground",
  "viewMoreBorderColor",
  "viewMoreHoverBorderColor",
  "nameColor",
  "quoteColor",
  "starColor",
  "platformBackground",
  "platformHoverBackground",
  "platformBorderColor",
  "platformHoverBorderColor",
  "platformStarColor",
  "platformNameColor",
  "viewReviewsColor",
  "secondaryColor",
  "hoverBackground",
  "hoverColor",
  "hoverBorderColor",
  "hoverSecondaryColor",
  "textStrokeColor",
  "captionColor",
  "captionBackground",
  "linkColor",
  "slideBackground",
  "arrowColor",
  "arrowBackground",
  "dotColor",
  "dotActiveColor",
  "titleColor",
  "titleHoverColor",
  "titleTextStrokeColor",
  "descColor",
  "overlayColor",
  "scrollbarTrackColor",
  "scrollbarThumbColor",
  "scrollbarThumbHoverColor",
  "readMoreBackground",
  "readMoreHoverBackground",
  "readMoreColor",
  "readMoreHoverColor",
  "readMoreBorderColor",
  "labelColor",
  "htmlFieldColor",
  "fieldColor",
  "fieldBackground",
  "fieldBorderColor",
  "buttonBorderColor",
  "buttonBackground",
  "buttonHoverBackground",
  "buttonColor",
  "buttonHoverColor",
  "successMessageColor",
  "errorMessageColor",
  "menuTextColor",
  "menuHoverTextColor",
  "menuActiveTextColor",
  "menuBackground",
  "menuHoverBackground",
  "menuActiveBackground",
  "triggerColor",
  "triggerHoverColor",
  "triggerBackground",
  "triggerHoverBackground",
  "flyoutBackground",
  "mobileMenuBackground",
  "sectionBackground",
  "eyebrowColor",
  "headingColor",
  "accentColor",
  "lineColor",
  "dotBorderColor",
  "textBoxBackground",
  "tableHeaderBackground",
  "tableHeaderColor",
  "tableRowColor",
  "tableRowDividerColor",
  "priceColor",
  "cardTitleColor",
  "cardDescColor",
  "subLabelColor",
  "badgeBgColor",
  "badgeTextColor",
  "activeCardBorderColor",
  "showMoreBackground",
  "showMoreColor",
  "showMoreHoverBackground",
  "questionActiveColor",
  "iconActiveColor",
  "dividerColor",
  "itemBackground",
  "itemBorderColor",
  "dropdownTextColor",
  "dropdownHoverTextColor",
  "dropdownBackground",
  "dropdownHoverBackground",
  "dropdownBorderColor",
  "cardBackground",
  "cardBorderColor",
  "featuredBorderColor",
  "featuredBackground",
  "badgeBackground",
  "badgeHoverBackground",
  "badgeColor",
  "badgeBorderColor",
  "badgeCheckColor",
  "ctaColor",
  "featuresColor",
  "featuresMarkerColor",
  "footerBorderColor",
  "readMoreColor",
  "bookNowBackground",
  "bookNowColor",
  "bookNowHoverBackground",
  "bookNowHoverBorderColor",
  "cardHoverBackground",
  "cardHoverBorderColor",
  "ctaHoverBorderColor",
  "activeBackground",
  "activeColor",
  "inactiveColor",
  "pillBackground",
  "pillColor",
  "buttonHoverBorderColor",
  "tabColor",
  "tabHoverColor",
  "tabActiveColor",
  "tabBackground",
  "tabHoverBackground",
  "tabActiveBackground",
  "tabBorderColor",
  "tabActiveBorderColor",
  "contentColor",
  "contentBackground",
  "contentLinkColor",
  "containerBackground",
  "questionColor",
  "questionHoverColor",
  "answerColor",
  "chevronColor",
  "columnsBackground",
  "columnsHoverBackground",
  "columnsBorderColor",
  "columnsHoverBorderColor",
  "valueColor",
  "counterBackground",
  "counterBorderColor",
  "ratingColor",
  "ratingInactiveColor",
  "iconColor",
  "iconHoverColor",
  "iconBackground",
  "iconHoverBackground",
  "iconBorderColor",
  "iconHoverBorderColor",
  // Batch 2 — Interactive/Button Chrome
  "ctaBackground",
  "ctaHoverBackground",
  "ctaHoverColor",
  "backButtonBackground",
  "backButtonColor",
  "backButtonHoverBackground",
  "backButtonHoverColor",
  "arrowHoverColor",
  "arrowHoverBackground",
  "dotHoverColor",
  "triggerBorderColor",
  "modalBorderColor",
  // ItineraryRoadmap
  "subtitleColor",
  "timeColor",
  "headingColor",
  "roadColor",
  "dashColor",
  "glowColor",
  // TourInfoSection
  "descriptionColor",
  "factLabelColor",
  "factValueColor",
  "primaryCtaBackground",
  "primaryCtaColor",
  "primaryCtaHoverBackground",
  "primaryCtaHoverColor",
  "secondaryCtaBorderColor",
  "secondaryCtaColor",
  "secondaryCtaHoverBackground",
  "secondaryCtaHoverColor",
  // Checklist
  "itemColor",
  "containerBorderColor",
]);

// Layout-tab fields that get a per-breakpoint override: at Tablet/Mobile
// these redirect to node.style.tablet/mobile instead of the block's own
// prop — "stack this row on mobile" is the single most common responsive
// request there is. These are all generic box-model/flex fields that paint
// directly on the block's own wrapper, so (unlike Style-tab fields — see
// `binding` below) they're a small fixed set, not derived from STYLE_KEYS.
const RESPONSIVE_LAYOUT_KEYS = new Set(["direction", "justifyContent", "alignItems", "gap", "width", "minHeight", "contentWidth"]);

// Whether `key` has an actual per-breakpoint CSS delivery mechanism at all
// (a box-model field applied directly, a Style-tab field var-bridged via
// `--exr-{key}`, or one of the hand-translated RESPONSIVE_LAYOUT_KEYS extras
// in resolveNodeStyle's fieldsToDeclarations). Everything else — content
// fields (text/links/icons/selects) and structure-only Layout fields like
// layoutMode/columnCount/ratio with no CSS translation — has nowhere to go
// at Tablet/Mobile, so `binding()` below keeps those bound to `node.props`
// regardless of which breakpoint tab is active instead of redirecting them
// into the style override bag, where the edit would silently do nothing.
const isResponsiveField = (key: string) =>
  BOX_MODEL_KEYS.has(key) || RESPONSIVE_LAYOUT_KEYS.has(key) || (STYLE_KEYS.has(key) && !STRUCTURAL_STYLE_KEYS.has(key));

export type Tab = "content" | "layout" | "style" | "interactions" | "advanced" | "animation";
export const TAB_LABELS: Record<Tab, string> = {
  content: "Settings",
  layout: "Layout",
  style: "Style",
  interactions: "Interactions",
  advanced: "Advanced",
  animation: "Animation",
};

export const TAB_ICONS: Record<Tab, React.ReactNode> = {
  content: <Box className="h-3.5 w-3.5 shrink-0" />,
  layout: <LayoutGrid className="h-3.5 w-3.5 shrink-0" />,
  style: <Sliders className="h-3.5 w-3.5 shrink-0" />,
  interactions: <Sparkles className="h-3.5 w-3.5 shrink-0" />,
  advanced: <Code className="h-3.5 w-3.5 shrink-0" />,
  animation: <Layers className="h-3.5 w-3.5 shrink-0" />,
};

export interface InspectorTabHeaderProps {
  availableTabs: Tab[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function InspectorTabHeader({ availableTabs, activeTab, onTabChange }: InspectorTabHeaderProps) {
  if (availableTabs.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/90 p-1.5">
      {availableTabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onTabChange(t)}
          className={`flex flex-1 min-w-[105px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
            activeTab === t
              ? "bg-[#ffb700] text-black shadow-sm"
              : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
          }`}
        >
          {TAB_ICONS[t]}
          <span className="whitespace-nowrap">{TAB_LABELS[t]}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Hover Animation Engine — renders when the :hover pseudo-state is active.
 * Provides preset animation picker plus transition timing controls, and
 * individual hover style overrides that write directly to LayoutNodeStyle.hover
 * and the hoverTransition* / hoverAnimation top-level fields.
 */
function WebflowHoverAnimationsSection({
  styleSource,
  onCommit,
}: {
  styleSource: LayoutNodeStyle | undefined;
  onCommit: (patch: LayoutNodeStyle) => void;
}) {
  const hoverStyle = styleSource?.hover ?? {};
  const hoverAnimation = styleSource?.hoverAnimation ?? "none";
  const hoverDuration = styleSource?.hoverTransitionDuration ?? "300ms";
  const hoverEasing = styleSource?.hoverTransitionEasing ?? "ease";
  const hoverDelay = styleSource?.hoverTransitionDelay ?? "0s";

  function patchHover(patch: StyleOverrideBag) {
    onCommit({ hover: { ...hoverStyle, ...patch } });
  }

  function parseDurationMs(v: string): number {
    if (!v) return 300;
    const ms = v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000;
    return isNaN(ms) ? 300 : ms;
  }

  function parseDelayMs(v: string): number {
    if (!v) return 0;
    const ms = v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000;
    return isNaN(ms) ? 0 : ms;
  }

  const EASING_OPTIONS = [
    { label: "Ease", value: "ease" },
    { label: "Linear", value: "linear" },
    { label: "Ease In", value: "ease-in" },
    { label: "Ease Out", value: "ease-out" },
    { label: "Ease In Out", value: "ease-in-out" },
    { label: "Smooth Spring", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
    { label: "Bounce Elastic", value: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
    { label: "Back Out", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  ];

  return (
    <AccordionSection title="Hover Effects & Transitions" icon={Sparkles}>
      <div className="flex flex-col gap-4">

          {/* Preset Selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Animation Preset
            </label>
            <select
              value={hoverAnimation}
              onChange={(e) => onCommit({ hoverAnimation: e.target.value as HoverAnimation })}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none [&>option]:bg-zinc-900 [&>option]:text-zinc-100"
            >
              <option value="none" className="bg-zinc-900 text-zinc-100">None (Custom Hover Only)</option>
              <optgroup label="Motion &amp; Bounce">
                <option value="grow" className="bg-zinc-900 text-zinc-100">Grow (Scale Up)</option>
                <option value="shrink" className="bg-zinc-900 text-zinc-100">Shrink (Scale Down)</option>
                <option value="pulse" className="bg-zinc-900 text-zinc-100">Pulse</option>
                <option value="bounce-up" className="bg-zinc-900 text-zinc-100">Bounce Up</option>
                <option value="bounce-down" className="bg-zinc-900 text-zinc-100">Bounce Down</option>
                <option value="shake-wobble" className="bg-zinc-900 text-zinc-100">Shake / Wobble</option>
                <option value="rotate-3d" className="bg-zinc-900 text-zinc-100">3D Rotation</option>
              </optgroup>
              <optgroup label="Shimmer &amp; Fill Sweeps">
                <option value="shimmer-sweep" className="bg-zinc-900 text-zinc-100">Shimmer Light Sweep</option>
                <option value="slide-fill" className="bg-zinc-900 text-zinc-100">Slide Fill (Diagonal)</option>
                <option value="fill-sweep-left" className="bg-zinc-900 text-zinc-100">Fill Sweep Left</option>
                <option value="fill-sweep-right" className="bg-zinc-900 text-zinc-100">Fill Sweep Right</option>
                <option value="fill-sweep-top" className="bg-zinc-900 text-zinc-100">Fill Sweep Top</option>
                <option value="fill-sweep-bottom" className="bg-zinc-900 text-zinc-100">Fill Sweep Bottom</option>
                <option value="underline-sweep" className="bg-zinc-900 text-zinc-100">Underline Sweep</option>
                <option value="liquid-fill" className="bg-zinc-900 text-zinc-100">Liquid Fill</option>
              </optgroup>
              <optgroup label="Image &amp; Filter FX">
                <option value="zoom-in" className="bg-zinc-900 text-zinc-100">Zoom In</option>
                <option value="zoom-out" className="bg-zinc-900 text-zinc-100">Zoom Out</option>
                <option value="grayscale-to-color" className="bg-zinc-900 text-zinc-100">Grayscale to Color</option>
                <option value="blur-to-sharp" className="bg-zinc-900 text-zinc-100">Blur to Sharp</option>
                <option value="invert-colors" className="bg-zinc-900 text-zinc-100">Invert Colors</option>
              </optgroup>
              <optgroup label="Borders &amp; Glow">
                <option value="glow-border" className="bg-zinc-900 text-zinc-100">Glow Border</option>
                <option value="corner-brackets" className="bg-zinc-900 text-zinc-100">Corner Brackets</option>
              </optgroup>
            </select>
          </div>

          {/* Transition Controls */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Transition
            </label>
            <div className="flex flex-wrap gap-2">
              {/* Duration */}
              <div className="flex flex-1 min-w-[90px] flex-col gap-1">
                <span className="text-[10px] text-zinc-500">Duration</span>
                <div className="flex min-w-0 items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    max={3000}
                    step={50}
                    value={parseDurationMs(hoverDuration)}
                    onChange={(e) => onCommit({ hoverTransitionDuration: `${e.target.value}ms` })}
                    className="w-full min-w-0 bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-zinc-500 shrink-0">ms</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2000}
                  step={50}
                  value={parseDurationMs(hoverDuration)}
                  onChange={(e) => onCommit({ hoverTransitionDuration: `${e.target.value}ms` })}
                  className="w-full min-w-0 accent-amber-400 bg-zinc-800 h-0.5 rounded-lg cursor-pointer"
                />
              </div>
              {/* Delay */}
              <div className="flex flex-1 min-w-[90px] flex-col gap-1">
                <span className="text-[10px] text-zinc-500">Delay</span>
                <div className="flex min-w-0 items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    max={2000}
                    step={50}
                    value={parseDelayMs(hoverDelay)}
                    onChange={(e) => onCommit({ hoverTransitionDelay: `${e.target.value}ms` })}
                    className="w-full min-w-0 bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-zinc-500 shrink-0">ms</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={50}
                  value={parseDelayMs(hoverDelay)}
                  onChange={(e) => onCommit({ hoverTransitionDelay: `${e.target.value}ms` })}
                  className="w-full min-w-0 accent-amber-400 bg-zinc-800 h-0.5 rounded-lg cursor-pointer"
                />
              </div>
              {/* Easing */}
              <div className="flex flex-1 min-w-[90px] flex-col gap-1">
                <span className="text-[10px] text-zinc-500">Easing</span>
                <select
                  value={hoverEasing}
                  onChange={(e) => onCommit({ hoverTransitionEasing: e.target.value })}
                  className="w-full min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-1.5 py-1 text-[10px] text-zinc-100 focus:border-amber-400 focus:outline-none [&>option]:bg-zinc-900 [&>option]:text-zinc-100"
                >
                  {EASING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-zinc-900 text-zinc-100">{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Hover Style Overrides */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Hover Style Overrides
            </label>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <span className="text-[11px] text-zinc-400">Text Color</span>
                <ColorField label="" value={String(hoverStyle.color ?? "")} onChange={(v) => patchHover({ color: v })} />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <span className="text-[11px] text-zinc-400">Background</span>
                <ColorField
                  label=""
                  value={String(hoverStyle.backgroundColor ?? hoverStyle.background ?? "")}
                  onChange={(v) => patchHover({ backgroundColor: v, background: v })}
                />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <span className="text-[11px] text-zinc-400">Opacity</span>
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    type="range" min={0} max={100} step={1}
                    value={parseFloat(String(hoverStyle.opacity ?? "100"))}
                    onChange={(e) => patchHover({ opacity: e.target.value })}
                    className="flex-1 min-w-0 accent-amber-400 bg-zinc-800 h-0.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex shrink-0 items-center rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5">
                    <input
                      type="text"
                      value={String(hoverStyle.opacity ?? "100")}
                      onChange={(e) => patchHover({ opacity: e.target.value })}
                      className="w-8 bg-transparent text-xs text-zinc-100 text-center font-mono focus:outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-500">%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <span className="text-[11px] text-zinc-400">Border Color</span>
                <ColorField label="" value={String(hoverStyle.borderColor ?? "")} onChange={(v) => patchHover({ borderColor: v })} />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <span className="text-[11px] text-zinc-400">Border Radius</span>
                <input
                  type="text" placeholder="e.g. 12px or 50%"
                  value={String(hoverStyle.borderRadius ?? "")}
                  onChange={(e) => patchHover({ borderRadius: e.target.value })}
                  className="w-full min-w-0 truncate rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <span className="text-[11px] text-zinc-400">Box Shadow</span>
                <input
                  type="text" placeholder="0 8px 32px rgba(0,0,0,0.4)"
                  value={String(hoverStyle.boxShadow ?? "")}
                  onChange={(e) => patchHover({ boxShadow: e.target.value })}
                  className="w-full min-w-0 truncate rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <span className="text-[11px] text-zinc-400">Transform</span>
                <input
                  type="text" placeholder="scale(1.05) translateY(-4px)"
                  value={String(hoverStyle.transform ?? "")}
                  onChange={(e) => patchHover({ transform: e.target.value })}
                  className="w-full min-w-0 truncate rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <span className="text-[11px] text-zinc-400">Filter</span>
                <input
                  type="text" placeholder="brightness(1.2) saturate(1.3)"
                  value={String(hoverStyle.filter ?? "")}
                  onChange={(e) => patchHover({ filter: e.target.value })}
                  className="w-full min-w-0 truncate rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {(Object.keys(hoverStyle).length > 0 || hoverAnimation !== "none") && (
            <button
              type="button"
              onClick={() => onCommit({ hover: {}, hoverAnimation: "none", hoverTransitionDuration: undefined, hoverTransitionEasing: undefined, hoverTransitionDelay: undefined })}
              className="self-start rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20"
            >
              Clear All Hover Styles
            </button>
          )}

      </div>
    </AccordionSection>
  );
}

export function PropertyPanel({
  node,
  breakpoint = "desktop",
  onBreakpointChange,
  onChangeProps,
  onChangeStyle,
  onChangeClassIds,
  onChangeAnimations,
  onOpenTimelineDrawer,
}: {
  node: LayoutNode | null;
  breakpoint?: Breakpoint;
  onBreakpointChange?: (bp: Breakpoint) => void;
  onChangeProps: (props: Record<string, unknown>) => void;
  onChangeStyle: (style: LayoutNodeStyle) => void;
  onChangeClassIds?: (classIds: string[]) => void;
  onChangeAnimations: (timelines: BlockTimeline[]) => void;
  onOpenTimelineDrawer?: (nodeId: string) => void;
}) {
  const setBreakpoint = (bp: Breakpoint) => {
    onBreakpointChange?.(bp);
  };
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  // "normal" behaves exactly like the pre-Phase-2 desktop/tablet/mobile
  // bags above; the other three route through the single (non-breakpoint-
  // scoped) pseudo-state bags — see LayoutNodeStyle.hover's own comment for
  // why pseudo-state and breakpoint aren't combined.
  const [pseudoState, setPseudoState] = useState<PseudoState>("normal");
  // deleteClass/renameClass: useStyleClasses() already supports both (real,
  // API-backed), but there's no rename/delete UI wired to them yet in this
  // panel — only createClass (via SelectorStateHeader's "+ Create") and
  // updateClassStyle (editing a class's own style) are hooked up so far.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { classes: styleClasses, createClass, deleteClass, updateClassStyle, renameClass } = useStyleClasses();
  const [activeSelectorId, setActiveSelectorId] = useState<string | null>(null);

  if (!node) {
    return <p className="text-sm text-zinc-500">Select a block to edit its properties.</p>;
  }

  // The class actively being edited (null = editing the element itself,
  // the default and only option before Phase 2). Reset back to the element
  // whenever the selected NODE changes so switching blocks on the canvas
  // never leaves the panel silently still pointed at some other node's
  // class — attaching/detaching classIds happens per-node, but which class
  // is "active for editing" is panel-local UI state, not persisted data.
  const attachedClassIds = node.classIds ?? [];
  const activeClass = activeSelectorId ? (styleClasses.find((c) => c.id === activeSelectorId) ?? null) : null;
  // Non-attached activeSelectorId (e.g. the node changed, or the class was
  // just detached) silently falls back to editing the element — matches
  // `activeClass` being null in that case rather than throwing.
  const styleSource: LayoutNodeStyle | undefined = activeClass ? activeClass.style : node.style;

  function commitStyle(patch: LayoutNodeStyle) {
    if (activeClass) {
      updateClassStyle(activeClass.id, { ...(activeClass.style ?? {}), ...patch });
    } else {
      onChangeStyle(patch);
    }
  }

  const definition = getBlockDefinition(node.type);
  if (!definition) {
    return <p className="text-sm text-red-400">Unknown block type &quot;{node.type}&quot;.</p>;
  }

  const fields = describePropsSchema(definition.propsSchema);
  const styleFields = fields.filter((f) => STYLE_KEYS.has(f.key));
  const contentFields = fields.filter((f) => !LAYOUT_KEYS.has(f.key) && !STYLE_KEYS.has(f.key) && !ADVANCED_PROP_KEYS.has(f.key));

  const availableTabs: Tab[] = [
    // "content" (labeled "Settings") is always available — Phase 4 adds
    // ID/Visibility/Custom Attributes here unconditionally, on top of
    // whatever per-block content fields this block declares (if any).
    "content",
    // "style" now consolidates the old Layout tab plus the old Advanced
    // tab's Spacing/Position/Size accordions (Phase 2c) — always available
    // regardless of styleFields.length, matching the old Advanced tab's own
    // universality (every block gets margin/padding/position/etc, not just
    // ones that also declare block-specific STYLE_KEYS props).
    "style",
    "interactions",
    "advanced",
    "animation",
  ];
  const tab = activeTab && availableTabs.includes(activeTab) ? activeTab : availableTabs[0];

  const activeStyle: ResponsiveStyleFields = breakpoint === "desktop" ? (styleSource ?? {}) : (styleSource?.[breakpoint] ?? {});

  function patchStyle(patch: ResponsiveStyleFields) {
    if (breakpoint === "desktop") {
      commitStyle(patch);
    } else {
      commitStyle({ [breakpoint]: { ...(styleSource?.[breakpoint] ?? {}), ...patch } });
    }
  }

  interface PropertyBinding {
    value: unknown;
    onChange: (value: unknown) => void;
    isOverridden: boolean;
    inheritedFrom?: "desktop" | "tablet";
    onReset?: () => void;
  }

  function binding(key: string): PropertyBinding {
    // A LAYOUT_KEYS field is always read from props (see the matching
    // onChange logic below) — a node saved before that write-side fix
    // existed can still have a stale, never-applied value sitting in
    // node.style under the same name (e.g. a Section with props.direction
    // "row" that actually renders in a row, but style.direction leftover as
    // "row-reverse" from a click that never took effect) which must NOT be
    // shown as if it were live. For every other field, a style key can be
    // present with an empty-string value (e.g. a Section whose Width was
    // never touched still has a stray `style.width: ""` left over from an
    // old save) — `key in node.style` is true either way, so without this
    // check the panel displayed that blank instead of falling through to
    // the block's own props default, showing e.g. "0" for a field that's
    // actually driven by (and rendering correctly from) props.
    // BLOCK_OWN_STYLE_KEYS (Section's background/border/shadow,
    // GoogleMaps' height/grayscale/borderRadius, more added there as found)
    // is the exact same collision class as LAYOUT_KEYS below — each of
    // those blocks' own component reads these names straight from its own
    // props (see blockComponents.tsx), so routing an edit into node.style
    // (what BOX_MODEL_KEYS normally means for those exact names) lands in a
    // bucket the component either never reads at all, or only reads as a
    // lower-priority fallback that a truthy prop value already permanently
    // wins against. Scoped per node.type: these are legitimate wrapper-level
    // fields for every other block that doesn't declare its own same-named
    // prop.
    const isBlockOwnStyle = Boolean(BLOCK_OWN_STYLE_KEYS[node!.type]?.has(key));
    const routeToProps = LAYOUT_KEYS.has(key) || isBlockOwnStyle;

    // Content/prop-routed fields always stay on the node itself — a class
    // never carries labels/hrefs/etc, only CSS — so `owner` only switches to
    // the active class for the style-routed branch below.
    const owner: LayoutNodeStyle | undefined = !routeToProps && activeClass ? activeClass.style : node!.style;
    const commit = (patch: LayoutNodeStyle) => (!routeToProps && activeClass ? updateClassStyle(activeClass.id, { ...(activeClass.style ?? {}), ...patch }) : onChangeStyle(patch));

    const styleValue = !routeToProps && owner ? (owner as Record<string, unknown>)[key] : undefined;
    // For most fields an empty-string style value is indistinguishable from
    // a stray leftover blank (see the long comment above `binding` for why
    // that fallback exists at all) — but for an image-URL field, "" IS the
    // deliberate "removed" state written by ImagePicker's Remove button.
    // Falling back to node.props[key] here made Remove look like a no-op:
    // the style write succeeded, but this read immediately resurrected the
    // old prop value instead of showing the field as cleared.
    const isImageUrlKey = key === "backgroundImage" || key === "backgroundOverlayImage";
    const desktopValue = styleValue !== undefined && (isImageUrlKey || styleValue !== "") ? styleValue : node!.props[key];

    if (breakpoint === "desktop" || isBlockOwnStyle || !isResponsiveField(key)) {
      return {
        value: desktopValue,
        isOverridden: false,
        onChange: (v) => {
          // BOX_MODEL_KEYS is the generic "paint this on the wrapper" set,
          // consumed from node.style by resolveNodeStyle. But several of
          // those exact names — direction/justifyContent/alignItems/gap/
          // width — are ALSO declared as Section's/Columns' own props (see
          // LAYOUT_KEYS), and those components read direction/justifyContent
          // /alignItems/gap/width/etc straight from props unconditionally,
          // completely overwriting whatever the generic wrapper style would
          // have contributed — same collision class already documented for
          // CTAButton's own paddingTop (see BOX_MODEL_KEYS's comment in
          // styleKeys.ts). Concretely: writing "direction" into node.style
          // updated the panel's own display (which reads back node.style)
          // but never reached the prop Section's render actually uses, so
          // clicking Row/Column visibly changed the panel's highlighted
          // button while the canvas never moved. LAYOUT_KEYS fields (and
          // Section's own background cluster, see isSectionOwnBg above)
          // always win regardless of BOX_MODEL_KEYS overlap — they go to
          // props.
          if (BOX_MODEL_KEYS.has(key) && !routeToProps) {
            commit({ [key]: v } as LayoutNodeStyle);
          } else {
            onChangeProps({ [key]: v });
          }
        },
      };
    }

    const currentOverrides = ((owner?.[breakpoint] ?? {}) as Record<string, unknown>);
    const isOverridden = key in currentOverrides;

    let displayValue: unknown = currentOverrides[key];
    let inheritedFrom: "desktop" | "tablet" | undefined = undefined;

    if (!isOverridden) {
      if (breakpoint === "mobile" && owner?.tablet && key in owner.tablet) {
        displayValue = owner.tablet[key];
        inheritedFrom = "tablet";
      } else {
        displayValue = desktopValue;
        inheritedFrom = "desktop";
      }
    }

    return {
      value: displayValue,
      isOverridden,
      inheritedFrom,
      onReset: isOverridden
        ? () => {
            const next = { ...currentOverrides };
            delete next[key];
            commit({ [breakpoint]: next });
          }
        : undefined,
      onChange: (v) => {
        commit({
          [breakpoint]: {
            ...currentOverrides,
            [key]: v,
          },
        });
      },
    };
  }

  function typographyBinding(prefix: string) {
    const keyFor = (k: string) => (prefix ? `${prefix}${k.charAt(0).toUpperCase()}${k.slice(1)}` : k);
    const keys = ["fontFamily", "fontSize", "fontWeight", "textTransform", "fontStyle", "textDecoration", "lineHeight", "letterSpacing", "wordSpacing"] as const;
    
    const values: Record<string, string> = {};
    const isOverriddenMap: Record<string, boolean> = {};
    const inheritedFromMap: Record<string, "desktop" | "tablet"> = {};

    for (const k of keys) {
      const b = binding(keyFor(k));
      values[k] = typeof b.value === "string" ? b.value : "";
      isOverriddenMap[k] = b.isOverridden;
      if (b.inheritedFrom) inheritedFromMap[k] = b.inheritedFrom;
    }

    return {
      values,
      isOverriddenMap,
      inheritedFromMap,
      onResetKey: (key: string) => binding(keyFor(key)).onReset?.(),
      onChange: (key: string, value: unknown) => binding(keyFor(key)).onChange(value),
    };
  }

  return (
    <div className="flex flex-col gap-3 font-sans text-xs">
      <div className="border-b border-zinc-800/80 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Box className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight text-zinc-100">{definition.label}</span>
              <span className="ml-2 rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
                #{node.id.slice(0, 6)}
              </span>
            </div>
          </div>
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950/80 p-0.5" title="Applies across Content, Layout, Style and Advanced">
            {BREAKPOINTS.map((bp) => (
              <button
                key={bp.value}
                type="button"
                onClick={() => setBreakpoint(bp.value)}
                title={bp.label}
                className={`flex items-center justify-center rounded-md px-2 py-1 transition-all ${
                  breakpoint === bp.value ? "bg-amber-400 text-white font-semibold shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <BreakpointIcon value={bp.value} />
              </button>
            ))}
          </div>
        </div>
        {breakpoint !== "desktop" && (
          <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] text-amber-300">
            Editing {BREAKPOINTS.find((b) => b.value === breakpoint)?.label} overrides across every tab — unset fields fall back to Desktop.
          </p>
        )}
        {definition.singleton && (
          <p className="mt-1.5 text-[11px] text-zinc-500">
            This section&apos;s content is managed on its own settings page — it can be inserted, reordered, and removed here, but not given independent content per instance yet.
          </p>
        )}
      </div>

      <InspectorTabHeader availableTabs={availableTabs} activeTab={tab} onTabChange={setActiveTab} />

      {tab === "content" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">ID (for in-page linking)</label>
            <StyleField label="" value={node.style?.htmlId} onChange={(v) => onChangeStyle({ htmlId: v })} />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">Visibility</label>
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onChangeStyle({ hideOnDesktop: false, hideOnTablet: false, hideOnMobile: false })}
                className={`flex-1 rounded py-1 font-medium ${!node.style?.hideOnDesktop && !node.style?.hideOnTablet && !node.style?.hideOnMobile ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}
              >
                Visible
              </button>
              <button
                type="button"
                onClick={() => onChangeStyle({ hideOnDesktop: true, hideOnTablet: true, hideOnMobile: true })}
                className={`flex-1 rounded py-1 font-medium ${node.style?.hideOnDesktop && node.style?.hideOnTablet && node.style?.hideOnMobile ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}
              >
                Hidden
              </button>
            </div>
            <p className="mt-1 text-[10px] text-zinc-600">Per-breakpoint hiding is still available in the Style tab&apos;s Layout section.</p>
          </div>

          {contentFields.length > 0 && (
            <div className="border-t border-zinc-800/80 pt-3 flex flex-col gap-3">
          {node.type === "CarouselContainer" && node.props.transition === "fade" && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
              Items Desktop/Tablet/Mobile are ignored while Transition is set to <strong>Fade</strong> — a crossfade
              always shows one slide at a time. Switch Transition to <strong>Slide</strong> below to show multiple
              items per view.
            </p>
          )}
          {node.type === "TextUnfold" && node.props.expandMode === "scroll" && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
              Read More/Read Less Text and Include Icon are ignored in <strong>Scroll</strong> mode — the content area
              just becomes scrollable at Container Height instead of showing a button.
            </p>
          )}
          {node.type === "Testimonials" && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
              The rotating customer name, quote, and star rating shown above the platform cards come from the{" "}
              <Link href="/reviews" target="_blank" className="underline hover:text-amber-200">
                Reviews
              </Link>{" "}
              page — add, edit, or reorder them there. The Google/Trustpilot/Tripadvisor cards below are edited right
              here as &quot;Review Platforms&quot;.
            </p>
          )}
          {contentFields.map((field) =>
            // Legacy fixed facebookUrl/instagramUrl/twitterUrl/youtubeUrl —
            // superseded by the "socials" repeater below. Kept in the schema
            // (not removed) purely so a page saved before this existed still
            // parses and its icons still render (see SocialIcons's fallback
            // in blockComponents.tsx) — just never shown as its own field
            // here anymore, so editing a pre-existing instance doesn't leave
            // two competing, confusing ways to set the same 4 platforms.
            node.type === "SocialIcons" &&
            (field.key === "facebookUrl" || field.key === "instagramUrl" || field.key === "twitterUrl" || field.key === "youtubeUrl") ? null : node.type === "SocialIcons" && field.key === "socials" ? (
              <SimpleRepeaterEditor<SocialLink>
                key={field.key}
                value={Array.isArray(node.props.socials) ? (node.props.socials as SocialLink[]) : []}
                onChange={(socials) => onChangeProps({ socials })}
                addLabel="+ Add social link"
                itemLabel={(item) => SOCIAL_LINK_PLATFORM_LABELS[item.platform] ?? item.platform ?? "Social link"}
                defaultItem={{ platform: "facebook", url: "" }}
                fields={[
                  { key: "platform", label: "Platform", type: "select", options: SOCIAL_LINK_PLATFORM_VALUES },
                  { key: "url", label: "URL", type: "text", placeholder: "https://..." },
                  { key: "customIcon", label: "Custom Icon (SVG markup — only used when Platform is Custom)", type: "textarea", placeholder: '<svg viewBox="0 0 24 24">...</svg>' },
                ]}
              />
            ) : (node.type === "Icon" || node.type === "IconBox" || node.type === "GlowingCard" || node.type === "InfoBox" || node.type === "Divider" || node.type === "CTAButton") &&
            field.key === "icon" ? (
              <IconLibraryPicker
                key={field.key}
                value={typeof node.props.icon === "string" ? node.props.icon : "FaStar"}
                onChange={(v) => onChangeProps({ icon: v })}
              />
            ) : node.type === "FlipBox" && field.key === "frontIcon" ? (
              <IconLibraryPicker key={field.key} value={typeof node.props.frontIcon === "string" ? node.props.frontIcon : "FaStar"} onChange={(v) => onChangeProps({ frontIcon: v })} />
            ) : node.type === "MarketingButton" && field.key === "icon" ? (
              <IconLibraryPicker key={field.key} value={typeof node.props.icon === "string" ? node.props.icon : "FaStar"} onChange={(v) => onChangeProps({ icon: v })} />
            ) : (node.type === "ModalPopup" || node.type === "OffCanvas") && field.key === "triggerIcon" ? (
              <IconLibraryPicker key={field.key} value={typeof node.props.triggerIcon === "string" ? node.props.triggerIcon : ""} onChange={(v) => onChangeProps({ triggerIcon: v })} />
            ) : node.type === "IconAccordion" && field.key === "iconOpen" ? (
              <IconLibraryPicker key={field.key} value={typeof node.props.iconOpen === "string" ? node.props.iconOpen : "FaMinus"} onChange={(v) => onChangeProps({ iconOpen: v })} />
            ) : node.type === "IconAccordion" && field.key === "iconClosed" ? (
              <IconLibraryPicker key={field.key} value={typeof node.props.iconClosed === "string" ? node.props.iconClosed : "FaPlus"} onChange={(v) => onChangeProps({ iconClosed: v })} />
            ) : node.type === "Slider" && field.key === "slides" ? (
              <SlidesEditor
                key={field.key}
                value={Array.isArray(node.props.slides) ? (node.props.slides as SliderSlide[]) : []}
                onChange={(slides) => onChangeProps({ slides })}
              />
            ) : node.type === "Form" && field.key === "fields" ? (
              <FieldsEditor
                key={field.key}
                value={Array.isArray(node.props.fields) ? (node.props.fields as FormFieldDef[]) : []}
                onChange={(fields) => onChangeProps({ fields })}
              />
            ) : node.type === "ServiceCard" && field.key === "features" ? (
              <StringListEditor
                key={field.key}
                label="Features"
                value={Array.isArray(node.props.features) ? (node.props.features as string[]) : []}
                onChange={(features) => onChangeProps({ features })}
                placeholder="e.g. Live Flight Tracking"
              />
            ) : node.type === "MarqueeStrip" && field.key === "items" ? (
              <StringListEditor
                key={field.key}
                label="Ticker Items"
                value={Array.isArray(node.props.items) ? (node.props.items as string[]) : []}
                onChange={(items) => onChangeProps({ items })}
                placeholder="e.g. Airport Transfer"
              />
            ) : node.type === "FancyHeading" && field.key === "words" ? (
              <StringListEditor
                key={field.key}
                label="Rotating Words"
                value={Array.isArray(node.props.words) ? (node.props.words as string[]) : []}
                onChange={(words) => onChangeProps({ words })}
                placeholder="e.g. Airport Transfers"
              />
            ) : node.type === "TrustHighlights" && field.key === "badges" ? (
              <StringListEditor
                key={field.key}
                label="Badges"
                value={Array.isArray(node.props.badges) ? (node.props.badges as string[]) : []}
                onChange={(badges) => onChangeProps({ badges })}
                placeholder="e.g. Transparent pricing, no hidden fees"
              />
            ) : node.type === "Checklist" && field.key === "includedItems" ? (
              <StringListEditor
                key={field.key}
                label="Included Items"
                value={Array.isArray(node.props.includedItems) ? (node.props.includedItems as string[]) : []}
                onChange={(includedItems) => onChangeProps({ includedItems })}
                placeholder="e.g. Luxury Vehicle Transport"
              />
            ) : node.type === "Checklist" && field.key === "excludedItems" ? (
              <StringListEditor
                key={field.key}
                label="Excluded Items"
                value={Array.isArray(node.props.excludedItems) ? (node.props.excludedItems as string[]) : []}
                onChange={(excludedItems) => onChangeProps({ excludedItems })}
                placeholder="e.g. Food"
              />
            ) : node.type === "PillLinks" && field.key === "areas" ? (
              <SimpleRepeaterEditor<PillLinkItem>
                key={field.key}
                value={Array.isArray(node.props.areas) ? (node.props.areas as PillLinkItem[]) : []}
                onChange={(areas) => onChangeProps({ areas })}
                addLabel="+ Add pill"
                itemLabel={(item) => item.label || "Pill"}
                defaultItem={{ label: "New Pill", href: "/contact" }}
                fields={[
                  { key: "label", label: "Label", type: "text", placeholder: "e.g. Web Design" },
                  { key: "href", label: "Link URL", type: "text", placeholder: "/contact or https://..." },
                ]}
              />
            ) : node.type === "Faq" && field.key === "faqs" ? (
              <SimpleRepeaterEditor<FaqItem>
                key={field.key}
                value={Array.isArray(node.props.faqs) ? (node.props.faqs as FaqItem[]) : []}
                onChange={(faqs) => onChangeProps({ faqs })}
                addLabel="+ Add question"
                itemLabel={(item) => item.question || "Question"}
                defaultItem={{ question: "New question?", answer: "" }}
                fields={[
                  { key: "question", label: "Question", type: "text", placeholder: "e.g. How can I book a transfer?" },
                  { key: "answer", label: "Answer", type: "richtext", placeholder: "Answer text" },
                ]}
              />
            ) : node.type === "Testimonials" && field.key === "platforms" ? (
              <SimpleRepeaterEditor<TestimonialPlatformItem>
                key={field.key}
                value={Array.isArray(node.props.platforms) ? (node.props.platforms as TestimonialPlatformItem[]) : []}
                onChange={(platforms) => onChangeProps({ platforms })}
                addLabel="+ Add review platform"
                itemLabel={(item) => item.name || "Platform"}
                defaultItem={{ name: "New Platform", href: "#", rating: "5", viewReviewsLabel: "View Reviews", icon: "google" }}
                fields={[
                  { key: "name", label: "Platform Name", type: "text", placeholder: "e.g. Google" },
                  { key: "href", label: "Review Link URL", type: "text", placeholder: "https://..." },
                  { key: "rating", label: "Rating (0-5)", type: "select", options: ["0", "1", "2", "3", "4", "5"] },
                  { key: "viewReviewsLabel", label: '"View Reviews" Label', type: "text" },
                  { key: "icon", label: "Icon", type: "select", options: ["google", "trustpilot", "tripadvisor"] },
                ]}
              />
            ) : node.type === "Services" && field.key === "items" ? (
              <ServiceItemsEditor
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as ServiceItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
              />
            ) : node.type === "ProcessSteps" && field.key === "items" ? (
              <SimpleRepeaterEditor<ProcessStepItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as ProcessStepItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                addLabel="+ Add step"
                itemLabel={(item) => item.title || item.stepLabel || "Step"}
                defaultItem={{ image: "", stepLabel: "Step", title: "New Step", description: "", highlighted: false }}
                fields={[
                  { key: "image", label: "Image", type: "image" },
                  { key: "stepLabel", label: 'Step Label (e.g. "Step 1")', type: "text" },
                  { key: "title", label: "Title", type: "text" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "readMoreUrl", label: '"Read More" Link URL', type: "text", placeholder: "https:// or leave blank" },
                  { key: "bookNowUrl", label: '"Book Now" Link URL', type: "text", placeholder: "https:// or leave blank" },
                  { key: "highlighted", label: "Highlighted / Featured Card", type: "boolean" },
                ]}
                imageCategory="builder"
              />
            ) : node.type === "NavMenu" && field.key === "menuId" ? (
              <MenuPickerField key={field.key} value={typeof node.props.menuId === "string" ? node.props.menuId : ""} onChange={(v) => onChangeProps({ menuId: v })} />
            ) : node.type === "IconList" && field.key === "items" ? (
              <IconListEditor
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as IconListItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
              />
            ) : node.type === "ScrollMarquee" && field.key === "items" ? (
              <SimpleRepeaterEditor<ScrollMarqueeItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as ScrollMarqueeItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ text: "New item" }}
                itemLabel={(item) => item.text || "(image only)"}
                fields={[
                  { key: "text", label: "Text", type: "text" },
                  { key: "image", label: "Image (optional)", type: "image" },
                  { key: "link", label: "Link URL (optional)", type: "text" },
                ]}
                imageCategory="builder"
              />
            ) : node.type === "IconBullets" && field.key === "items" ? (
              <SimpleRepeaterEditor<IconBulletItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as IconBulletItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ icon: "FaCheck", text: "New item" }}
                itemLabel={(item) => item.text}
                fields={[
                  { key: "icon", label: "Icon", type: "icon" },
                  { key: "text", label: "Text", type: "text" },
                ]}
              />
            ) : node.type === "TimelineBullets" && field.key === "items" ? (
              <SimpleRepeaterEditor<TimelineBulletItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as TimelineBulletItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ icon: "FaCircle", date: "", title: "New step", description: "" }}
                itemLabel={(item) => item.title}
                fields={[
                  { key: "icon", label: "Icon", type: "icon" },
                  { key: "date", label: "Date / Step Label", type: "text" },
                  { key: "title", label: "Title", type: "text" },
                  { key: "description", label: "Description", type: "textarea" },
                ]}
              />
            ) : node.type === "ShapeBullets" && field.key === "items" ? (
              <SimpleRepeaterEditor<ShapeBulletItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as ShapeBulletItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ shape: "circle", text: "New item" }}
                itemLabel={(item) => item.text}
                fields={[
                  { key: "shape", label: "Shape", type: "select", options: SHAPE_BULLET_SHAPE_VALUES },
                  { key: "text", label: "Text", type: "text" },
                ]}
              />
            ) : node.type === "IconAccordion" && field.key === "items" ? (
              <SimpleRepeaterEditor<IconAccordionItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as IconAccordionItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ icon: "", question: "New question", answer: "" }}
                itemLabel={(item) => item.question}
                fields={[
                  { key: "icon", label: "Icon (optional, overrides default)", type: "icon" },
                  { key: "question", label: "Question", type: "text" },
                  { key: "answer", label: "Answer", type: "textarea" },
                ]}
              />
            ) : node.type === "DefinitionRows" && field.key === "items" ? (
              <SimpleRepeaterEditor<DefinitionRowItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as DefinitionRowItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ label: "New Row", content: "" }}
                itemLabel={(item) => item.label || "Row"}
                fields={[
                  { key: "label", label: "Label", type: "text" },
                  { key: "content", label: "Content", type: "richtext" },
                ]}
              />
            ) : node.type === "TourInfoSection" && field.key === "facts" ? (
              <SimpleRepeaterEditor<TourInfoFact>
                key={field.key}
                value={Array.isArray(node.props.facts) ? (node.props.facts as TourInfoFact[]) : []}
                onChange={(facts) => onChangeProps({ facts })}
                defaultItem={{ icon: "pin", label: "New Fact:", value: "" }}
                itemLabel={(item) => item.label || "Fact"}
                fields={[
                  { key: "icon", label: "Icon", type: "icon" },
                  { key: "label", label: "Label", type: "text" },
                  { key: "value", label: "Value", type: "textarea" },
                ]}
              />
            ) : node.type === "StackedImages" && field.key === "images" ? (
              <SimpleRepeaterEditor<StackedImageItem>
                key={field.key}
                value={Array.isArray(node.props.images) ? (node.props.images as StackedImageItem[]) : []}
                onChange={(images) => onChangeProps({ images })}
                defaultItem={{ image: "", rotate: "0deg", offsetX: "0px", offsetY: "0px" }}
                itemLabel={(_item, i) => `Image ${i + 1}`}
                fields={[
                  { key: "image", label: "Image", type: "image" },
                  { key: "alt", label: "Alt text", type: "text" },
                  { key: "rotate", label: "Rotate (e.g. -6deg)", type: "text" },
                  { key: "offsetX", label: "Offset X (e.g. 40px)", type: "text" },
                  { key: "offsetY", label: "Offset Y (e.g. 20px)", type: "text" },
                ]}
                imageCategory="builder"
              />
            ) : node.type === "TeamMember" && field.key === "socialLinks" ? (
              <SimpleRepeaterEditor<SocialLink>
                key={field.key}
                value={Array.isArray(node.props.socialLinks) ? (node.props.socialLinks as SocialLink[]) : []}
                onChange={(socialLinks) => onChangeProps({ socialLinks })}
                defaultItem={{ platform: "website", url: "" }}
                itemLabel={(item) => item.platform}
                fields={[
                  { key: "platform", label: "Platform", type: "select", options: SOCIAL_LINK_PLATFORM_VALUES },
                  { key: "url", label: "URL", type: "text" },
                ]}
              />
            ) : node.type === "PriceTable" && field.key === "features" ? (
              <SimpleRepeaterEditor<PriceFeature>
                key={field.key}
                value={Array.isArray(node.props.features) ? (node.props.features as PriceFeature[]) : []}
                onChange={(features) => onChangeProps({ features })}
                defaultItem={{ text: "New feature", included: true }}
                itemLabel={(item) => item.text}
                fields={[{ key: "text", label: "Feature text", type: "text" }]}
              />
            ) : node.type === "BusinessHours" && field.key === "items" ? (
              <SimpleRepeaterEditor<BusinessHourItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as BusinessHourItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ day: "Day", hours: "9am - 5pm", closed: false }}
                itemLabel={(item) => item.day}
                fields={[
                  { key: "day", label: "Day", type: "text" },
                  { key: "hours", label: "Hours (e.g. 9am - 5pm)", type: "text" },
                ]}
              />
            ) : node.type === "MultiButtons" && field.key === "buttons" ? (
              <SimpleRepeaterEditor<MultiButtonItem>
                key={field.key}
                value={Array.isArray(node.props.buttons) ? (node.props.buttons as MultiButtonItem[]) : []}
                onChange={(buttons) => onChangeProps({ buttons })}
                defaultItem={{ label: "New Button", url: "#", variant: "gold" }}
                itemLabel={(item) => item.label}
                fields={[
                  { key: "label", label: "Label", type: "text" },
                  { key: "url", label: "URL", type: "text" },
                  { key: "openInNewTab", label: "Open in New Tab", type: "boolean" },
                  { key: "variant", label: "Variant", type: "select", options: ["gold", "white", "outline"] },
                  { key: "icon", label: "Icon (optional)", type: "icon" },
                  { key: "iconPosition", label: "Icon Position", type: "select", options: MULTI_BUTTON_ICON_POSITION_VALUES, segmented: true },
                  { key: "background", label: "Background Color (overrides variant)", type: "color" },
                  { key: "color", label: "Text Color (overrides variant)", type: "color" },
                  { key: "hoverBackground", label: "Hover Background", type: "color" },
                  { key: "hoverColor", label: "Hover Text Color", type: "color" },
                  { key: "borderRadius", label: "Border Radius (overrides Style tab)", type: "text", placeholder: "e.g. 8px" },
                ]}
              />
            ) : node.type === "FAQSchema" && field.key === "items" ? (
              <SimpleRepeaterEditor<FaqSchemaItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as FaqSchemaItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ question: "New question", answer: "" }}
                itemLabel={(item) => item.question}
                fields={[
                  { key: "question", label: "Question", type: "text" },
                  { key: "answer", label: "Answer", type: "textarea" },
                ]}
              />
            ) : node.type === "CountdownTimer" && field.key === "targetDate" ? (
              <div key={field.key}>
                <label className="mb-1 block text-xs text-zinc-400">Target Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={typeof node.props.targetDate === "string" && node.props.targetDate ? node.props.targetDate.slice(0, 16) : ""}
                  onChange={(e) => onChangeProps({ targetDate: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
            ) : node.type === "Hotspot" && field.key === "points" ? (
              <SimpleRepeaterEditor<HotspotPoint>
                key={field.key}
                value={Array.isArray(node.props.points) ? (node.props.points as HotspotPoint[]) : []}
                onChange={(points) => onChangeProps({ points })}
                defaultItem={{ x: "50", y: "50", title: "New point", description: "" }}
                itemLabel={(item) => item.title}
                fields={[
                  { key: "x", label: "X position % (0-100)", type: "text" },
                  { key: "y", label: "Y position % (0-100)", type: "text" },
                  { key: "title", label: "Title", type: "text" },
                  { key: "description", label: "Description", type: "textarea" },
                ]}
              />
            ) : node.type === "TechStackGrid" && field.key === "items" ? (
              <SimpleRepeaterEditor<TechStackItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as TechStackItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ icon: "FaCube", name: "New Technology", category: "", description: "" }}
                itemLabel={(item) => item.name || "Technology"}
                fields={[
                  { key: "icon", label: "Icon", type: "icon" },
                  { key: "name", label: "Name", type: "text" },
                  { key: "category", label: "Category (e.g. Frontend, Database)", type: "text" },
                  { key: "description", label: "Tooltip description", type: "textarea" },
                ]}
              />
            ) : node.type === "FeaturedRoutesCarousel" && field.key === "routes" ? (
              <SimpleRepeaterEditor<RouteCardItem>
                key={field.key}
                value={Array.isArray(node.props.routes) ? (node.props.routes as RouteCardItem[]) : []}
                onChange={(routes) => onChangeProps({ routes })}
                defaultItem={{ image: "", badge: "", title: "New route", description: "", readMoreUrl: "", bookNowUrl: "", maxPeople: "8", durationLabel: "", price: "" }}
                itemLabel={(item) => item.title || "Route"}
                fields={[
                  { key: "image", label: "Image", type: "image" },
                  { key: "badge", label: "Badge (e.g. Most Popular)", type: "text" },
                  { key: "title", label: "Title", type: "text", placeholder: "e.g. Salzburg to Zell am See:" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "maxPeople", label: "Max People (e.g. 8)", type: "text" },
                  { key: "durationLabel", label: "Duration (e.g. Up to 4 Hours)", type: "text" },
                  { key: "price", label: "Price € (number only, e.g. 270)", type: "text" },
                  { key: "readMoreUrl", label: "Read More link", type: "text" },
                  { key: "bookNowUrl", label: "View Details link", type: "text" },
                ]}
                imageCategory="builder"
              />
            ) : node.type === "StaticToursGrid" && field.key === "items" ? (
              <SimpleRepeaterEditor<StaticTourItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as StaticTourItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                addLabel="+ Add Tour"
                defaultItem={{ image: "", title: "New Tour", tagline: "", description: "", maxPeople: "8", durationLabel: "", price: "", href: "" }}
                itemLabel={(item) => item.title || "Tour"}
                fields={[
                  { key: "image", label: "Image", type: "image" },
                  { key: "title", label: "Title", type: "text", placeholder: "e.g. City Tour Salzburg" },
                  { key: "tagline", label: "Tagline (short one-liner)", type: "text" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "maxPeople", label: "Max People (e.g. 8)", type: "text" },
                  { key: "durationLabel", label: "Duration (e.g. Up to 4 Hours)", type: "text" },
                  { key: "price", label: "Price € (number only, e.g. 270)", type: "text" },
                  { key: "href", label: "Card Link URL", type: "text" },
                ]}
                imageCategory="builder"
              />
            ) : node.type === "Posts" && field.key === "loopTemplateId" ? (
              <LoopTemplateSelect
                key={field.key}
                value={typeof node.props.loopTemplateId === "string" ? node.props.loopTemplateId : ""}
                onChange={(id) => onChangeProps({ loopTemplateId: id })}
              />
            ) : node.type === "Table" && field.key === "headers" ? (
              <TableEditor
                key={field.key}
                headers={Array.isArray(node.props.headers) ? (node.props.headers as string[]) : []}
                rows={Array.isArray(node.props.rows) ? (node.props.rows as string[][]) : []}
                onChange={({ headers, rows }) => onChangeProps({ headers, rows })}
              />
            ) : node.type === "Table" && field.key === "rows" ? null : node.type === "PricingOverview" && field.key === "headers" ? (
              <TableEditor
                key={field.key}
                headers={Array.isArray(node.props.headers) ? (node.props.headers as string[]) : []}
                rows={Array.isArray(node.props.rows) ? (node.props.rows as string[][]) : []}
                onChange={({ headers, rows }) => onChangeProps({ headers, rows })}
              />
            ) : node.type === "PricingOverview" && field.key === "rows" ? null : node.type === "VideoPlaylist" && field.key === "items" ? (
              <SimpleRepeaterEditor<VideoPlaylistItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as VideoPlaylistItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ title: "New video", videoUrl: "" }}
                itemLabel={(item) => item.title}
                fields={[
                  { key: "title", label: "Title", type: "text" },
                  { key: "videoUrl", label: "Video URL (YouTube/Vimeo)", type: "text" },
                  { key: "thumbnail", label: "Thumbnail (optional)", type: "image" },
                ]}
              />
            ) : node.type === "Tabs" && field.key === "tabs" ? (
              <SimpleRepeaterEditor<TabItem>
                key={field.key}
                value={Array.isArray(node.props.tabs) ? (node.props.tabs as TabItem[]) : []}
                onChange={(tabs) => onChangeProps({ tabs })}
                defaultItem={{ label: "New Tab", content: "" }}
                itemLabel={(item) => item.label}
                fields={[
                  { key: "label", label: "Tab Label", type: "text" },
                  { key: "icon", label: "Tab Icon (optional)", type: "icon" },
                  { key: "content", label: "Content", type: "richtext" },
                ]}
              />
            ) : node.type === "ItineraryRoadmap" && field.key === "items" ? (
              <SimpleRepeaterEditor<ItineraryRoadmapItem>
                key={field.key}
                value={Array.isArray(node.props.items) ? (node.props.items as ItineraryRoadmapItem[]) : []}
                onChange={(items) => onChangeProps({ items })}
                defaultItem={{ time: "09:00 AM", heading: "New Stop", description: "", position: "left" }}
                itemLabel={(item) => item.heading || item.time}
                fields={[
                  { key: "time", label: "Time (e.g. 09:00 AM)", type: "text" },
                  { key: "heading", label: "Heading", type: "text" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "position", label: "Card Position", type: "select", options: ["left", "right"], segmented: true },
                ]}
              />
            ) : node.type === "TaxonomyFilter" && field.key === "categories" ? (
              <StringListEditor
                key={field.key}
                label="Categories"
                value={Array.isArray(node.props.categories) ? (node.props.categories as string[]) : []}
                onChange={(categories) => onChangeProps({ categories })}
                placeholder="e.g. Airport Transfers"
              />
            ) : node.type === "Form" && field.key === "actions" ? (
              <div key={field.key}>
                <label className="mb-1 block text-xs text-zinc-400">Actions After Submit</label>
                <div className="flex flex-col gap-1.5">
                  {FORM_ACTION_VALUES.map((action) => {
                    const current = Array.isArray(node.props.actions) ? (node.props.actions as string[]) : [];
                    const checked = current.includes(action);
                    return (
                      <label key={action} className="flex items-center gap-2 text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            onChangeProps({ actions: e.target.checked ? [...current, action] : current.filter((a) => a !== action) })
                          }
                        />
                        {ACTION_LABELS[action]}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1 text-[10px] text-zinc-600">
                  Each action&apos;s own settings (Email, Redirect, Webhook, Collect Submissions below) only run when
                  its checkbox is on here.
                </p>
              </div>
            ) : (
              <PropField key={field.key} field={field} binding={binding(field.key)} />
            )
          )}
            </div>
          )}

          <WebflowCustomAttributesSection
            attributes={node.style?.htmlAttributes}
            onChange={(htmlAttributes) => onChangeStyle({ htmlAttributes })}
          />
        </div>
      )}

      {tab === "style" && (
        <div className="flex flex-col gap-3">
          <SelectorStateHeader
            attachedClassIds={attachedClassIds}
            allClasses={styleClasses}
            activeSelectorId={activeSelectorId}
            onSelectTarget={setActiveSelectorId}
            onAttachClass={(id) => onChangeClassIds?.([...attachedClassIds, id])}
            onDetachClass={(id) => {
              onChangeClassIds?.(attachedClassIds.filter((c) => c !== id));
              if (activeSelectorId === id) setActiveSelectorId(null);
            }}
            onCreateClass={createClass}
            pseudoState={pseudoState}
            onPseudoStateChange={setPseudoState}
          />

          <WebflowLayoutSection
            activeStyle={activeStyle}
            patchStyle={patchStyle}
            breakpoint={breakpoint}
            node={node}
            onChangeProps={onChangeProps}
          />

          <WebflowSpacingSection
            activeStyle={activeStyle}
            patchStyle={patchStyle}
          />

          <WebflowSizeSection
            activeStyle={activeStyle}
            patchStyle={patchStyle}
          />

          <WebflowPositionSection
            activeStyle={activeStyle}
            patchStyle={patchStyle}
          />

          <WebflowTypographySection
            activeStyle={activeStyle}
            patchStyle={patchStyle}
          />

          <WebflowBackgroundsSection
            activeStyle={activeStyle}
            patchStyle={patchStyle}
          />

          <WebflowBordersSection
            activeStyle={activeStyle}
            patchStyle={patchStyle}
          />

          <WebflowEffectsSection
            activeStyle={activeStyle}
            patchStyle={patchStyle}
          />

          {/* Hover Animation Engine — shown when the :hover pseudo-state is active */}
          {pseudoState === "hover" && (
            <WebflowHoverAnimationsSection
              styleSource={styleSource}
              onCommit={(patch) => commitStyle(patch)}
            />
          )}

          <WebflowCustomPropertiesSection
            css={styleSource?.css}
            onChange={(css) => commitStyle({ css })}
          />

          {styleFields.length > 0 && (
          <AccordionSection title="Module Settings" icon={Puzzle}>
          <div className="flex flex-col gap-3">
          {node.type === "Image" && !node.props.caption && styleFields.some((f) => f.key.startsWith("caption")) && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
              These caption styles won&apos;t be visible yet — add caption text on the <strong>Content</strong> tab first.
            </p>
          )}
          {node.type === "TextUnfold" && node.props.expandMode !== "scroll" && styleFields.some((f) => f.key === "showScrollbar") && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
              Scrollbar styles below only apply when Expand Mode is set to <strong>Scroll</strong> on the{" "}
              <strong>Content</strong> tab.
            </p>
          )}
          {node.type === "Form" && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
              No Steps section here — multi-step forms (the Step field type, Next/Previous buttons, step indicator
              styling) aren&apos;t built yet. Every other section below (Form, Field, Buttons, Messages) is fully wired.
            </p>
          )}
          {breakpoint !== "desktop" && styleFields.some((f) => STYLE_KEYS.has(f.key) && !STRUCTURAL_STYLE_KEYS.has(f.key) && !BOX_MODEL_KEYS.has(f.key)) && (
            <ResponsiveFieldNote breakpoint={breakpoint} />
          )}
          {styleFields.some((f) => f.key === "fontFamily") && (
            <TypographyField {...typographyBinding("")} />
          )}
          {(() => {
            const visibleFields = styleFields.filter(
              // NavMenu's ~65 style props render as 3 explicitly-headed
              // sections (Menu/Dropdown/Trigger) further down instead of one
              // long undifferentiated list — see the dedicated block below.
              (f) =>
                !GROUPED_STYLE_KEYS.has(f.key) &&
                node.type !== "NavMenu" &&
                node.type !== "IconList" &&
                !(node.type === "Section" && SECTION_OWN_STYLE_KEYS.has(f.key))
            );
            return visibleFields.map((field, i) => {
              // Any field whose key contains "Hover" gets an automatic
              // "Hover Settings" divider the moment the list transitions
              // from non-hover to hover fields — a generic, block-agnostic
              // fallback so every current and future hover field (card,
              // button, icon, tab, ...) gets a clearly-labeled group without
              // hand-registering it per block, the way
              // ICON_ACCORDION_GROUP_HEADERS requires below.
              const isFirstHoverField = /Hover/.test(field.key) && !/Hover/.test(visibleFields[i - 1]?.key ?? "");
              const groupHeader =
                node.type === "IconAccordion"
                  ? ICON_ACCORDION_GROUP_HEADERS[field.key]
                  : isFirstHoverField
                    ? "Hover Settings"
                    : undefined;
              // Any field ending in "BoxShadow" that isn't already grouped
              // into its own dedicated block (GROUPED_STYLE_KEYS) gets the
              // real BoxShadowField widget (Color/Offset-X/Offset-Y/Blur/
              // Spread) instead of a raw CSS-string text box — a suffix
              // rule instead of naming every "{prefix}BoxShadow" field here
              // one at a time, so every current and future button/card
              // family's shadow fields get proper controls for free.
              const input = COLOR_FIELD_KEYS.has(field.key) ? (
                <ColorField
                  key={field.key}
                  label={field.label}
                  value={typeof binding(field.key).value === "string" ? (binding(field.key).value as string) : ""}
                  onChange={(v) => binding(field.key).onChange(v)}
                />
              ) : field.key.endsWith("BoxShadow") ? (
                <div key={field.key}>
                  <label className="mb-1 block text-xs text-zinc-400">{field.label}</label>
                  <BoxShadowField
                    value={typeof binding(field.key).value === "string" ? (binding(field.key).value as string) : ""}
                    onChange={(v) => binding(field.key).onChange(v)}
                  />
                </div>
              ) : (
                <PropField key={field.key} field={field} binding={binding(field.key)} />
              );
              if (!groupHeader) return input;
              return (
                <div key={field.key} className="mt-2 border-t border-zinc-800 pt-3 [&>*:not(h5)]:mt-2 first:mt-0 first:border-t-0 first:pt-0">
                  <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{groupHeader}</h5>
                  {input}
                </div>
              );
            });
          })()}
          {styleFields.some((f) => f.key === "boxShadow") && (
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Box Shadow</label>
              <BoxShadowField value={typeof binding("boxShadow").value === "string" ? (binding("boxShadow").value as string) : ""} onChange={(v) => binding("boxShadow").onChange(v)} />
            </div>
          )}
          {styleFields.some((f) => f.key === "hoverBoxShadow") && (
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Hover Box Shadow</label>
              <BoxShadowField value={typeof binding("hoverBoxShadow").value === "string" ? (binding("hoverBoxShadow").value as string) : ""} onChange={(v) => binding("hoverBoxShadow").onChange(v)} />
            </div>
          )}
          {/* Any button field family that declares a "{prefix}HoverBackgroundSize"
              field (CTAButton's own unprefixed fields included, prefix "")
              gets its own one-click gold gradient-slide preset — generic by
              suffix so every in-section CTA (Services/Faq/TourInfoSection/
              Checklist/etc, e.g. the cta, showMore, primaryCta, secondaryCta,
              bookNow, readMore, button, and viewMore field families) gets
              this for free instead of one hardcoded block per block type. */}
          {styleFields
            .filter((f) => f.key.endsWith("HoverBackgroundSize"))
            .map((f) => {
              const prefix = f.key.slice(0, -"HoverBackgroundSize".length);
              const k = (suffix: string) => `${prefix}${suffix}`;
              const prettyPrefix = prefix
                ? prefix.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase())
                : "";
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() =>
                    onChangeProps({
                      [k("HoverBackground")]: "linear-gradient(to right, #2563ff, #d8ab4e, #e09e16, #b67b01)",
                      [k("HoverBackgroundSize")]: "300% 100%",
                      [k("HoverBackgroundPosition")]: "100% 0",
                      [k("HoverBoxShadow")]: "0 4px 15px 0 rgba(37, 99, 255, 0.86)",
                      [k("HoverTransitionDuration")]: "0.4s",
                    })
                  }
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
                  title={`Fills ${prettyPrefix || "this button"}'s Hover Background, Size, Position, Box Shadow, and Transition Duration with a ready-made gold gradient-slide effect — edit any of them afterward to tweak it.`}
                >
                  ✨ Apply Gold Gradient Hover Preset{prettyPrefix ? ` (${prettyPrefix})` : ""}
                </button>
              );
            })}
          {styleFields.some((f) => f.key === "slideBoxShadow") && (
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Slide Box Shadow</label>
              <BoxShadowField value={typeof binding("slideBoxShadow").value === "string" ? (binding("slideBoxShadow").value as string) : ""} onChange={(v) => binding("slideBoxShadow").onChange(v)} />
            </div>
          )}
          {styleFields.some((f) => f.key === "paddingTop") && (
            <FourSideField
              label="Padding"
              // Deliberately NOT using `binding()` here: "paddingTop"/etc are
              // also the generic wrapper-level Advanced-tab Padding field
              // name (see BOX_MODEL_KEYS in resolveNodeStyle.ts) — redirecting
              // THIS block's own content padding into the same per-breakpoint
              // bag would have it painted onto the wrapper by
              // `fieldsToDeclarations` instead of wherever this block's own
              // component actually applies it. Stays desktop-only until that
              // naming collision is resolved (e.g. renaming this one to a
              // block-specific prefix).
              values={{
                top: typeof node.props.paddingTop === "string" ? node.props.paddingTop : undefined,
                right: typeof node.props.paddingRight === "string" ? node.props.paddingRight : undefined,
                bottom: typeof node.props.paddingBottom === "string" ? node.props.paddingBottom : undefined,
                left: typeof node.props.paddingLeft === "string" ? node.props.paddingLeft : undefined,
              }}
              onChange={(side, v) => onChangeProps({ [`padding${side}`]: v })}
            />
          )}
          {styleFields.some((f) => f.key === "rotate") && (
            <UnitField
              label="Rotate"
              value={typeof binding("rotate").value === "string" ? (binding("rotate").value as string) : ""}
              onChange={(v) => binding("rotate").onChange(v)}
              min={0}
              max={360}
              step={1}
              unit="deg"
            />
          )}
          {node.type === "Section" && (
            <>
              <StyleSectionHeader label="Background" />
              <ColorField
                label="Background Color"
                value={typeof binding("background").value === "string" ? (binding("background").value as string) : ""}
                onChange={(v) => binding("background").onChange(v)}
              />
              <ImagePicker
                label="Background Image"
                images={typeof binding("backgroundImage").value === "string" && binding("backgroundImage").value ? [binding("backgroundImage").value as string] : []}
                onChange={(images) => binding("backgroundImage").onChange(images[images.length - 1] ?? "")}
                category="builder"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Position</label>
                  <select
                    value={typeof binding("backgroundPosition").value === "string" ? (binding("backgroundPosition").value as string) : "center"}
                    onChange={(e) => binding("backgroundPosition").onChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    {BG_POSITION_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Size</label>
                  <select
                    value={typeof binding("backgroundSize").value === "string" ? (binding("backgroundSize").value as string) : "cover"}
                    onChange={(e) => binding("backgroundSize").onChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    {BG_SIZE_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Repeat</label>
                  <select
                    value={typeof binding("backgroundRepeat").value === "string" ? (binding("backgroundRepeat").value as string) : "no-repeat"}
                    onChange={(e) => binding("backgroundRepeat").onChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    {BG_REPEAT_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Attachment</label>
                  <select
                    value={typeof binding("backgroundAttachment").value === "string" ? (binding("backgroundAttachment").value as string) : "scroll"}
                    onChange={(e) => binding("backgroundAttachment").onChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    {BG_ATTACHMENT_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <SectionOverlayField
                type={typeof binding("backgroundOverlayType").value === "string" ? (binding("backgroundOverlayType").value as string) : "none"}
                onTypeChange={(v) => binding("backgroundOverlayType").onChange(v)}
                color={typeof binding("backgroundOverlayColor").value === "string" ? (binding("backgroundOverlayColor").value as string) : ""}
                onColorChange={(v) => binding("backgroundOverlayColor").onChange(v)}
                image={typeof binding("backgroundOverlayImage").value === "string" ? (binding("backgroundOverlayImage").value as string) : ""}
                onImageChange={(v) => binding("backgroundOverlayImage").onChange(v)}
                position={typeof binding("backgroundOverlayPosition").value === "string" ? (binding("backgroundOverlayPosition").value as string) : "center"}
                onPositionChange={(v) => binding("backgroundOverlayPosition").onChange(v)}
                attachment={typeof binding("backgroundOverlayAttachment").value === "string" ? (binding("backgroundOverlayAttachment").value as string) : "scroll"}
                onAttachmentChange={(v) => binding("backgroundOverlayAttachment").onChange(v)}
                repeat={typeof binding("backgroundOverlayRepeat").value === "string" ? (binding("backgroundOverlayRepeat").value as string) : "no-repeat"}
                onRepeatChange={(v) => binding("backgroundOverlayRepeat").onChange(v)}
                size={typeof binding("backgroundOverlaySize").value === "string" ? (binding("backgroundOverlaySize").value as string) : "cover"}
                onSizeChange={(v) => binding("backgroundOverlaySize").onChange(v)}
                gradientType={typeof binding("backgroundOverlayGradientType").value === "string" ? (binding("backgroundOverlayGradientType").value as string) : "linear"}
                onGradientTypeChange={(v) => binding("backgroundOverlayGradientType").onChange(v)}
                gradientAngle={typeof binding("backgroundOverlayGradientAngle").value === "string" ? (binding("backgroundOverlayGradientAngle").value as string) : "180"}
                onGradientAngleChange={(v) => binding("backgroundOverlayGradientAngle").onChange(v)}
                gradientColor1={typeof binding("backgroundOverlayGradientColor1").value === "string" ? (binding("backgroundOverlayGradientColor1").value as string) : ""}
                onGradientColor1Change={(v) => binding("backgroundOverlayGradientColor1").onChange(v)}
                gradientStop1={typeof binding("backgroundOverlayGradientStop1").value === "string" ? (binding("backgroundOverlayGradientStop1").value as string) : "0"}
                onGradientStop1Change={(v) => binding("backgroundOverlayGradientStop1").onChange(v)}
                gradientColor2={typeof binding("backgroundOverlayGradientColor2").value === "string" ? (binding("backgroundOverlayGradientColor2").value as string) : ""}
                onGradientColor2Change={(v) => binding("backgroundOverlayGradientColor2").onChange(v)}
                gradientStop2={typeof binding("backgroundOverlayGradientStop2").value === "string" ? (binding("backgroundOverlayGradientStop2").value as string) : "100"}
                onGradientStop2Change={(v) => binding("backgroundOverlayGradientStop2").onChange(v)}
              />
              <UnitField
                label="Background Blur"
                value={typeof binding("backgroundBlur").value === "string" ? (binding("backgroundBlur").value as string) : ""}
                onChange={(v) => binding("backgroundBlur").onChange(v)}
                min={0}
                max={40}
                step={1}
                unit="px"
              />
            </>
          )}
          {styleFields.some((f) => f.key === "borderRadiusTop") && (
            <FourSideField
              label="Border Radius"
              values={{
                top: typeof binding("borderRadiusTop").value === "string" ? (binding("borderRadiusTop").value as string) : undefined,
                right: typeof binding("borderRadiusRight").value === "string" ? (binding("borderRadiusRight").value as string) : undefined,
                bottom: typeof binding("borderRadiusBottom").value === "string" ? (binding("borderRadiusBottom").value as string) : undefined,
                left: typeof binding("borderRadiusLeft").value === "string" ? (binding("borderRadiusLeft").value as string) : undefined,
              }}
              onChange={(side, v) => binding(`borderRadius${side}`).onChange(v)}
            />
          )}
          {/* Shared by every block with its own bare (unprefixed) borderWidth —
              Section/CTAButton/Icon/ImageBox/IconBox/TextUnfold/Slider/SiteLogo/
              MarketingButton — gated purely on the field existing rather than a
              node.type list, since the exact bare name only ever means this. */}
          {styleFields.some((f) => f.key === "borderWidth") && (
            <BorderWidthField
              key={`${node.id}-border-width`}
              label="Border Width"
              flatValue={typeof binding("borderWidth").value === "string" ? (binding("borderWidth").value as string) : ""}
              onFlatChange={(v) => binding("borderWidth").onChange(v)}
              values={{
                top: typeof binding("borderWidthTop").value === "string" ? (binding("borderWidthTop").value as string) : undefined,
                right: typeof binding("borderWidthRight").value === "string" ? (binding("borderWidthRight").value as string) : undefined,
                bottom: typeof binding("borderWidthBottom").value === "string" ? (binding("borderWidthBottom").value as string) : undefined,
                left: typeof binding("borderWidthLeft").value === "string" ? (binding("borderWidthLeft").value as string) : undefined,
              }}
              onChange={(side, v) => binding(`borderWidth${side}`).onChange(v)}
            />
          )}
          {/* Same idea for bare borderRadius — the 14+ "radius-only" blocks
              (GoogleMaps, Gallery, FlipBox, GlowingCard, InfoBox, TeamMember,
              PriceTable, Blockquote, Hotspot, Search, ThirdPartyFormEmbed,
              LanguageSwitcher, BeforeAfter, StackedImages) plus the width
              blocks above that also have a shape radius. */}
          {styleFields.some((f) => f.key === "borderRadius") && (
            <BorderRadiusField
              key={`${node.id}-border-radius`}
              label="Border Radius"
              flatValue={typeof binding("borderRadius").value === "string" ? (binding("borderRadius").value as string) : ""}
              onFlatChange={(v) => binding("borderRadius").onChange(v)}
              values={{
                topLeft: typeof binding("borderRadiusTopLeft").value === "string" ? (binding("borderRadiusTopLeft").value as string) : undefined,
                topRight: typeof binding("borderRadiusTopRight").value === "string" ? (binding("borderRadiusTopRight").value as string) : undefined,
                bottomRight: typeof binding("borderRadiusBottomRight").value === "string" ? (binding("borderRadiusBottomRight").value as string) : undefined,
                bottomLeft: typeof binding("borderRadiusBottomLeft").value === "string" ? (binding("borderRadiusBottomLeft").value as string) : undefined,
              }}
              onChange={(corner, v) => binding(`borderRadius${corner}`).onChange(v)}
            />
          )}
          {(node.type === "ImageBox" || node.type === "SiteLogo") && styleFields.some((f) => f.key === "imageOpacity") && (
            <UnitlessField
              label="Image Opacity"
              value={typeof binding("imageOpacity").value === "string" ? (binding("imageOpacity").value as string) : ""}
              onChange={(v) => binding("imageOpacity").onChange(v)}
              min={0}
              max={1}
              step={0.05}
            />
          )}
          {node.type === "SiteLogo" && styleFields.some((f) => f.key === "imageHoverOpacity") && (
            <UnitlessField
              label="Image Opacity (Hover)"
              value={typeof binding("imageHoverOpacity").value === "string" ? (binding("imageHoverOpacity").value as string) : ""}
              onChange={(v) => binding("imageHoverOpacity").onChange(v)}
              min={0}
              max={1}
              step={0.05}
            />
          )}
          {node.type === "Image" && (
            <>
              <StyleSectionHeader label="Media" />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Border Style</label>
                <select
                  value={typeof binding("imageBorderStyle").value === "string" ? (binding("imageBorderStyle").value as string) : "none"}
                  onChange={(e) => binding("imageBorderStyle").onChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  {["none", "solid", "dashed", "dotted", "double"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <BorderWidthField
                key={`${node.id}-imageBorderWidth`}
                label="Border Width"
                flatValue={typeof binding("imageBorderWidth").value === "string" ? (binding("imageBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("imageBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("imageBorderWidthTop").value === "string" ? (binding("imageBorderWidthTop").value as string) : undefined,
                  right: typeof binding("imageBorderWidthRight").value === "string" ? (binding("imageBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("imageBorderWidthBottom").value === "string" ? (binding("imageBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("imageBorderWidthLeft").value === "string" ? (binding("imageBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`imageBorderWidth${side}`).onChange(v)}
              />
              <NormalHoverColorField
                label="Border Color"
                normalValue={typeof binding("imageBorderColor").value === "string" ? (binding("imageBorderColor").value as string) : ""}
                onNormalChange={(v) => binding("imageBorderColor").onChange(v)}
                hoverValue={typeof binding("imageHoverBorderColor").value === "string" ? (binding("imageHoverBorderColor").value as string) : ""}
                onHoverChange={(v) => binding("imageHoverBorderColor").onChange(v)}
              />
              <FourSideField
                label="Border Radius"
                values={{
                  top: typeof binding("imageBorderRadiusTop").value === "string" ? (binding("imageBorderRadiusTop").value as string) : undefined,
                  right: typeof binding("imageBorderRadiusRight").value === "string" ? (binding("imageBorderRadiusRight").value as string) : undefined,
                  bottom: typeof binding("imageBorderRadiusBottom").value === "string" ? (binding("imageBorderRadiusBottom").value as string) : undefined,
                  left: typeof binding("imageBorderRadiusLeft").value === "string" ? (binding("imageBorderRadiusLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`imageBorderRadius${side}`).onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Box Shadow</label>
                <BoxShadowField value={typeof binding("imageBoxShadow").value === "string" ? (binding("imageBoxShadow").value as string) : ""} onChange={(v) => binding("imageBoxShadow").onChange(v)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Box Shadow (Hover)</label>
                <BoxShadowField value={typeof binding("imageHoverBoxShadow").value === "string" ? (binding("imageHoverBoxShadow").value as string) : ""} onChange={(v) => binding("imageHoverBoxShadow").onChange(v)} />
              </div>
              <UnitlessField
                label="Opacity (Hover)"
                value={typeof binding("imageHoverOpacity").value === "string" ? (binding("imageHoverOpacity").value as string) : ""}
                onChange={(v) => binding("imageHoverOpacity").onChange(v)}
                min={0}
                max={1}
                step={0.05}
              />
              <StyleField label="Filter (Hover, e.g. brightness(1.1))" value={typeof binding("imageHoverFilter").value === "string" ? (binding("imageHoverFilter").value as string) : ""} onChange={(v) => binding("imageHoverFilter").onChange(v)} />
            </>
          )}
          {(node.type === "ImageBox" ||
            node.type === "IconBox" ||
            node.type === "TextUnfold" ||
            node.type === "ServiceCard" ||
            node.type === "NumberBox" ||
            node.type === "GlowingCard" ||
            node.type === "InfoBox" ||
            node.type === "AdvancedHeading" ||
            node.type === "TableOfContents") && (
            <div className="mt-2 border-t border-zinc-800 pt-3">
              <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Title</h5>
              <TypographyField {...typographyBinding("title")} />
            </div>
          )}
          {(node.type === "ImageBox" ||
            node.type === "IconBox" ||
            node.type === "ServiceCard" ||
            node.type === "NumberBox" ||
            node.type === "GlowingCard" ||
            node.type === "InfoBox") && (
            <div className="mt-2 border-t border-zinc-800 pt-3">
              <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Description Typography</h5>
              <TypographyField {...typographyBinding("desc")} />
            </div>
          )}
          {node.type === "AdvancedHeading" && (
            <div className="mt-2 border-t border-zinc-800 pt-3">
              <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Subtitle</h5>
              <TypographyField {...typographyBinding("subtitle")} />
            </div>
          )}
          {node.type === "TeamMember" && (
            <>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Name</h5>
                <TypographyField {...typographyBinding("name")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Role</h5>
                <TypographyField {...typographyBinding("role")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Bio</h5>
                <TypographyField {...typographyBinding("bio")} />
              </div>
            </>
          )}
          {node.type === "Services" &&
            (
              [
                ["eyebrow", "Eyebrow"],
                ["heading", "Heading"],
                ["title", "Card Title"],
                ["desc", "Card Description"],
                ["features", "Feature Bullets"],
                ["cta", "CTA Button"],
              ] as const
            ).map(([prefix, label]) => (
              <div key={prefix} className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</h5>
                <TypographyField {...typographyBinding(prefix)} />
              </div>
            ))}
          {node.type === "Services" && (
            <div className="mt-2 border-t border-zinc-800 pt-3">
              <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">CTA Button</h5>
              <UnitField
                label="Space Above CTA (e.g. gap to the mobile arrows)"
                value={typeof binding("ctaTopSpacing").value === "string" ? (binding("ctaTopSpacing").value as string) : ""}
                onChange={(v) => binding("ctaTopSpacing").onChange(v)}
                min={-40}
                max={60}
                step={1}
                unit="px"
              />
            </div>
          )}
          {node.type === "ProcessSteps" &&
            (
              [
                ["eyebrow", "Eyebrow"],
                ["heading", "Heading"],
                ["stepLabel", 'Step Label (e.g. "Step 1")'],
                ["title", "Card Title"],
                ["desc", "Card Description"],
                ["cta", "Bottom CTA Button"],
              ] as const
            ).map(([prefix, label]) => (
              <div key={prefix} className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</h5>
                <TypographyField {...typographyBinding(prefix)} />
              </div>
            ))}
          {node.type === "PricingOverview" &&
            (
              [
                ["eyebrow", "Eyebrow"],
                ["heading", "Heading"],
                ["desc", "Description"],
                ["tableHeader", "Table Header Row"],
                ["tableRow", "Table Body Rows"],
                ["cta", "CTA Button"],
              ] as const
            ).map(([prefix, label]) => (
              <div key={prefix} className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</h5>
                <TypographyField {...typographyBinding(prefix)} />
              </div>
            ))}
          {node.type === "FeaturedRoutesCarousel" &&
            (
              [
                ["eyebrow", "Eyebrow"],
                ["heading", "Heading"],
                ["desc", "Description"],
                ["subLabel", "Sub Label"],
                ["cardTitle", "Card Title"],
                ["cardDesc", "Card Description"],
                ["cta", "Bottom CTA Button"],
              ] as const
            ).map(([prefix, label]) => (
              <div key={prefix} className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</h5>
                <TypographyField {...typographyBinding(prefix)} />
              </div>
            ))}
          {node.type === "TrustHighlights" && (
            <>
              {(
                [
                  ["eyebrow", "Eyebrow"],
                  ["title", "Title"],
                  ["desc", "Description"],
                  ["badge", "Badge Cards"],
                  ["cta", "CTA Button"],
                ] as const
              ).map(([prefix, label]) => (
                <div key={prefix} className="mt-2 border-t border-zinc-800 pt-3">
                  <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</h5>
                  <TypographyField {...typographyBinding(prefix)} />
                </div>
              ))}
              <div className="mt-2 border-t border-zinc-800 pt-3">
                {/* Card Border Width / Box Shadow already get a shared
                    field-name-gated section further down (any block with
                    these two field names) — only the new Backdrop Blur
                    field needs bespoke JSX here. */}
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Card</h5>
                <UnitField
                  label="Card Backdrop Blur"
                  value={typeof binding("cardBackdropBlur").value === "string" ? (binding("cardBackdropBlur").value as string) : ""}
                  onChange={(v) => binding("cardBackdropBlur").onChange(v)}
                  min={0}
                  max={40}
                  step={1}
                  unit="px"
                />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Badge Card</h5>
                <div className="mt-2">
                  <label className="mb-1 block text-xs text-zinc-400">Badge Box Shadow</label>
                  <BoxShadowField value={typeof binding("badgeBoxShadow").value === "string" ? (binding("badgeBoxShadow").value as string) : ""} onChange={(v) => binding("badgeBoxShadow").onChange(v)} />
                </div>
                <UnitField
                  label="Badge Backdrop Blur"
                  value={typeof binding("badgeBackdropBlur").value === "string" ? (binding("badgeBackdropBlur").value as string) : ""}
                  onChange={(v) => binding("badgeBackdropBlur").onChange(v)}
                  min={0}
                  max={40}
                  step={1}
                  unit="px"
                />
              </div>
            </>
          )}
          {node.type === "Testimonials" && (
            <>
              {(
                [
                  ["eyebrow", "Eyebrow"],
                  ["title", "Title"],
                  ["desc", "Description"],
                  ["name", "Customer Name"],
                  ["quote", "Quote"],
                  ["platformName", "Platform Card Name"],
                  ["viewReviews", "Platform Card \"View Reviews\" Link"],
                  ["cta", "CTA Button"],
                ] as const
              ).map(([prefix, label]) => (
                <div key={prefix} className="mt-2 border-t border-zinc-800 pt-3">
                  <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</h5>
                  <TypographyField {...typographyBinding(prefix)} />
                </div>
              ))}
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Platform Card</h5>
                <BoxShadowField value={typeof binding("platformBoxShadow").value === "string" ? (binding("platformBoxShadow").value as string) : ""} onChange={(v) => binding("platformBoxShadow").onChange(v)} />
              </div>
            </>
          )}
          {node.type === "PillLinks" && (
            <>
              {(
                [
                  ["title", "Title"],
                  ["badge", "Area Badges"],
                  ["cta", "CTA Button"],
                ] as const
              ).map(([prefix, label]) => (
                <div key={prefix} className="mt-2 border-t border-zinc-800 pt-3">
                  <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</h5>
                  <TypographyField {...typographyBinding(prefix)} />
                </div>
              ))}
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Area Badges</h5>
                <ColorField
                  label="Hover Background"
                  value={typeof binding("badgeHoverBackground").value === "string" ? (binding("badgeHoverBackground").value as string) : ""}
                  onChange={(v) => binding("badgeHoverBackground").onChange(v)}
                />
                <UnitField
                  label="Backdrop Blur"
                  value={typeof binding("badgeBackdropBlur").value === "string" ? (binding("badgeBackdropBlur").value as string) : ""}
                  onChange={(v) => binding("badgeBackdropBlur").onChange(v)}
                  min={0}
                  max={40}
                  step={1}
                  unit="px"
                />
              </div>
            </>
          )}
          {(node.type === "Faq" || node.type === "AccordionItem" || node.type === "IconAccordion") && (
            <>
              {node.type === "Faq" && (
                <div className="mt-2 border-t border-zinc-800 pt-3">
                  <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Title</h5>
                  <TypographyField {...typographyBinding("title")} />
                </div>
              )}
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Question</h5>
                <TypographyField {...typographyBinding("question")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Answer</h5>
                <TypographyField {...typographyBinding("answer")} />
              </div>
              {node.type === "Faq" && (
                <div className="mt-2 border-t border-zinc-800 pt-3">
                  <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">See More Button</h5>
                  <TypographyField {...typographyBinding("showMore")} />
                </div>
              )}
            </>
          )}
          {node.type === "DefinitionRows" && (
            <>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Label</h5>
                <TypographyField {...typographyBinding("label")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Content</h5>
                <TypographyField {...typographyBinding("content")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Read More Button</h5>
                <TypographyField {...typographyBinding("showMore")} />
              </div>
              {styleFields.some((f) => f.key === "containerPaddingTop") && (
                <div className="mt-2 border-t border-zinc-800 pt-3">
                  <FourSideField
                    label="Container Padding"
                    values={{
                      top: typeof binding("containerPaddingTop").value === "string" ? (binding("containerPaddingTop").value as string) : undefined,
                      right: typeof binding("containerPaddingRight").value === "string" ? (binding("containerPaddingRight").value as string) : undefined,
                      bottom: typeof binding("containerPaddingBottom").value === "string" ? (binding("containerPaddingBottom").value as string) : undefined,
                      left: typeof binding("containerPaddingLeft").value === "string" ? (binding("containerPaddingLeft").value as string) : undefined,
                    }}
                    onChange={(side, v) => binding(`containerPadding${side}`).onChange(v)}
                  />
                </div>
              )}
            </>
          )}
          {node.type === "ItineraryRoadmap" && (
            <>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Subtitle</h5>
                <TypographyField {...typographyBinding("subtitle")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Title</h5>
                <TypographyField {...typographyBinding("title")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Time</h5>
                <TypographyField {...typographyBinding("time")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Heading</h5>
                <TypographyField {...typographyBinding("heading")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Description</h5>
                <TypographyField {...typographyBinding("desc")} />
              </div>
              {styleFields.some((f) => f.key === "containerPaddingTop") && (
                <div className="mt-2 border-t border-zinc-800 pt-3">
                  <FourSideField
                    label="Container Padding"
                    values={{
                      top: typeof binding("containerPaddingTop").value === "string" ? (binding("containerPaddingTop").value as string) : undefined,
                      right: typeof binding("containerPaddingRight").value === "string" ? (binding("containerPaddingRight").value as string) : undefined,
                      bottom: typeof binding("containerPaddingBottom").value === "string" ? (binding("containerPaddingBottom").value as string) : undefined,
                      left: typeof binding("containerPaddingLeft").value === "string" ? (binding("containerPaddingLeft").value as string) : undefined,
                    }}
                    onChange={(side, v) => binding(`containerPadding${side}`).onChange(v)}
                  />
                </div>
              )}
            </>
          )}
          {node.type === "TourInfoSection" && (
            <>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Eyebrow</h5>
                <TypographyField {...typographyBinding("eyebrow")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Heading</h5>
                <TypographyField {...typographyBinding("heading")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Description</h5>
                <TypographyField {...typographyBinding("description")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Fact Label</h5>
                <TypographyField {...typographyBinding("factLabel")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Fact Value</h5>
                <TypographyField {...typographyBinding("factValue")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Primary Button</h5>
                <TypographyField {...typographyBinding("primaryCta")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Secondary Button</h5>
                <TypographyField {...typographyBinding("secondaryCta")} />
              </div>
              {styleFields.some((f) => f.key === "sectionPaddingTop") && (
                <div className="mt-2 border-t border-zinc-800 pt-3">
                  <FourSideField
                    label="Section Padding"
                    values={{
                      top: typeof binding("sectionPaddingTop").value === "string" ? (binding("sectionPaddingTop").value as string) : undefined,
                      right: typeof binding("sectionPaddingRight").value === "string" ? (binding("sectionPaddingRight").value as string) : undefined,
                      bottom: typeof binding("sectionPaddingBottom").value === "string" ? (binding("sectionPaddingBottom").value as string) : undefined,
                      left: typeof binding("sectionPaddingLeft").value === "string" ? (binding("sectionPaddingLeft").value as string) : undefined,
                    }}
                    onChange={(side, v) => binding(`sectionPadding${side}`).onChange(v)}
                  />
                </div>
              )}
            </>
          )}
          {node.type === "Checklist" && (
            <>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Eyebrow</h5>
                <TypographyField {...typographyBinding("eyebrow")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Title</h5>
                <TypographyField {...typographyBinding("title")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Column Pill</h5>
                <TypographyField {...typographyBinding("pill")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Item Text</h5>
                <TypographyField {...typographyBinding("item")} />
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Button</h5>
                <TypographyField {...typographyBinding("cta")} />
              </div>
              {styleFields.some((f) => f.key === "containerPaddingTop") && (
                <div className="mt-2 border-t border-zinc-800 pt-3">
                  <FourSideField
                    label="Container Padding"
                    values={{
                      top: typeof binding("containerPaddingTop").value === "string" ? (binding("containerPaddingTop").value as string) : undefined,
                      right: typeof binding("containerPaddingRight").value === "string" ? (binding("containerPaddingRight").value as string) : undefined,
                      bottom: typeof binding("containerPaddingBottom").value === "string" ? (binding("containerPaddingBottom").value as string) : undefined,
                      left: typeof binding("containerPaddingLeft").value === "string" ? (binding("containerPaddingLeft").value as string) : undefined,
                    }}
                    onChange={(side, v) => binding(`containerPadding${side}`).onChange(v)}
                  />
                </div>
              )}
            </>
          )}
          {node.type === "TextUnfold" && (
            <>
              {(["imageBoxShadow", "contentBoxShadow"] as const).map(
                (key) =>
                  styleFields.some((f) => f.key === key) && (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-zinc-400">{key === "imageBoxShadow" ? "Image Box Shadow" : "Content Box Shadow"}</label>
                      <BoxShadowField value={typeof binding(key).value === "string" ? (binding(key).value as string) : ""} onChange={(v) => binding(key).onChange(v)} />
                    </div>
                  )
              )}
              {(
                [
                  ["imageBorderRadius", "Image Border Radius"],
                  ["imagePadding", "Image Padding"],
                  ["imageMargin", "Image Margin"],
                  ["titlePadding", "Title Padding"],
                  ["titleMargin", "Title Margin"],
                  ["contentBorderRadius", "Content Border Radius"],
                  ["contentPadding", "Content Padding"],
                  ["contentMargin", "Content Margin"],
                  ["readMoreBorderRadius", "Read More Border Radius"],
                  ["readMorePadding", "Read More Padding"],
                  ["readMoreMargin", "Read More Margin"],
                ] as const
              ).map(
                ([prefix, label]) =>
                  styleFields.some((f) => f.key === `${prefix}Top`) && (
                    <FourSideField
                      key={prefix}
                      label={label}
                      values={{
                        top: typeof binding(`${prefix}Top`).value === "string" ? (binding(`${prefix}Top`).value as string) : undefined,
                        right: typeof binding(`${prefix}Right`).value === "string" ? (binding(`${prefix}Right`).value as string) : undefined,
                        bottom: typeof binding(`${prefix}Bottom`).value === "string" ? (binding(`${prefix}Bottom`).value as string) : undefined,
                        left: typeof binding(`${prefix}Left`).value === "string" ? (binding(`${prefix}Left`).value as string) : undefined,
                      }}
                      onChange={(side, v) => binding(`${prefix}${side}`).onChange(v)}
                    />
                  )
              )}
              {styleFields.some((f) => f.key === "readMoreFontFamily") && (
                <div className="mt-2 border-t border-zinc-800 pt-3">
                  <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Read More Button</h5>
                  <TypographyField {...typographyBinding("readMore")} />
                  <BorderWidthField
                    key={`${node.id}-readMoreBorderWidth`}
                    label="Border Width"
                    flatValue={typeof binding("readMoreBorderWidth").value === "string" ? (binding("readMoreBorderWidth").value as string) : ""}
                    onFlatChange={(v) => binding("readMoreBorderWidth").onChange(v)}
                    values={{
                      top: typeof binding("readMoreBorderWidthTop").value === "string" ? (binding("readMoreBorderWidthTop").value as string) : undefined,
                      right: typeof binding("readMoreBorderWidthRight").value === "string" ? (binding("readMoreBorderWidthRight").value as string) : undefined,
                      bottom: typeof binding("readMoreBorderWidthBottom").value === "string" ? (binding("readMoreBorderWidthBottom").value as string) : undefined,
                      left: typeof binding("readMoreBorderWidthLeft").value === "string" ? (binding("readMoreBorderWidthLeft").value as string) : undefined,
                    }}
                    onChange={(side, v) => binding(`readMoreBorderWidth${side}`).onChange(v)}
                  />
                </div>
              )}
            </>
          )}
          {node.type === "Form" && (
            <>
              {(
                [
                  ["fieldBorderWidth", "Field Border Width"],
                  ["fieldBorderRadius", "Field Border Radius"],
                  ["buttonBorderRadius", "Button Border Radius"],
                  ["buttonPadding", "Button Text Padding"],
                ] as const
              ).map(
                ([prefix, label]) =>
                  styleFields.some((f) => f.key === `${prefix}Top`) && (
                    <FourSideField
                      key={prefix}
                      label={label}
                      values={{
                        top: typeof binding(`${prefix}Top`).value === "string" ? (binding(`${prefix}Top`).value as string) : undefined,
                        right: typeof binding(`${prefix}Right`).value === "string" ? (binding(`${prefix}Right`).value as string) : undefined,
                        bottom: typeof binding(`${prefix}Bottom`).value === "string" ? (binding(`${prefix}Bottom`).value as string) : undefined,
                        left: typeof binding(`${prefix}Left`).value === "string" ? (binding(`${prefix}Left`).value as string) : undefined,
                      }}
                      onChange={(side, v) => binding(`${prefix}${side}`).onChange(v)}
                    />
                  )
              )}
              {(
                [
                  ["label", "Label"],
                  ["htmlField", "HTML Field"],
                  ["field", "Field"],
                  ["button", "Button"],
                  ["messages", "Messages"],
                ] as const
              ).map(
                ([prefix, label]) =>
                  styleFields.some((f) => f.key === `${prefix}FontFamily`) && (
                    <div key={prefix} className="mt-2 border-t border-zinc-800 pt-3">
                      <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</h5>
                      <TypographyField {...typographyBinding(prefix)} />
                    </div>
                  )
              )}
            </>
          )}
          {node.type === "NavMenu" && (
            <>
              <StyleSectionHeader label="Menu" />
              <SegmentedField
                label="Alignment (Desktop Row)"
                value={typeof binding("alignment").value === "string" ? (binding("alignment").value as string) : "start"}
                onChange={(v) => binding("alignment").onChange(v)}
                options={NAV_MENU_ALIGNMENT_VALUES}
              />
              <SegmentedField
                label="Alignment (Mobile Flyout)"
                value={typeof binding("mobileAlignment").value === "string" ? (binding("mobileAlignment").value as string) : "end"}
                onChange={(v) => binding("mobileAlignment").onChange(v)}
                options={NAV_MENU_ALIGNMENT_VALUES}
              />
              <LengthField label="Horizontal Padding" value={typeof binding("horizontalPadding").value === "string" ? (binding("horizontalPadding").value as string) : ""} onChange={(v) => binding("horizontalPadding").onChange(v)} {...LENGTH_FIELD_RANGES.horizontalPadding} />
              <LengthField label="Vertical Padding" value={typeof binding("verticalPadding").value === "string" ? (binding("verticalPadding").value as string) : ""} onChange={(v) => binding("verticalPadding").onChange(v)} {...LENGTH_FIELD_RANGES.verticalPadding} />
              <LengthField label="Item Spacing" value={typeof binding("itemSpacing").value === "string" ? (binding("itemSpacing").value as string) : ""} onChange={(v) => binding("itemSpacing").onChange(v)} {...LENGTH_FIELD_RANGES.itemSpacing} />
              <LengthField label="Row Spacing" value={typeof binding("rowSpacing").value === "string" ? (binding("rowSpacing").value as string) : ""} onChange={(v) => binding("rowSpacing").onChange(v)} {...LENGTH_FIELD_RANGES.rowSpacing} />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Link Hover Effect</label>
                <select
                  value={typeof node.props.linkHoverEffect === "string" ? node.props.linkHoverEffect : "none"}
                  onChange={(e) => onChangeProps({ linkHoverEffect: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  {NAV_MENU_HOVER_EFFECT_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <ColorField label="Menu Text Color" value={typeof binding("menuTextColor").value === "string" ? (binding("menuTextColor").value as string) : ""} onChange={(v) => binding("menuTextColor").onChange(v)} />
              <ColorField label="Menu Hover Text Color" value={typeof binding("menuHoverTextColor").value === "string" ? (binding("menuHoverTextColor").value as string) : ""} onChange={(v) => binding("menuHoverTextColor").onChange(v)} />
              <ColorField label="Menu Active Text Color" value={typeof binding("menuActiveTextColor").value === "string" ? (binding("menuActiveTextColor").value as string) : ""} onChange={(v) => binding("menuActiveTextColor").onChange(v)} />
              <ColorField label="Menu Background" value={typeof binding("menuBackground").value === "string" ? (binding("menuBackground").value as string) : ""} onChange={(v) => binding("menuBackground").onChange(v)} />
              <ColorField label="Menu Hover Background" value={typeof binding("menuHoverBackground").value === "string" ? (binding("menuHoverBackground").value as string) : ""} onChange={(v) => binding("menuHoverBackground").onChange(v)} />
              <ColorField label="Menu Active Background" value={typeof binding("menuActiveBackground").value === "string" ? (binding("menuActiveBackground").value as string) : ""} onChange={(v) => binding("menuActiveBackground").onChange(v)} />
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Menu Item Typography</h5>
                <TypographyField {...typographyBinding("menu")} />
              </div>

              <StyleSectionHeader label="Dropdown (Sub Items)" />
              <LengthField label="Dropdown Item Gap" value={typeof binding("dropdownItemGap").value === "string" ? (binding("dropdownItemGap").value as string) : ""} onChange={(v) => binding("dropdownItemGap").onChange(v)} {...LENGTH_FIELD_RANGES.dropdownItemGap} />
              <ColorField label="Dropdown Text Color" value={typeof binding("dropdownTextColor").value === "string" ? (binding("dropdownTextColor").value as string) : ""} onChange={(v) => binding("dropdownTextColor").onChange(v)} />
              <ColorField label="Dropdown Hover Text Color" value={typeof binding("dropdownHoverTextColor").value === "string" ? (binding("dropdownHoverTextColor").value as string) : ""} onChange={(v) => binding("dropdownHoverTextColor").onChange(v)} />
              <ColorField label="Dropdown Background" value={typeof binding("dropdownBackground").value === "string" ? (binding("dropdownBackground").value as string) : ""} onChange={(v) => binding("dropdownBackground").onChange(v)} />
              <ColorField label="Dropdown Hover Background" value={typeof binding("dropdownHoverBackground").value === "string" ? (binding("dropdownHoverBackground").value as string) : ""} onChange={(v) => binding("dropdownHoverBackground").onChange(v)} />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Dropdown Border Style</label>
                <select
                  value={typeof binding("dropdownBorderStyle").value === "string" ? (binding("dropdownBorderStyle").value as string) : "none"}
                  onChange={(e) => binding("dropdownBorderStyle").onChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  {BORDER_STYLE_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <BorderWidthField
                key={`${node.id}-dropdownBorderWidth`}
                label="Dropdown Border Width"
                flatValue={typeof binding("dropdownBorderWidth").value === "string" ? (binding("dropdownBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("dropdownBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("dropdownBorderWidthTop").value === "string" ? (binding("dropdownBorderWidthTop").value as string) : undefined,
                  right: typeof binding("dropdownBorderWidthRight").value === "string" ? (binding("dropdownBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("dropdownBorderWidthBottom").value === "string" ? (binding("dropdownBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("dropdownBorderWidthLeft").value === "string" ? (binding("dropdownBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`dropdownBorderWidth${side}`).onChange(v)}
              />
              <ColorField label="Dropdown Border Color" value={typeof binding("dropdownBorderColor").value === "string" ? (binding("dropdownBorderColor").value as string) : ""} onChange={(v) => binding("dropdownBorderColor").onChange(v)} />
              <FourSideField
                label="Dropdown Border Radius"
                values={{
                  top: typeof binding("dropdownBorderRadiusTop").value === "string" ? (binding("dropdownBorderRadiusTop").value as string) : undefined,
                  right: typeof binding("dropdownBorderRadiusRight").value === "string" ? (binding("dropdownBorderRadiusRight").value as string) : undefined,
                  bottom: typeof binding("dropdownBorderRadiusBottom").value === "string" ? (binding("dropdownBorderRadiusBottom").value as string) : undefined,
                  left: typeof binding("dropdownBorderRadiusLeft").value === "string" ? (binding("dropdownBorderRadiusLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`dropdownBorderRadius${side}`).onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Dropdown Box Shadow</label>
                <BoxShadowField value={typeof binding("dropdownBoxShadow").value === "string" ? (binding("dropdownBoxShadow").value as string) : ""} onChange={(v) => binding("dropdownBoxShadow").onChange(v)} />
              </div>
              <LengthField label="Dropdown Width" value={typeof binding("dropdownWidth").value === "string" ? (binding("dropdownWidth").value as string) : ""} onChange={(v) => binding("dropdownWidth").onChange(v)} {...LENGTH_FIELD_RANGES.dropdownWidth} />
              <LengthField label="Dropdown Padding H" value={typeof binding("dropdownPaddingH").value === "string" ? (binding("dropdownPaddingH").value as string) : ""} onChange={(v) => binding("dropdownPaddingH").onChange(v)} {...LENGTH_FIELD_RANGES.dropdownPaddingH} />
              <LengthField label="Dropdown Padding V" value={typeof binding("dropdownPaddingV").value === "string" ? (binding("dropdownPaddingV").value as string) : ""} onChange={(v) => binding("dropdownPaddingV").onChange(v)} {...LENGTH_FIELD_RANGES.dropdownPaddingV} />
              <LengthField label="Dropdown Top Distance" value={typeof binding("dropdownTopDistance").value === "string" ? (binding("dropdownTopDistance").value as string) : ""} onChange={(v) => binding("dropdownTopDistance").onChange(v)} {...LENGTH_FIELD_RANGES.dropdownTopDistance} />
              <div className="mt-2 border-t border-zinc-800 pt-3">
                <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Dropdown Item Typography</h5>
                <TypographyField {...typographyBinding("dropdown")} />
              </div>

              <StyleSectionHeader label="Trigger (Mobile Hamburger)" />
              <ColorField label="Trigger Color" value={typeof binding("triggerColor").value === "string" ? (binding("triggerColor").value as string) : ""} onChange={(v) => binding("triggerColor").onChange(v)} />
              <ColorField label="Trigger Hover Color" value={typeof binding("triggerHoverColor").value === "string" ? (binding("triggerHoverColor").value as string) : ""} onChange={(v) => binding("triggerHoverColor").onChange(v)} />
              <ColorField label="Trigger Background" value={typeof binding("triggerBackground").value === "string" ? (binding("triggerBackground").value as string) : ""} onChange={(v) => binding("triggerBackground").onChange(v)} />
              <ColorField label="Trigger Hover Background" value={typeof binding("triggerHoverBackground").value === "string" ? (binding("triggerHoverBackground").value as string) : ""} onChange={(v) => binding("triggerHoverBackground").onChange(v)} />
              <LengthField label="Trigger Icon Size" value={typeof binding("triggerIconSize").value === "string" ? (binding("triggerIconSize").value as string) : ""} onChange={(v) => binding("triggerIconSize").onChange(v)} {...LENGTH_FIELD_RANGES.triggerIconSize} />
              <BorderWidthField
                key={`${node.id}-navTriggerBorderWidth`}
                label="Trigger Border Width"
                flatValue={typeof binding("triggerBorderWidth").value === "string" ? (binding("triggerBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("triggerBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("triggerBorderWidthTop").value === "string" ? (binding("triggerBorderWidthTop").value as string) : undefined,
                  right: typeof binding("triggerBorderWidthRight").value === "string" ? (binding("triggerBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("triggerBorderWidthBottom").value === "string" ? (binding("triggerBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("triggerBorderWidthLeft").value === "string" ? (binding("triggerBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`triggerBorderWidth${side}`).onChange(v)}
              />
              <LengthField label="Trigger Border Radius" value={typeof binding("triggerBorderRadius").value === "string" ? (binding("triggerBorderRadius").value as string) : ""} onChange={(v) => binding("triggerBorderRadius").onChange(v)} {...LENGTH_FIELD_RANGES.triggerBorderRadius} />
              <ColorField label="Flyout Background" value={typeof binding("flyoutBackground").value === "string" ? (binding("flyoutBackground").value as string) : ""} onChange={(v) => binding("flyoutBackground").onChange(v)} />
              <ColorField
                label="Mobile Menu Background"
                value={typeof binding("mobileMenuBackground").value === "string" ? (binding("mobileMenuBackground").value as string) : ""}
                onChange={(v) => binding("mobileMenuBackground").onChange(v)}
              />
            </>
          )}
          {node.type === "IconList" && (
            <>
              <StyleSectionHeader label="List" />
              <LengthField label="Space Between" value={typeof binding("listGap").value === "string" ? (binding("listGap").value as string) : ""} onChange={(v) => binding("listGap").onChange(v)} {...LENGTH_FIELD_RANGES.listGap} />
              <SegmentedField
                label="Alignment"
                value={typeof binding("listAlign").value === "string" ? (binding("listAlign").value as string) : "flex-start"}
                onChange={(v) => binding("listAlign").onChange(v)}
                options={ICON_LIST_ALIGN_VALUES}
              />
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={Boolean(node.props.dividerEnabled)}
                  onChange={(e) => onChangeProps({ dividerEnabled: e.target.checked })}
                />
                Divider
              </label>
              {Boolean(node.props.dividerEnabled) && (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Divider Style</label>
                    <select
                      value={typeof binding("dividerStyle").value === "string" ? (binding("dividerStyle").value as string) : "solid"}
                      onChange={(e) => binding("dividerStyle").onChange(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                    >
                      {DIVIDER_STYLE_VALUES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <LengthField label="Weight" value={typeof binding("dividerThickness").value === "string" ? (binding("dividerThickness").value as string) : ""} onChange={(v) => binding("dividerThickness").onChange(v)} {...LENGTH_FIELD_RANGES.dividerThickness} />
                  <LengthField label="Width" value={typeof binding("dividerWidth").value === "string" ? (binding("dividerWidth").value as string) : ""} onChange={(v) => binding("dividerWidth").onChange(v)} {...LENGTH_FIELD_RANGES.dividerWidth} />
                  <ColorField label="Divider Color" value={typeof binding("dividerColor").value === "string" ? (binding("dividerColor").value as string) : ""} onChange={(v) => binding("dividerColor").onChange(v)} />
                </>
              )}

              <StyleSectionHeader label="Icon" />
              <NormalHoverColorField
                label="Color"
                normalValue={typeof binding("iconColor").value === "string" ? (binding("iconColor").value as string) : ""}
                onNormalChange={(v) => binding("iconColor").onChange(v)}
                hoverValue={typeof binding("iconHoverColor").value === "string" ? (binding("iconHoverColor").value as string) : ""}
                onHoverChange={(v) => binding("iconHoverColor").onChange(v)}
              />
              <LengthField label="Size" value={typeof binding("iconSize").value === "string" ? (binding("iconSize").value as string) : ""} onChange={(v) => binding("iconSize").onChange(v)} {...LENGTH_FIELD_RANGES.iconSize} />
              <LengthField label="Gap" value={typeof binding("iconGap").value === "string" ? (binding("iconGap").value as string) : ""} onChange={(v) => binding("iconGap").onChange(v)} {...LENGTH_FIELD_RANGES.iconGap} />
              <SegmentedField
                label="Horizontal Alignment"
                value={typeof binding("iconHorizontalAlign").value === "string" ? (binding("iconHorizontalAlign").value as string) : "center"}
                onChange={(v) => binding("iconHorizontalAlign").onChange(v)}
                options={ICON_LIST_ALIGN_VALUES}
              />
              <SegmentedField
                label="Vertical Alignment"
                value={typeof binding("iconVerticalAlign").value === "string" ? (binding("iconVerticalAlign").value as string) : "center"}
                onChange={(v) => binding("iconVerticalAlign").onChange(v)}
                options={ICON_LIST_ALIGN_VALUES}
                orientation="vertical"
              />
              <LengthField
                label="Adjust Vertical Position"
                value={typeof binding("iconVerticalOffset").value === "string" ? (binding("iconVerticalOffset").value as string) : ""}
                onChange={(v) => binding("iconVerticalOffset").onChange(v)}
                {...LENGTH_FIELD_RANGES.iconVerticalOffset}
              />

              <StyleSectionHeader label="Text" />
              <TypographyField {...typographyBinding("text")} />
              <StyleField label="Text Shadow" value={typeof binding("textShadow").value === "string" ? (binding("textShadow").value as string) : ""} onChange={(v) => binding("textShadow").onChange(v)} />
              <NormalHoverColorField
                label="Color"
                normalValue={typeof binding("textColor").value === "string" ? (binding("textColor").value as string) : ""}
                onNormalChange={(v) => binding("textColor").onChange(v)}
                hoverValue={typeof binding("textHoverColor").value === "string" ? (binding("textHoverColor").value as string) : ""}
                onHoverChange={(v) => binding("textHoverColor").onChange(v)}
              />
            </>
          )}
          {(node.type === "ServiceCard" ||
            node.type === "Services" ||
            node.type === "ProcessSteps" ||
            node.type === "AccordionItem" ||
            node.type === "Testimonial" ||
            node.type === "FlipBox" ||
            node.type === "PriceTable" ||
            node.type === "GlowingCard" ||
            node.type === "InfoBox" ||
            node.type === "TeamMember" ||
            node.type === "Blockquote" ||
            node.type === "TrustHighlights" ||
            node.type === "PillLinks" ||
            node.type === "Faq") && (
            <>
              {styleFields.some((f) => f.key === "cardPaddingTop") && (
                <FourSideField
                  label="Card Content Padding"
                  values={{
                    top: typeof binding("cardPaddingTop").value === "string" ? (binding("cardPaddingTop").value as string) : undefined,
                    right: typeof binding("cardPaddingRight").value === "string" ? (binding("cardPaddingRight").value as string) : undefined,
                    bottom: typeof binding("cardPaddingBottom").value === "string" ? (binding("cardPaddingBottom").value as string) : undefined,
                    left: typeof binding("cardPaddingLeft").value === "string" ? (binding("cardPaddingLeft").value as string) : undefined,
                  }}
                  onChange={(side, v) => binding(`cardPadding${side}`).onChange(v)}
                />
              )}
              {styleFields.some((f) => f.key === "cardBorderWidth") && (
                <BorderWidthField
                  key={`${node.id}-cardBorderWidth`}
                  label="Card Border Width"
                  flatValue={typeof binding("cardBorderWidth").value === "string" ? (binding("cardBorderWidth").value as string) : ""}
                  onFlatChange={(v) => binding("cardBorderWidth").onChange(v)}
                  values={{
                    top: typeof binding("cardBorderWidthTop").value === "string" ? (binding("cardBorderWidthTop").value as string) : undefined,
                    right: typeof binding("cardBorderWidthRight").value === "string" ? (binding("cardBorderWidthRight").value as string) : undefined,
                    bottom: typeof binding("cardBorderWidthBottom").value === "string" ? (binding("cardBorderWidthBottom").value as string) : undefined,
                    left: typeof binding("cardBorderWidthLeft").value === "string" ? (binding("cardBorderWidthLeft").value as string) : undefined,
                  }}
                  onChange={(side, v) => binding(`cardBorderWidth${side}`).onChange(v)}
                />
              )}
              {styleFields.some((f) => f.key === "cardBoxShadow") && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Card Box Shadow</label>
                  <BoxShadowField value={typeof binding("cardBoxShadow").value === "string" ? (binding("cardBoxShadow").value as string) : ""} onChange={(v) => binding("cardBoxShadow").onChange(v)} />
                </div>
              )}
            </>
          )}

          {node.type === "Form" && (
            <>
              <StyleSectionHeader label="Container" />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Box Shadow</label>
                <BoxShadowField value={typeof binding("formBoxShadow").value === "string" ? (binding("formBoxShadow").value as string) : ""} onChange={(v) => binding("formBoxShadow").onChange(v)} />
              </div>

              <StyleSectionHeader label="Label" />
              <TypographyField {...typographyBinding("label")} />

              <StyleSectionHeader label="HTML Field" />
              <TypographyField {...typographyBinding("htmlField")} />

              <StyleSectionHeader label="Field" />
              <TypographyField {...typographyBinding("field")} />
              <FourSideField
                label="Field Border Width"
                values={{
                  top: typeof binding("fieldBorderWidthTop").value === "string" ? (binding("fieldBorderWidthTop").value as string) : undefined,
                  right: typeof binding("fieldBorderWidthRight").value === "string" ? (binding("fieldBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("fieldBorderWidthBottom").value === "string" ? (binding("fieldBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("fieldBorderWidthLeft").value === "string" ? (binding("fieldBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`fieldBorderWidth${side}`).onChange(v)}
              />
              <FourSideField
                label="Field Border Radius"
                values={{
                  top: typeof binding("fieldBorderRadiusTop").value === "string" ? (binding("fieldBorderRadiusTop").value as string) : undefined,
                  right: typeof binding("fieldBorderRadiusRight").value === "string" ? (binding("fieldBorderRadiusRight").value as string) : undefined,
                  bottom: typeof binding("fieldBorderRadiusBottom").value === "string" ? (binding("fieldBorderRadiusBottom").value as string) : undefined,
                  left: typeof binding("fieldBorderRadiusLeft").value === "string" ? (binding("fieldBorderRadiusLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`fieldBorderRadius${side}`).onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Field Box Shadow</label>
                <BoxShadowField value={typeof binding("fieldBoxShadow").value === "string" ? (binding("fieldBoxShadow").value as string) : ""} onChange={(v) => binding("fieldBoxShadow").onChange(v)} />
              </div>

              <StyleSectionHeader label="Submit Button" />
              <TypographyField {...typographyBinding("button")} />
              <FourSideField
                label="Button Padding"
                values={{
                  top: typeof binding("buttonPaddingTop").value === "string" ? (binding("buttonPaddingTop").value as string) : undefined,
                  right: typeof binding("buttonPaddingRight").value === "string" ? (binding("buttonPaddingRight").value as string) : undefined,
                  bottom: typeof binding("buttonPaddingBottom").value === "string" ? (binding("buttonPaddingBottom").value as string) : undefined,
                  left: typeof binding("buttonPaddingLeft").value === "string" ? (binding("buttonPaddingLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`buttonPadding${side}`).onChange(v)}
              />
              <BorderWidthField
                key={`${node.id}-formButtonBorderWidth`}
                label="Button Border Width"
                flatValue={typeof binding("buttonBorderWidth").value === "string" ? (binding("buttonBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("buttonBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("buttonBorderWidthTop").value === "string" ? (binding("buttonBorderWidthTop").value as string) : undefined,
                  right: typeof binding("buttonBorderWidthRight").value === "string" ? (binding("buttonBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("buttonBorderWidthBottom").value === "string" ? (binding("buttonBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("buttonBorderWidthLeft").value === "string" ? (binding("buttonBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`buttonBorderWidth${side}`).onChange(v)}
              />
              <FourSideField
                label="Button Border Radius"
                values={{
                  top: typeof binding("buttonBorderRadiusTop").value === "string" ? (binding("buttonBorderRadiusTop").value as string) : undefined,
                  right: typeof binding("buttonBorderRadiusRight").value === "string" ? (binding("buttonBorderRadiusRight").value as string) : undefined,
                  bottom: typeof binding("buttonBorderRadiusBottom").value === "string" ? (binding("buttonBorderRadiusBottom").value as string) : undefined,
                  left: typeof binding("buttonBorderRadiusLeft").value === "string" ? (binding("buttonBorderRadiusLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`buttonBorderRadius${side}`).onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Button Box Shadow</label>
                <BoxShadowField value={typeof binding("buttonBoxShadow").value === "string" ? (binding("buttonBoxShadow").value as string) : ""} onChange={(v) => binding("buttonBoxShadow").onChange(v)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Button Hover Box Shadow</label>
                <BoxShadowField value={typeof binding("buttonHoverBoxShadow").value === "string" ? (binding("buttonHoverBoxShadow").value as string) : ""} onChange={(v) => binding("buttonHoverBoxShadow").onChange(v)} />
              </div>

              <StyleSectionHeader label="Messages" />
              <TypographyField {...typographyBinding("messages")} />
            </>
          )}

          {node.type === "Counter" && (
            <>
              <StyleSectionHeader label="Value" />
              <TypographyField {...typographyBinding("value")} />
              <StyleSectionHeader label="Label" />
              <TypographyField {...typographyBinding("label")} />
              <StyleSectionHeader label="Container" />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Border Style</label>
                <select
                  value={typeof binding("counterBorderStyle").value === "string" ? (binding("counterBorderStyle").value as string) : "none"}
                  onChange={(e) => binding("counterBorderStyle").onChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  {["none", "solid", "dashed", "dotted", "double"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <BorderWidthField
                key={`${node.id}-counterBorderWidth`}
                label="Border Width"
                flatValue={typeof binding("counterBorderWidth").value === "string" ? (binding("counterBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("counterBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("counterBorderWidthTop").value === "string" ? (binding("counterBorderWidthTop").value as string) : undefined,
                  right: typeof binding("counterBorderWidthRight").value === "string" ? (binding("counterBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("counterBorderWidthBottom").value === "string" ? (binding("counterBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("counterBorderWidthLeft").value === "string" ? (binding("counterBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`counterBorderWidth${side}`).onChange(v)}
              />
              <StyleField label="Border Radius (e.g. 12px)" value={typeof binding("counterBorderRadius").value === "string" ? (binding("counterBorderRadius").value as string) : ""} onChange={(v) => binding("counterBorderRadius").onChange(v)} />
              <FourSideField
                label="Padding"
                values={{
                  top: typeof binding("counterPaddingTop").value === "string" ? (binding("counterPaddingTop").value as string) : undefined,
                  right: typeof binding("counterPaddingRight").value === "string" ? (binding("counterPaddingRight").value as string) : undefined,
                  bottom: typeof binding("counterPaddingBottom").value === "string" ? (binding("counterPaddingBottom").value as string) : undefined,
                  left: typeof binding("counterPaddingLeft").value === "string" ? (binding("counterPaddingLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`counterPadding${side}`).onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Box Shadow</label>
                <BoxShadowField value={typeof binding("counterBoxShadow").value === "string" ? (binding("counterBoxShadow").value as string) : ""} onChange={(v) => binding("counterBoxShadow").onChange(v)} />
              </div>
            </>
          )}

          {(node.type === "Testimonial" || node.type === "Blockquote") && (
            <>
              <StyleSectionHeader label="Quote" />
              <TypographyField {...typographyBinding("quote")} />
              <StyleSectionHeader label="Author Name" />
              <TypographyField {...typographyBinding("authorName")} />
            </>
          )}

          {node.type === "MultiButtons" && (
            <>
              <StyleSectionHeader label="Button" />
              <TypographyField {...typographyBinding("button")} />
              <FourSideField
                label="Button Padding"
                values={{
                  top: typeof binding("buttonPaddingTop").value === "string" ? (binding("buttonPaddingTop").value as string) : undefined,
                  right: typeof binding("buttonPaddingRight").value === "string" ? (binding("buttonPaddingRight").value as string) : undefined,
                  bottom: typeof binding("buttonPaddingBottom").value === "string" ? (binding("buttonPaddingBottom").value as string) : undefined,
                  left: typeof binding("buttonPaddingLeft").value === "string" ? (binding("buttonPaddingLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`buttonPadding${side}`).onChange(v)}
              />
              <FourSideField
                label="Button Margin"
                values={{
                  top: typeof binding("buttonMarginTop").value === "string" ? (binding("buttonMarginTop").value as string) : undefined,
                  right: typeof binding("buttonMarginRight").value === "string" ? (binding("buttonMarginRight").value as string) : undefined,
                  bottom: typeof binding("buttonMarginBottom").value === "string" ? (binding("buttonMarginBottom").value as string) : undefined,
                  left: typeof binding("buttonMarginLeft").value === "string" ? (binding("buttonMarginLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`buttonMargin${side}`).onChange(v)}
              />
              <BorderWidthField
                key={`${node.id}-priceButtonBorderWidth`}
                label="Button Border Width"
                flatValue={typeof binding("buttonBorderWidth").value === "string" ? (binding("buttonBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("buttonBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("buttonBorderWidthTop").value === "string" ? (binding("buttonBorderWidthTop").value as string) : undefined,
                  right: typeof binding("buttonBorderWidthRight").value === "string" ? (binding("buttonBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("buttonBorderWidthBottom").value === "string" ? (binding("buttonBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("buttonBorderWidthLeft").value === "string" ? (binding("buttonBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`buttonBorderWidth${side}`).onChange(v)}
              />
              <FourSideField
                label="Button Border Radius"
                values={{
                  top: typeof binding("buttonBorderRadiusTop").value === "string" ? (binding("buttonBorderRadiusTop").value as string) : undefined,
                  right: typeof binding("buttonBorderRadiusRight").value === "string" ? (binding("buttonBorderRadiusRight").value as string) : undefined,
                  bottom: typeof binding("buttonBorderRadiusBottom").value === "string" ? (binding("buttonBorderRadiusBottom").value as string) : undefined,
                  left: typeof binding("buttonBorderRadiusLeft").value === "string" ? (binding("buttonBorderRadiusLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`buttonBorderRadius${side}`).onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Button Box Shadow</label>
                <BoxShadowField value={typeof binding("buttonBoxShadow").value === "string" ? (binding("buttonBoxShadow").value as string) : ""} onChange={(v) => binding("buttonBoxShadow").onChange(v)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Button Hover Box Shadow</label>
                <BoxShadowField value={typeof binding("buttonHoverBoxShadow").value === "string" ? (binding("buttonHoverBoxShadow").value as string) : ""} onChange={(v) => binding("buttonHoverBoxShadow").onChange(v)} />
              </div>
            </>
          )}

          {node.type === "Tabs" && (
            <>
              <StyleSectionHeader label="Tab Trigger" />
              <TypographyField {...typographyBinding("tab")} />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Underline Style</label>
                <select
                  value={typeof binding("tabBorderStyle").value === "string" ? (binding("tabBorderStyle").value as string) : "solid"}
                  onChange={(e) => binding("tabBorderStyle").onChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  {["none", "solid", "dashed", "dotted"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <StyleField label="Underline Width (e.g. 2px)" value={typeof binding("tabBorderWidth").value === "string" ? (binding("tabBorderWidth").value as string) : ""} onChange={(v) => binding("tabBorderWidth").onChange(v)} />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Tab Box Shadow</label>
                <BoxShadowField value={typeof binding("tabBoxShadow").value === "string" ? (binding("tabBoxShadow").value as string) : ""} onChange={(v) => binding("tabBoxShadow").onChange(v)} />
              </div>
              <FourSideField
                label="Tab Padding"
                values={{
                  top: typeof binding("tabPaddingTop").value === "string" ? (binding("tabPaddingTop").value as string) : undefined,
                  right: typeof binding("tabPaddingRight").value === "string" ? (binding("tabPaddingRight").value as string) : undefined,
                  bottom: typeof binding("tabPaddingBottom").value === "string" ? (binding("tabPaddingBottom").value as string) : undefined,
                  left: typeof binding("tabPaddingLeft").value === "string" ? (binding("tabPaddingLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`tabPadding${side}`).onChange(v)}
              />
              <FourSideField
                label="Tab Border Radius"
                values={{
                  top: typeof binding("tabBorderRadiusTop").value === "string" ? (binding("tabBorderRadiusTop").value as string) : undefined,
                  right: typeof binding("tabBorderRadiusRight").value === "string" ? (binding("tabBorderRadiusRight").value as string) : undefined,
                  bottom: typeof binding("tabBorderRadiusBottom").value === "string" ? (binding("tabBorderRadiusBottom").value as string) : undefined,
                  left: typeof binding("tabBorderRadiusLeft").value === "string" ? (binding("tabBorderRadiusLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`tabBorderRadius${side}`).onChange(v)}
              />
              <StyleSectionHeader label="Content Panel" />
              <TypographyField {...typographyBinding("content")} />
              <FourSideField
                label="Content Padding"
                values={{
                  top: typeof binding("contentPaddingTop").value === "string" ? (binding("contentPaddingTop").value as string) : undefined,
                  right: typeof binding("contentPaddingRight").value === "string" ? (binding("contentPaddingRight").value as string) : undefined,
                  bottom: typeof binding("contentPaddingBottom").value === "string" ? (binding("contentPaddingBottom").value as string) : undefined,
                  left: typeof binding("contentPaddingLeft").value === "string" ? (binding("contentPaddingLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`contentPadding${side}`).onChange(v)}
              />
              <FourSideField
                label="Content Border Radius"
                values={{
                  top: typeof binding("contentBorderRadiusTop").value === "string" ? (binding("contentBorderRadiusTop").value as string) : undefined,
                  right: typeof binding("contentBorderRadiusRight").value === "string" ? (binding("contentBorderRadiusRight").value as string) : undefined,
                  bottom: typeof binding("contentBorderRadiusBottom").value === "string" ? (binding("contentBorderRadiusBottom").value as string) : undefined,
                  left: typeof binding("contentBorderRadiusLeft").value === "string" ? (binding("contentBorderRadiusLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`contentBorderRadius${side}`).onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Content Border Style</label>
                <select
                  value={typeof binding("contentBorderStyle").value === "string" ? (binding("contentBorderStyle").value as string) : "none"}
                  onChange={(e) => binding("contentBorderStyle").onChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  {["none", "solid", "dashed", "dotted"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <BorderWidthField
                key={`${node.id}-contentBorderWidth`}
                label="Content Border Width"
                flatValue={typeof binding("contentBorderWidth").value === "string" ? (binding("contentBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("contentBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("contentBorderWidthTop").value === "string" ? (binding("contentBorderWidthTop").value as string) : undefined,
                  right: typeof binding("contentBorderWidthRight").value === "string" ? (binding("contentBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("contentBorderWidthBottom").value === "string" ? (binding("contentBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("contentBorderWidthLeft").value === "string" ? (binding("contentBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`contentBorderWidth${side}`).onChange(v)}
              />
              <ColorField
                label="Content Border Color"
                value={typeof binding("contentBorderColor").value === "string" ? (binding("contentBorderColor").value as string) : ""}
                onChange={(v) => binding("contentBorderColor").onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Content Box Shadow</label>
                <BoxShadowField value={typeof binding("contentBoxShadow").value === "string" ? (binding("contentBoxShadow").value as string) : ""} onChange={(v) => binding("contentBoxShadow").onChange(v)} />
              </div>
            </>
          )}

          {node.type === "Columns" && (
            <>
              <StyleSectionHeader label="Container" />
              <NormalHoverColorField
                label="Background"
                normalValue={typeof binding("columnsBackground").value === "string" ? (binding("columnsBackground").value as string) : ""}
                onNormalChange={(v) => binding("columnsBackground").onChange(v)}
                hoverValue={typeof binding("columnsHoverBackground").value === "string" ? (binding("columnsHoverBackground").value as string) : ""}
                onHoverChange={(v) => binding("columnsHoverBackground").onChange(v)}
              />
              <UnitField
                label="Background Blur"
                value={typeof binding("columnsBackgroundBlur").value === "string" ? (binding("columnsBackgroundBlur").value as string) : ""}
                onChange={(v) => binding("columnsBackgroundBlur").onChange(v)}
                min={0}
                max={40}
                step={1}
                unit="px"
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Border Style</label>
                <select
                  value={typeof binding("columnsBorderStyle").value === "string" ? (binding("columnsBorderStyle").value as string) : "none"}
                  onChange={(e) => binding("columnsBorderStyle").onChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  {["none", "solid", "dashed", "dotted", "double"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <BorderWidthField
                key={`${node.id}-columnsBorderWidth`}
                label="Border Width"
                flatValue={typeof binding("columnsBorderWidth").value === "string" ? (binding("columnsBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("columnsBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("columnsBorderWidthTop").value === "string" ? (binding("columnsBorderWidthTop").value as string) : undefined,
                  right: typeof binding("columnsBorderWidthRight").value === "string" ? (binding("columnsBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("columnsBorderWidthBottom").value === "string" ? (binding("columnsBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("columnsBorderWidthLeft").value === "string" ? (binding("columnsBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`columnsBorderWidth${side}`).onChange(v)}
              />
              <NormalHoverColorField
                label="Border Color"
                normalValue={typeof binding("columnsBorderColor").value === "string" ? (binding("columnsBorderColor").value as string) : ""}
                onNormalChange={(v) => binding("columnsBorderColor").onChange(v)}
                hoverValue={typeof binding("columnsHoverBorderColor").value === "string" ? (binding("columnsHoverBorderColor").value as string) : ""}
                onHoverChange={(v) => binding("columnsHoverBorderColor").onChange(v)}
              />
              <StyleField label="Border Radius (e.g. 12px)" value={typeof binding("columnsBorderRadius").value === "string" ? (binding("columnsBorderRadius").value as string) : ""} onChange={(v) => binding("columnsBorderRadius").onChange(v)} />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Box Shadow</label>
                <BoxShadowField value={typeof binding("columnsBoxShadow").value === "string" ? (binding("columnsBoxShadow").value as string) : ""} onChange={(v) => binding("columnsBoxShadow").onChange(v)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Hover Box Shadow</label>
                <BoxShadowField value={typeof binding("columnsHoverBoxShadow").value === "string" ? (binding("columnsHoverBoxShadow").value as string) : ""} onChange={(v) => binding("columnsHoverBoxShadow").onChange(v)} />
              </div>
            </>
          )}

          {node.type === "PriceTable" && (
            <>
              <StyleSectionHeader label="CTA Button" />
              <TypographyField {...typographyBinding("cta")} />
            </>
          )}

          {(node.type === "ModalPopup" || node.type === "OffCanvas") && (
            <>
              <StyleSectionHeader label="Trigger" />
              <BorderWidthField
                key={`${node.id}-modalTriggerBorderWidth`}
                label="Trigger Border Width"
                flatValue={typeof binding("triggerBorderWidth").value === "string" ? (binding("triggerBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("triggerBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("triggerBorderWidthTop").value === "string" ? (binding("triggerBorderWidthTop").value as string) : undefined,
                  right: typeof binding("triggerBorderWidthRight").value === "string" ? (binding("triggerBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("triggerBorderWidthBottom").value === "string" ? (binding("triggerBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("triggerBorderWidthLeft").value === "string" ? (binding("triggerBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`triggerBorderWidth${side}`).onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Trigger Box Shadow</label>
                <BoxShadowField value={typeof binding("triggerBoxShadow").value === "string" ? (binding("triggerBoxShadow").value as string) : ""} onChange={(v) => binding("triggerBoxShadow").onChange(v)} />
              </div>
            </>
          )}

          {node.type === "ModalPopup" && (
            <>
              <StyleSectionHeader label="Modal Panel" />
              <BorderWidthField
                key={`${node.id}-modalBorderWidth`}
                label="Modal Border Width"
                flatValue={typeof binding("modalBorderWidth").value === "string" ? (binding("modalBorderWidth").value as string) : ""}
                onFlatChange={(v) => binding("modalBorderWidth").onChange(v)}
                values={{
                  top: typeof binding("modalBorderWidthTop").value === "string" ? (binding("modalBorderWidthTop").value as string) : undefined,
                  right: typeof binding("modalBorderWidthRight").value === "string" ? (binding("modalBorderWidthRight").value as string) : undefined,
                  bottom: typeof binding("modalBorderWidthBottom").value === "string" ? (binding("modalBorderWidthBottom").value as string) : undefined,
                  left: typeof binding("modalBorderWidthLeft").value === "string" ? (binding("modalBorderWidthLeft").value as string) : undefined,
                }}
                onChange={(side, v) => binding(`modalBorderWidth${side}`).onChange(v)}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Modal Box Shadow</label>
                <BoxShadowField value={typeof binding("modalBoxShadow").value === "string" ? (binding("modalBoxShadow").value as string) : ""} onChange={(v) => binding("modalBoxShadow").onChange(v)} />
              </div>
            </>
          )}

          {node.type === "OffCanvas" && (
            <>
              <StyleSectionHeader label="Panel" />
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Panel Box Shadow</label>
                <BoxShadowField value={typeof binding("panelBoxShadow").value === "string" ? (binding("panelBoxShadow").value as string) : ""} onChange={(v) => binding("panelBoxShadow").onChange(v)} />
              </div>
            </>
          )}

          {node.type === "SocialIcons" && (
            <BorderWidthField
              key={`${node.id}-iconBorderWidth`}
              label="Icon Border Width"
              flatValue={typeof binding("iconBorderWidth").value === "string" ? (binding("iconBorderWidth").value as string) : ""}
              onFlatChange={(v) => binding("iconBorderWidth").onChange(v)}
              values={{
                top: typeof binding("iconBorderWidthTop").value === "string" ? (binding("iconBorderWidthTop").value as string) : undefined,
                right: typeof binding("iconBorderWidthRight").value === "string" ? (binding("iconBorderWidthRight").value as string) : undefined,
                bottom: typeof binding("iconBorderWidthBottom").value === "string" ? (binding("iconBorderWidthBottom").value as string) : undefined,
                left: typeof binding("iconBorderWidthLeft").value === "string" ? (binding("iconBorderWidthLeft").value as string) : undefined,
              }}
              onChange={(side, v) => binding(`iconBorderWidth${side}`).onChange(v)}
            />
          )}
          </div>
          </AccordionSection>
          )}
        </div>
      )}

      {tab === "interactions" && (
        <InteractionsPanel
          animations={(node.timelines ?? []).map((t, i) => blockTimelineToAnimationConfig(String(i), t))}
          onChange={(animations) => onChangeAnimations(animations.map(animationConfigToBlockTimeline))}
          isContainer={Boolean(definition.isContainer)}
          isTextBlock={TEXT_BLOCK_TYPES.has(node.type)}
          blockType={node.type}
        />
      )}

      {tab === "advanced" && (
        <div className="flex flex-col gap-1">
          <AccordionSection title="Developer Attributes" icon={Code} defaultOpen={false}>
            <StyleField label="CSS ID" value={node.style?.htmlId} onChange={(v) => onChangeStyle({ htmlId: v })} />
            <StyleField label="CSS Classes" value={node.style?.htmlClasses} onChange={(v) => onChangeStyle({ htmlClasses: v })} />
          </AccordionSection>

          <AccordionSection title="Visibility & Custom CSS" icon={Eye} defaultOpen={false}>
            {(() => {
              const advancedFields = fields.filter((f) => ADVANCED_PROP_KEYS.has(f.key));
              if (advancedFields.length === 0) return null;
              return (
                <div className="mb-3 space-y-3">
                  <h5 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Additional Options</h5>
                  {advancedFields.map((field) => (
                    <PropField key={field.key} field={field} binding={binding(field.key)} />
                  ))}
                </div>
              );
            })()}

            <div>
              <h5 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Responsive Visibility</h5>
              <div className="space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2.5">
                <label className="flex items-center justify-between text-xs text-zinc-300">
                  Hide on Desktop
                  <input
                    type="checkbox"
                    checked={Boolean(node.style?.hideOnDesktop)}
                    onChange={(e) => onChangeStyle({ hideOnDesktop: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-zinc-300">
                  Hide on Tablet
                  <input
                    type="checkbox"
                    checked={Boolean(node.style?.hideOnTablet)}
                    onChange={(e) => onChangeStyle({ hideOnTablet: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-zinc-300">
                  Hide on Mobile
                  <input
                    type="checkbox"
                    checked={Boolean(node.style?.hideOnMobile)}
                    onChange={(e) => onChangeStyle({ hideOnMobile: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-0"
                  />
                </label>
              </div>
            </div>

            <div>
              <h5 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Custom CSS</h5>
              <p className="mb-2 text-[11px] text-zinc-500">
                Use <code className="text-amber-400">selector</code> to target this block, e.g.{" "}
                <code className="text-zinc-400">selector:hover {"{"} opacity: 0.8; {"}"}</code>
              </p>
              <textarea
                defaultValue={node.style?.customCss ?? ""}
                onBlur={(e) => onChangeStyle({ customCss: e.target.value })}
                rows={4}
                placeholder={"selector {\n  \n}"}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 px-3 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400/80 focus:outline-none"
              />
            </div>
          </AccordionSection>
        </div>
      )}

      {tab === "animation" && (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Target Element</span>
              <span className="rounded bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400">
                {node.type}
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-zinc-500 truncate">data-block-id=&quot;{node.id}&quot;</p>
          </div>

          <button
            type="button"
            onClick={() => onOpenTimelineDrawer?.(node.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-400 py-2.5 text-xs font-bold text-white hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/10 active:scale-[0.98]"
          >
            <span>🎬</span> Add / Focus in Timeline
          </button>

          <div className="border-t border-zinc-800 pt-3.5">
            <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Keyframe Summary Controls</h4>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">Duration (seconds)</label>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  max={10}
                  defaultValue={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">Delay (seconds)</label>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={5}
                  defaultValue={0}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">GSAP Easing Curve</label>
                <select className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200">
                  <option value="power2.inOut">power2.inOut (Smooth)</option>
                  <option value="none">linear (None)</option>
                  <option value="power1.out">power1.out (Soft Ease Out)</option>
                  <option value="power3.out">power3.out (Strong Ease Out)</option>
                  <option value="back.out(1.7)">back.out(1.7) (Overshoot / Elastic)</option>
                  <option value="bounce.out">bounce.out (Bounce Effect)</option>
                  <option value="elastic.out(1,0.3)">elastic.out (Spring)</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">Trigger Mode</label>
                <select className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200">
                  <option value="onMount">On Page Load (Timeline Auto Play)</option>
                  <option value="onScroll">While Scrolling Into View</option>
                  <option value="onHover">On Hover</option>
                  <option value="onClick">On Click</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TRIGGER_OPTIONS: { value: AnimationTrigger; label: string; scrollScrub?: boolean }[] = [
  { value: "onClick", label: "Mouse click (tap)" },
  { value: "onHover", label: "Mouse hover" },
  { value: "onMouseMove", label: "Mouse move over element" },
  { value: "onScroll", label: "Scroll into view", scrollScrub: false },
  { value: "onScroll", label: "While scrolling in view", scrollScrub: true },
  { value: "onNavbarOpen", label: "Navbar opens" },
  { value: "onDropdownOpen", label: "Dropdown opens" },
  { value: "onTabChange", label: "Tab change" },
  { value: "onSliderChange", label: "Slider change" },
  { value: "onMount", label: "Page load" },
];

// Gates which trigger options are enabled for a given block type — the four
// event-specific modes only fire on their matching block (see the doc note
// on ANIMATION_TRIGGER_VALUES). Every other trigger is universal. NOTE: the
// data/UI layer models these four modes fully, but the live GSAP engine
// (AnimatedBox.tsx) only currently fires onMount/onScroll/onHover/onClick/
// onMouseMove — wiring NavMenu/dropdown/Tabs/Slider components to actually
// dispatch onNavbarOpen/onDropdownOpen/onTabChange/onSliderChange is a
// follow-up, not yet built.
const ELEMENT_TRIGGER_GATES: Partial<Record<AnimationTrigger, (blockType: string) => boolean>> = {
  onNavbarOpen: (t) => t === "NavMenu",
  onDropdownOpen: (t) => t === "AccordionItem" || t === "IconAccordion" || t === "Tabs",
  onTabChange: (t) => t === "Tabs",
  onSliderChange: (t) => t === "Slider" || t === "CarouselContainer" || t === "FeaturedRoutesCarousel",
};
function isTriggerEnabledForBlock(trigger: AnimationTrigger, blockType: string): boolean {
  const gate = ELEMENT_TRIGGER_GATES[trigger];
  return !gate || gate(blockType);
}

const EASE_OPTIONS = ANIMATION_EASE_VALUES;

const LOOP_TRIGGERS = new Set<AnimationTrigger>(["onMount", "onHover", "onClick"]);
const STAGGER_TRIGGERS = new Set<AnimationTrigger>(["onMount", "onScroll"]);

function defaultAnimation(): NodeAnimationConfig {
  return {
    id: generateNodeId(),
    trigger: "onMount",
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0 },
    duration: 0.6,
    delay: 0,
    ease: "power2.out",
  };
}

/** One-click preset: a continuous, gently-looping scale pulse — the same shape as Loop (Repeat: -1, Yoyo) + Scale, just pre-filled so it doesn't need six fields set by hand. */
function pulseAnimation(): NodeAnimationConfig {
  return {
    id: generateNodeId(),
    trigger: "onMount",
    from: { scale: 0.95, boxShadow: "0px 0px 0px 0px rgba(37,99,255,0.5)" },
    to: { scale: 1, boxShadow: "0px 0px 0px 20px rgba(37,99,255,0)" },
    duration: 1.1,
    delay: 0,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  };
}

/** Built-in Appear/Disappear + Emphasis animation presets — one-click
 *  quick-fills for AnimationCard's Action dropdown, matching the reference
 *  spec's grouped list. Each preset only supplies the tween shape
 *  (from/to/duration/ease); trigger/delay/clickCount stay whatever the
 *  card's own controls already have set. */
const ANIMATION_PRESETS: Record<string, { label: string; group: "appear" | "emphasis"; build: () => Pick<NodeAnimationConfig, "from" | "to" | "duration" | "ease"> }> = {
  fade: { label: "Fade", group: "appear", build: () => ({ from: { opacity: 0 }, to: { opacity: 1 }, duration: 0.5, ease: "power2.out" }) },
  slide: { label: "Slide", group: "appear", build: () => ({ from: { opacity: 0, x: -40 }, to: { opacity: 1, x: 0 }, duration: 0.5, ease: "power2.out" }) },
  flip: { label: "Flip", group: "appear", build: () => ({ from: { opacity: 0, rotate: -15, scale: 0.9 }, to: { opacity: 1, rotate: 0, scale: 1 }, duration: 0.5, ease: "power2.out" }) },
  grow: { label: "Grow", group: "appear", build: () => ({ from: { opacity: 0, scale: 0.85 }, to: { opacity: 1, scale: 1 }, duration: 0.45, ease: "power2.out" }) },
  growBig: { label: "Grow big", group: "appear", build: () => ({ from: { opacity: 0, scale: 0.5 }, to: { opacity: 1, scale: 1 }, duration: 0.55, ease: "back.out" }) },
  shrink: { label: "Shrink", group: "appear", build: () => ({ from: { opacity: 0, scale: 1.15 }, to: { opacity: 1, scale: 1 }, duration: 0.45, ease: "power2.out" }) },
  shrinkBig: { label: "Shrink big", group: "appear", build: () => ({ from: { opacity: 0, scale: 1.6 }, to: { opacity: 1, scale: 1 }, duration: 0.55, ease: "power2.out" }) },
  spin: { label: "Spin", group: "appear", build: () => ({ from: { opacity: 0, rotate: -180, scale: 0.7 }, to: { opacity: 1, rotate: 0, scale: 1 }, duration: 0.6, ease: "power2.out" }) },
  fly: { label: "Fly", group: "appear", build: () => ({ from: { opacity: 0, y: -60, scale: 0.8 }, to: { opacity: 1, y: 0, scale: 1 }, duration: 0.55, ease: "back.out" }) },
  drop: { label: "Drop", group: "appear", build: () => ({ from: { opacity: 0, y: -30 }, to: { opacity: 1, y: 0 }, duration: 0.5, ease: "bounce.out" }) },
  pop: { label: "Pop", group: "emphasis", build: () => ({ from: { scale: 1 }, to: { scale: 1.08 }, duration: 0.2, ease: "power2.out" }) },
  jiggle: { label: "Jiggle", group: "emphasis", build: () => ({ from: { rotate: -3 }, to: { rotate: 3 }, duration: 0.12, ease: "sine.inOut" }) },
  pulse: { label: "Pulse", group: "emphasis", build: () => ({ from: { scale: 1 }, to: { scale: 1.06 }, duration: 0.3, ease: "sine.inOut" }) },
  blink: { label: "Blink", group: "emphasis", build: () => ({ from: { opacity: 1 }, to: { opacity: 0.3 }, duration: 0.15, ease: "power1.out" }) },
  bounce: { label: "Bounce", group: "emphasis", build: () => ({ from: { y: 0 }, to: { y: -12 }, duration: 0.25, ease: "power2.out" }) },
  flipLeftRight: { label: "Flip left to right", group: "emphasis", build: () => ({ from: { rotate: 0 }, to: { rotate: 180 }, duration: 0.4, ease: "power2.inOut" }) },
  flipRightLeft: { label: "Flip right to left", group: "emphasis", build: () => ({ from: { rotate: 0 }, to: { rotate: -180 }, duration: 0.4, ease: "power2.inOut" }) },
  rubberBand: { label: "Rubber band", group: "emphasis", build: () => ({ from: { scaleX: 1, scaleY: 1 }, to: { scaleX: 1.15, scaleY: 0.85 }, duration: 0.35, ease: "elastic.out" }) },
  jello: { label: "Jello", group: "emphasis", build: () => ({ from: { skewX: 0 }, to: { skewX: 8 }, duration: 0.35, ease: "elastic.out" }) },
};

function InteractionsPanel({
  animations,
  onChange,
  isContainer,
  isTextBlock,
  blockType,
}: {
  animations: NodeAnimationConfig[];
  onChange: (a: NodeAnimationConfig[]) => void;
  isContainer: boolean;
  isTextBlock: boolean;
  blockType: string;
}) {
  const { animations: timedAnimations, createAnimation: createTimedAnimation } = useTimedAnimations();

  function addElementTrigger() {
    onChange([...animations, { ...defaultAnimation(), trigger: "onClick" }]);
  }
  function addPageTrigger() {
    onChange([...animations, defaultAnimation()]);
  }
  function addPulse() {
    onChange([...animations, pulseAnimation()]);
  }
  function updateAnimation(id: string, patch: Partial<NodeAnimationConfig>) {
    onChange(animations.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function removeAnimation(id: string) {
    onChange(animations.filter((a) => a.id !== id));
  }

  const elementAnimations = animations.filter((a) => a.trigger !== "onMount");
  const pageAnimations = animations.filter((a) => a.trigger === "onMount");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h5 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Element trigger</h5>
          <button type="button" onClick={addElementTrigger} title="Add an element trigger" className="text-zinc-400 hover:text-amber-400">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {elementAnimations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-4 text-center text-[11px] text-zinc-500">
            Select a trigger (click, hover, scroll…) then click + above to animate this element when a user interacts with it.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {elementAnimations.map((anim) => (
              <AnimationCard
                key={anim.id}
                animation={anim}
                isContainer={isContainer}
                isTextBlock={isTextBlock}
                blockType={blockType}
                timedAnimations={timedAnimations}
                onCreateTimedAnimation={createTimedAnimation}
                onChange={(patch) => updateAnimation(anim.id, patch)}
                onRemove={() => removeAnimation(anim.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h5 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Page trigger</h5>
          <button type="button" onClick={addPageTrigger} title="Add a page trigger (fires on page load)" className="text-zinc-400 hover:text-amber-400">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {pageAnimations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-4 text-center text-[11px] text-zinc-500">
            Click + above to create an animation triggered by a change in the page&apos;s state (such as on load).
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pageAnimations.map((anim) => (
              <AnimationCard
                key={anim.id}
                animation={anim}
                isContainer={isContainer}
                isTextBlock={isTextBlock}
                blockType={blockType}
                timedAnimations={timedAnimations}
                onCreateTimedAnimation={createTimedAnimation}
                onChange={(patch) => updateAnimation(anim.id, patch)}
                onRemove={() => removeAnimation(anim.id)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={addPulse}
        title="Continuous scale pulse (Repeat: -1, Yoyo) — a one-click preset, still fully editable below"
        className="rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-amber-400 hover:text-amber-400"
      >
        + Add Pulse preset
      </button>

      <div className="border-t border-zinc-800/80 pt-2">
        <label className="mb-1 block text-[11px] text-zinc-500">Version</label>
        <select disabled value="classic" className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1.5 text-xs text-zinc-500">
          <option value="classic">Classic Interactions</option>
        </select>
      </div>
    </div>
  );
}

function AnimationCard({
  animation,
  isContainer,
  isTextBlock,
  blockType,
  timedAnimations,
  onCreateTimedAnimation,
  onChange,
  onRemove,
}: {
  animation: NodeAnimationConfig;
  isContainer: boolean;
  isTextBlock: boolean;
  blockType: string;
  timedAnimations: TimedAnimation[];
  onCreateTimedAnimation: (name: string) => Promise<TimedAnimation>;
  onChange: (patch: Partial<NodeAnimationConfig>) => void;
  onRemove: () => void;
}) {
  const [pickingTimeline, setPickingTimeline] = useState(false);
  const [timelineQuery, setTimelineQuery] = useState("");
  const selectedTimedAnimation = animation.timedAnimationId ? timedAnimations.find((t) => t.id === animation.timedAnimationId) : undefined;
  const actionValue = animation.timedAnimationId ? "__timed__" : "__custom__";
  const matches = timedAnimations.filter((t) => t.name.toLowerCase().includes(timelineQuery.toLowerCase()));

  function applyAction(value: string) {
    if (value === "__custom__") {
      onChange({ timedAnimationId: undefined });
      return;
    }
    if (value === "__timed__") {
      setPickingTimeline(true);
      return;
    }
    const preset = ANIMATION_PRESETS[value];
    if (preset) {
      onChange({ timedAnimationId: undefined, ...preset.build() });
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <select
          value={animation.trigger}
          onChange={(e) => onChange({ trigger: e.target.value as AnimationTrigger })}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
        >
          {TRIGGER_OPTIONS.map((opt, i) => (
            <option key={`${opt.value}-${i}`} value={opt.value} disabled={!isTriggerEnabledForBlock(opt.value, blockType)}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRemove} className="shrink-0 text-xs text-red-400 hover:text-red-300">
          ✕ Remove
        </button>
      </div>

      {animation.trigger === "onClick" && (
        <div className="mb-3 flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-[11px]">
          {[1, 2].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ clickCount: n as 1 | 2 })}
              className={`flex-1 rounded py-1 font-medium ${(animation.clickCount ?? 1) === n ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}
            >
              On {n === 1 ? "1st" : "2nd"} click
            </button>
          ))}
        </div>
      )}

      <div className="mb-3">
        <label className="mb-1 block text-[11px] text-zinc-500">Action</label>
        <select value={actionValue} onChange={(e) => applyAction(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none">
          <option value="__custom__">Custom (edit values below)</option>
          <optgroup label="Custom animation">
            <option value="__timed__">Start an animation…</option>
          </optgroup>
          <optgroup label="Appear & Disappear">
            {Object.entries(ANIMATION_PRESETS).filter(([, p]) => p.group === "appear").map(([id, p]) => (
              <option key={id} value={id}>{p.label}</option>
            ))}
          </optgroup>
          <optgroup label="Emphasis">
            {Object.entries(ANIMATION_PRESETS).filter(([, p]) => p.group === "emphasis").map(([id, p]) => (
              <option key={id} value={id}>{p.label}</option>
            ))}
          </optgroup>
        </select>
        {selectedTimedAnimation && (
          <p className="mt-1 text-[11px] text-amber-400">
            Starts shared animation &quot;{selectedTimedAnimation.name}&quot; — editing it updates every trigger that uses it.
          </p>
        )}
        {pickingTimeline && (
          <div className="mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900 p-2">
            <input
              autoFocus
              value={timelineQuery}
              onChange={(e) => setTimelineQuery(e.target.value)}
              placeholder="Search animations…"
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-100 focus:border-amber-400/80 focus:outline-none"
            />
            <div className="mt-1 max-h-32 overflow-y-auto">
              {matches.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange({ timedAnimationId: t.id });
                    setPickingTimeline(false);
                    setTimelineQuery("");
                  }}
                  className="block w-full rounded px-2 py-1 text-left font-mono text-[11px] text-zinc-300 hover:bg-zinc-800"
                >
                  {t.name}
                </button>
              ))}
              {timelineQuery.trim() && !matches.some((t) => t.name.toLowerCase() === timelineQuery.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={async () => {
                    const created = await onCreateTimedAnimation(timelineQuery.trim());
                    onChange({ timedAnimationId: created.id });
                    setPickingTimeline(false);
                    setTimelineQuery("");
                  }}
                  className="mt-1 block w-full rounded px-2 py-1 text-left text-[11px] text-amber-400 hover:bg-amber-400/10"
                >
                  + Create &quot;{timelineQuery.trim()}&quot;
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {!animation.timedAnimationId && <TweenGrid from={animation.from} to={animation.to} onChange={(from, to) => onChange({ from, to })} />}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Duration (s)</label>
          <input
            type="number"
            step={0.1}
            min={0}
            value={animation.duration}
            onChange={(e) => onChange({ duration: Number(e.target.value) })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Delay (s)</label>
          <input
            type="number"
            step={0.1}
            min={0}
            value={animation.delay}
            onChange={(e) => onChange({ delay: Number(e.target.value) })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-2">
        <label className="mb-1 block text-[11px] text-zinc-500">Easing</label>
        <select
          value={animation.ease}
          onChange={(e) => onChange({ ease: e.target.value as AnimationEase })}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
        >
          {EASE_OPTIONS.map((ease) => (
            <option key={ease} value={ease}>
              {ease}
            </option>
          ))}
        </select>
      </div>

      {LOOP_TRIGGERS.has(animation.trigger) && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Loop</h5>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">Repeat (-1 = infinite)</label>
              <input
                type="number"
                min={-1}
                step={1}
                value={animation.repeat ?? 0}
                onChange={(e) => onChange({ repeat: Number(e.target.value) })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">Repeat Delay (s)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={animation.repeatDelay ?? 0}
                onChange={(e) => onChange({ repeatDelay: Number(e.target.value) })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
          <label className="mt-2 flex items-center justify-between text-xs text-zinc-300">
            Yoyo (reverse on alternate repeats)
            <input type="checkbox" checked={Boolean(animation.yoyo)} onChange={(e) => onChange({ yoyo: e.target.checked })} />
          </label>
        </div>
      )}

      {isContainer && STAGGER_TRIGGERS.has(animation.trigger) && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <label className="flex items-center justify-between text-xs text-zinc-300">
            Stagger Children (animate each child individually)
            <input
              type="checkbox"
              checked={Boolean(animation.staggerChildren)}
              onChange={(e) => onChange({ staggerChildren: e.target.checked })}
            />
          </label>
          {animation.staggerChildren && (
            <div className="mt-2">
              <label className="mb-1 block text-[11px] text-zinc-500">Stagger Amount (s between each child)</label>
              <input
                type="number"
                min={0}
                step={0.05}
                value={animation.staggerAmount ?? 0.1}
                onChange={(e) => onChange({ staggerAmount: Number(e.target.value) })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {isTextBlock && STAGGER_TRIGGERS.has(animation.trigger) && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <label className="mb-1 block text-[11px] text-zinc-500">Split Text (reveal char-by-char, word-by-word, or line-by-line)</label>
          <select
            value={animation.splitText ?? "none"}
            onChange={(e) => onChange({ splitText: e.target.value as SplitTextMode })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
          >
            {SPLIT_TEXT_VALUES.map((mode) => (
              <option key={mode} value={mode}>
                {mode === "none" ? "Off (whole block at once)" : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>
          {animation.splitText && animation.splitText !== "none" && (
            <div className="mt-2">
              <label className="mb-1 block text-[11px] text-zinc-500">Stagger Amount (s between each {animation.splitText.slice(0, -1)})</label>
              <input
                type="number"
                min={0}
                step={0.02}
                value={animation.staggerAmount ?? 0.1}
                onChange={(e) => onChange({ staggerAmount: Number(e.target.value) })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {STAGGER_TRIGGERS.has(animation.trigger) && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <label className="mb-1 block text-[11px] text-zinc-500">Clip Reveal (mask wipe / iris, independent of Move/Scale)</label>
          <select
            value={animation.clipReveal ?? "none"}
            onChange={(e) => onChange({ clipReveal: e.target.value as ClipRevealDirection })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
          >
            {CLIP_REVEAL_VALUES.map((dir) => (
              <option key={dir} value={dir}>
                {dir === "none" ? "Off" : dir === "circle" ? "Circle Iris" : `Wipe ${dir.charAt(0).toUpperCase() + dir.slice(1)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {animation.trigger === "onScroll" && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <label className="flex items-center justify-between text-xs text-zinc-300">
            Scrub (tie directly to scrollbar position)
            <input
              type="checkbox"
              checked={Boolean(animation.scrollScrub)}
              onChange={(e) => onChange({ scrollScrub: e.target.checked })}
            />
          </label>
          <label className="mt-2 flex items-center justify-between text-xs text-zinc-300">
            Pin (hold element in place while its scroll range plays)
            <input type="checkbox" checked={Boolean(animation.scrollPin)} onChange={(e) => onChange({ scrollPin: e.target.checked })} />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">Start</label>
              <input
                type="text"
                value={animation.scrollStart ?? ""}
                onChange={(e) => onChange({ scrollStart: e.target.value })}
                placeholder="top 85%"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">End</label>
              <input
                type="text"
                value={animation.scrollEnd ?? ""}
                onChange={(e) => onChange({ scrollEnd: e.target.value })}
                placeholder="top 40%"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {animation.trigger === "onMouseMove" && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <label className="mb-1 block text-[11px] text-zinc-500">Tracking Scope</label>
          <select
            value={animation.mouseScope ?? "viewport"}
            onChange={(e) => onChange({ mouseScope: e.target.value as MouseScope })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
          >
            <option value="viewport">Viewport (background parallax)</option>
            <option value="element">This Block Only (magnetic hover)</option>
          </select>
          <p className="mt-1 text-[11px] text-zinc-600">
            {animation.mouseScope === "element"
              ? "Only reacts while the cursor is over this block; snaps back to From on mouseleave."
              : "Reacts to the cursor anywhere on screen — good for a background layer or large decorative element."}
          </p>
          <div className="mt-2">
            <label className="mb-1 block text-[11px] text-zinc-500">
              {animation.mouseScope === "element" ? "Magnetic Strength (px)" : "Parallax Strength (px)"}
            </label>
            <input
              type="number"
              min={0}
              value={animation.mouseStrength ?? 30}
              onChange={(e) => onChange({ mouseStrength: Number(e.target.value) })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

type ColorTweenKey = "backgroundColor" | "color" | "borderColor";
type NumericTweenKey = Exclude<keyof AnimationTweenValues, ColorTweenKey | "boxShadow">;
type TweenField =
  | { key: NumericTweenKey; label: string; kind: "number"; step: number; suffix?: string }
  | { key: ColorTweenKey; label: string; kind: "color" };

// Transform/opacity — GPU-accelerated, safe on any block.
const TRANSFORM_TWEEN_FIELDS: TweenField[] = [
  { key: "opacity", label: "Opacity", kind: "number", step: 0.1 },
  { key: "x", label: "Move X", kind: "number", step: 5, suffix: "px" },
  { key: "y", label: "Move Y", kind: "number", step: 5, suffix: "px" },
  { key: "scale", label: "Scale", kind: "number", step: 0.1 },
  { key: "scaleX", label: "Scale X", kind: "number", step: 0.1 },
  { key: "scaleY", label: "Scale Y", kind: "number", step: 0.1 },
  { key: "rotate", label: "Rotate", kind: "number", step: 5, suffix: "°" },
  { key: "skewX", label: "Skew X", kind: "number", step: 5, suffix: "°" },
  { key: "skewY", label: "Skew Y", kind: "number", step: 5, suffix: "°" },
];
// Filter/paint — repaint-driven, not GPU-composited; use sparingly on scrubbed scroll animations.
const FILTER_TWEEN_FIELDS: TweenField[] = [
  { key: "blur", label: "Blur", kind: "number", step: 1, suffix: "px" },
  { key: "grayscale", label: "Grayscale", kind: "number", step: 0.1, suffix: "0–1" },
  { key: "brightness", label: "Brightness", kind: "number", step: 0.1, suffix: "0–2" },
  { key: "backgroundColor", label: "Background Color (solid or gradient)", kind: "color" },
  { key: "color", label: "Text Color", kind: "color" },
  { key: "borderColor", label: "Border Color", kind: "color" },
  { key: "borderRadius", label: "Border Radius", kind: "number", step: 1, suffix: "px" },
  { key: "backgroundPositionX", label: "BG Position X", kind: "number", step: 5, suffix: "%" },
  { key: "backgroundPositionY", label: "BG Position Y", kind: "number", step: 5, suffix: "%" },
];

function TweenGrid({
  from,
  to,
  onChange,
}: {
  from: AnimationTweenValues;
  to: AnimationTweenValues;
  onChange: (from: AnimationTweenValues, to: AnimationTweenValues) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_64px_64px] items-center gap-x-2 gap-y-1.5">
      <span />
      <span className="text-center text-[10px] uppercase tracking-wide text-zinc-500">From</span>
      <span className="text-center text-[10px] uppercase tracking-wide text-zinc-500">To</span>
      {TRANSFORM_TWEEN_FIELDS.map((field) => (
        <TweenFieldRow key={field.key} field={field} from={from} to={to} onChange={onChange} />
      ))}
      <span className="col-span-3 mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
        Filters &amp; Background — a container&apos;s own opaque background covers these; leave it transparent to see them
      </span>
      {FILTER_TWEEN_FIELDS.map((field) => (
        <TweenFieldRow key={field.key} field={field} from={from} to={to} onChange={onChange} />
      ))}
      <div className="col-span-3 mt-1">
        <BoxShadowLayersEditor from={from} to={to} onChange={onChange} />
      </div>
    </div>
  );
}

// ── Box Shadow — layered editor ─────────────────────────────────────────
// `boxShadow` is still stored as one plain CSS string per side (comma-
// separated layers) — see AnimationTweenValues.boxShadow — this only adds a
// structured "+ Add Shadow" UI on top, parsing that string into per-layer
// X/Y/Blur/Spread/Color fields and re-serializing on every change. From and
// To must stay the same *number* of layers for GSAP to interpolate them
// (see the doc comment on `boxShadow`), so adding/removing a layer always
// updates both sides together.
interface ShadowLayer {
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
}

const DEFAULT_SHADOW_LAYER: ShadowLayer = { inset: false, x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,0.5)" };

/** Splits on top-level commas only — a shadow's color (e.g. "rgba(0,0,0,.5)") can itself contain commas. */
function splitTopLevelCommas(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const SHADOW_LAYER_PATTERN = /^(inset\s+)?(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(.+)$/i;

function parseBoxShadow(value: string | undefined): ShadowLayer[] {
  if (!value?.trim()) return [];
  return splitTopLevelCommas(value).map((layer) => {
    const match = layer.match(SHADOW_LAYER_PATTERN);
    if (!match) return { ...DEFAULT_SHADOW_LAYER, color: layer }; // unparseable (hand-typed, non-standard shape) — keep it visible as a color-only fallback rather than silently dropping it
    const [, inset, x, y, blur, spread, color] = match;
    return { inset: Boolean(inset), x: Number(x), y: Number(y), blur: Number(blur), spread: Number(spread), color };
  });
}

function serializeBoxShadow(layers: ShadowLayer[]): string | undefined {
  if (layers.length === 0) return undefined;
  return layers.map((l) => `${l.inset ? "inset " : ""}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color}`).join(", ");
}

/** Keeps From/To layer counts in lockstep — padding the shorter side with copies of its own last layer (or the default) rather than the other side's values, so a lopsided paste doesn't silently invent a "from" that was never set. */
function padLayers(layers: ShadowLayer[], count: number): ShadowLayer[] {
  if (layers.length >= count) return layers;
  const filler = layers[layers.length - 1] ?? DEFAULT_SHADOW_LAYER;
  return [...layers, ...Array.from({ length: count - layers.length }, () => filler)];
}

function BoxShadowLayersEditor({
  from,
  to,
  onChange,
}: {
  from: AnimationTweenValues;
  to: AnimationTweenValues;
  onChange: (from: AnimationTweenValues, to: AnimationTweenValues) => void;
}) {
  const rawFromLayers = parseBoxShadow(from.boxShadow);
  const rawToLayers = parseBoxShadow(to.boxShadow);
  const count = Math.max(rawFromLayers.length, rawToLayers.length);
  const fromLayers = padLayers(rawFromLayers, count);
  const toLayers = padLayers(rawToLayers, count);

  function commit(nextFrom: ShadowLayer[], nextTo: ShadowLayer[]) {
    onChange({ ...from, boxShadow: serializeBoxShadow(nextFrom) }, { ...to, boxShadow: serializeBoxShadow(nextTo) });
  }

  function updateLayer(side: "from" | "to", index: number, patch: Partial<ShadowLayer>) {
    const layers = side === "from" ? fromLayers : toLayers;
    const next = layers.map((l, i) => (i === index ? { ...l, ...patch } : l));
    commit(side === "from" ? next : fromLayers, side === "to" ? next : toLayers);
  }

  function addLayer() {
    commit([...fromLayers, DEFAULT_SHADOW_LAYER], [...toLayers, DEFAULT_SHADOW_LAYER]);
  }

  function removeLayer(index: number) {
    commit(
      fromLayers.filter((_, i) => i !== index),
      toLayers.filter((_, i) => i !== index)
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">Box Shadow</span>
        <button type="button" onClick={addLayer} className="rounded border border-dashed border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-amber-400 hover:text-amber-400">
          + Add Shadow
        </button>
      </div>
      {count === 0 && <p className="mt-1 text-[11px] text-zinc-600">No shadow layers yet — add one to animate a box-shadow.</p>}
      <div className="mt-2 flex flex-col gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-zinc-600">Shadow {i + 1}</span>
              <button type="button" onClick={() => removeLayer(i)} title="Remove this shadow layer" className="text-zinc-500 hover:text-red-400">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-[1fr_1fr_1fr] items-center gap-x-2 gap-y-1">
              <span />
              <span className="text-center text-[10px] uppercase tracking-wide text-zinc-500">From</span>
              <span className="text-center text-[10px] uppercase tracking-wide text-zinc-500">To</span>
              {(["x", "y", "blur", "spread"] as const).map((prop) => (
                <ShadowNumberRow key={prop} label={prop === "x" ? "X" : prop === "y" ? "Y" : prop === "blur" ? "Blur" : "Spread"} fromValue={fromLayers[i][prop]} toValue={toLayers[i][prop]} onFromChange={(v) => updateLayer("from", i, { [prop]: v })} onToChange={(v) => updateLayer("to", i, { [prop]: v })} />
              ))}
              <label className="text-xs text-zinc-400">Color</label>
              <ColorField compact placeholder="rgba(0,0,0,.5)" value={fromLayers[i].color} onChange={(v) => updateLayer("from", i, { color: v })} />
              <ColorField compact placeholder="rgba(0,0,0,.5)" value={toLayers[i].color} onChange={(v) => updateLayer("to", i, { color: v })} />
              <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                <input type="checkbox" checked={fromLayers[i].inset} onChange={(e) => updateLayer("from", i, { inset: e.target.checked })} />
                Inset
              </label>
              <div />
              <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                <input type="checkbox" checked={toLayers[i].inset} onChange={(e) => updateLayer("to", i, { inset: e.target.checked })} />
                Inset
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShadowNumberRow({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: {
  label: string;
  fromValue: number;
  toValue: number;
  onFromChange: (v: number) => void;
  onToChange: (v: number) => void;
}) {
  return (
    <>
      <label className="text-xs text-zinc-400">{label} (px)</label>
      <input type="number" value={fromValue} onChange={(e) => onFromChange(Number(e.target.value) || 0)} className="w-full rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-center text-xs focus:border-amber-400 focus:outline-none" />
      <input type="number" value={toValue} onChange={(e) => onToChange(Number(e.target.value) || 0)} className="w-full rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-center text-xs focus:border-amber-400 focus:outline-none" />
    </>
  );
}

function TweenFieldRow({
  field,
  from,
  to,
  onChange,
}: {
  field: TweenField;
  from: AnimationTweenValues;
  to: AnimationTweenValues;
  onChange: (from: AnimationTweenValues, to: AnimationTweenValues) => void;
}) {
  if (field.kind === "color") {
    const key = field.key;
    return (
      <>
        <label className="text-xs text-zinc-400">{field.label}</label>
        <ColorField compact placeholder="#fff" value={from[key] ?? ""} onChange={(v) => onChange({ ...from, [key]: v || undefined }, to)} />
        <ColorField compact placeholder="#fff" value={to[key] ?? ""} onChange={(v) => onChange(from, { ...to, [key]: v || undefined })} />
      </>
    );
  }
  return (
    <>
      <label className="text-xs text-zinc-400">
        {field.label}
        {field.suffix ? <span className="text-zinc-600"> ({field.suffix})</span> : null}
      </label>
      <input
        type="number"
        step={field.step}
        value={from[field.key] ?? ""}
        onChange={(e) => onChange({ ...from, [field.key]: e.target.value === "" ? undefined : Number(e.target.value) }, to)}
        className="w-full rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-center text-xs focus:border-amber-400 focus:outline-none"
      />
      <input
        type="number"
        step={field.step}
        value={to[field.key] ?? ""}
        onChange={(e) => onChange(from, { ...to, [field.key]: e.target.value === "" ? undefined : Number(e.target.value) })}
        className="w-full rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-center text-xs focus:border-amber-400 focus:outline-none"
      />
    </>
  );
}

function AccordionSection({
  title,
  icon: IconComponent,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900/60 transition-colors">
      {/* A <button> here (as this used to be) can't legally contain the real
          <button> elements some callers pass as `badge` (e.g. the Normal/
          Hover toggle below) — invalid HTML, and Next.js flags it as a
          hydration error. A div styled/behaving like one, with badge's own
          onClick already calling stopPropagation, keeps the exact same
          click-to-toggle and keyboard behavior without the nesting. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }}
        className="flex w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="h-3.5 w-3.5 text-amber-400" />}
          <span>{title}</span>
          {badge}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`}
        />
      </div>
      <div className={`grid transition-all duration-200 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="space-y-3.5 border-t border-white/[0.06] p-3.5 text-xs">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FourSideField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: { top?: string; right?: string; bottom?: string; left?: string };
  onChange: (side: "Top" | "Right" | "Bottom" | "Left", value: string) => void;
}) {
  const [isLinked, setIsLinked] = useState(false);

  const handleLinkedChange = (v: string) => {
    let formatted = v;
    const trimmed = v.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) formatted = `${trimmed}px`;
    onChange("Top", formatted);
    onChange("Right", formatted);
    onChange("Bottom", formatted);
    onChange("Left", formatted);
  };

  const currentVal = values.top ?? values.right ?? values.bottom ?? values.left ?? "";

  return (
    <div className="mt-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</label>
        <button
          type="button"
          onClick={() => setIsLinked(!isLinked)}
          title={isLinked ? "Unlink sides" : "Link sides"}
          className={`flex h-5 w-5 items-center justify-center rounded p-0.5 text-xs transition-colors ${
            isLinked ? "bg-amber-400/20 text-amber-400 border border-amber-400/40" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {isLinked ? <LinkIcon className="h-3 w-3" /> : <Unlink className="h-3 w-3" />}
        </button>
      </div>

      {isLinked ? (
        <div className="relative">
          <input
            type="text"
            placeholder="All sides (e.g. 16px)"
            value={currentVal}
            onChange={(e) => handleLinkedChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400/80 focus:outline-none"
          />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {(["Top", "Right", "Bottom", "Left"] as const).map((side) => {
            const sideKey = side.toLowerCase() as "top" | "right" | "bottom" | "left";
            return (
              <div key={side} className="flex flex-col items-center">
                <input
                  type="text"
                  placeholder="0"
                  value={values[sideKey] ?? ""}
                  onChange={(e) => onChange(side, e.target.value)}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim();
                    if (/^-?\d+(\.\d+)?$/.test(trimmed)) onChange(side, `${trimmed}px`);
                  }}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 py-1.5 text-center text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:border-amber-400/80 focus:outline-none"
                />
                <span className="mt-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-tighter">{side[0]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpandSidesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

/** Anchors a popover to a trigger button's own bounding rect — shared by BorderWidthField/BorderRadiusField below. */
function useAnchoredPopover<T extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<T>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function toggle() {
    if (!open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 232) });
    }
    setOpen((v) => !v);
  }

  return { open, setOpen, anchorRef, pos, toggle };
}

function PopoverShell({ pos, onClose, children }: { pos: { top: number; left: number }; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 w-56 rounded-xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl" style={{ top: pos.top, left: pos.left }}>
        {children}
      </div>
    </>
  );
}

function PxInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-zinc-500">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            const trimmed = e.target.value.trim();
            if (/^-?\d+(\.\d+)?$/.test(trimmed)) onChange(`${trimmed}px`);
          }}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 pr-7 text-xs focus:border-amber-400 focus:outline-none"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">PX</span>
      </div>
    </div>
  );
}

// A single flat "Border Width" value (the block's own, always-existing prop
// — e.g. cardBorderWidth) always visible, with an expand button opening an
// anchored popover exposing independent Top/Right/Bottom/Left overrides
// (optional `{prefix}BorderWidthTop/Right/Bottom/Left` fields). Unset
// per-side fields fall back to the flat value in the component, so pages
// saved before this control existed keep rendering identically — the flat
// field IS the "linked" value, not a separate thing to migrate away from.
function BorderWidthField({
  label,
  flatValue,
  onFlatChange,
  values,
  onChange,
}: {
  label: string;
  flatValue: string;
  onFlatChange: (v: string) => void;
  values: { top?: string; right?: string; bottom?: string; left?: string };
  onChange: (side: "Top" | "Right" | "Bottom" | "Left", value: string) => void;
}) {
  const hasPerSideOverride = Boolean(values.top || values.right || values.bottom || values.left);
  const { open, setOpen, anchorRef, pos, toggle } = useAnchoredPopover<HTMLButtonElement>();

  return (
    <div className="mt-3">
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="e.g. 1px"
            value={flatValue}
            onChange={(e) => onFlatChange(e.target.value)}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (/^-?\d+(\.\d+)?$/.test(trimmed)) onFlatChange(`${trimmed}px`);
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 pr-8 text-sm"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">PX</span>
        </div>
        <button
          ref={anchorRef}
          type="button"
          onClick={toggle}
          title="Set independent side widths"
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
            hasPerSideOverride || open ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ExpandSidesIcon />
        </button>
      </div>
      {open && (
        <PopoverShell pos={pos} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-2">
            <PxInput label="Top" value={values.top} onChange={(v) => onChange("Top", v)} />
            <PxInput label="Right" value={values.right} onChange={(v) => onChange("Right", v)} />
            <PxInput label="Bottom" value={values.bottom} onChange={(v) => onChange("Bottom", v)} />
            <PxInput label="Left" value={values.left} onChange={(v) => onChange("Left", v)} />
          </div>
        </PopoverShell>
      )}
    </div>
  );
}

/** Same interaction pattern as BorderWidthField, for the 4 corner radii instead of the 4 side widths. */
function BorderRadiusField({
  label,
  flatValue,
  onFlatChange,
  values,
  onChange,
}: {
  label: string;
  flatValue: string;
  onFlatChange: (v: string) => void;
  values: { topLeft?: string; topRight?: string; bottomRight?: string; bottomLeft?: string };
  onChange: (corner: "TopLeft" | "TopRight" | "BottomRight" | "BottomLeft", value: string) => void;
}) {
  const hasPerCornerOverride = Boolean(values.topLeft || values.topRight || values.bottomRight || values.bottomLeft);
  const { open, setOpen, anchorRef, pos, toggle } = useAnchoredPopover<HTMLButtonElement>();

  return (
    <div className="mt-3">
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="e.g. 8px"
            value={flatValue}
            onChange={(e) => onFlatChange(e.target.value)}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (/^-?\d+(\.\d+)?$/.test(trimmed)) onFlatChange(`${trimmed}px`);
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 pr-8 text-sm"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">PX</span>
        </div>
        <button
          ref={anchorRef}
          type="button"
          onClick={toggle}
          title="Set independent corner radii"
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
            hasPerCornerOverride || open ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ExpandSidesIcon />
        </button>
      </div>
      {open && (
        <PopoverShell pos={pos} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-2">
            <PxInput label="Top Left" value={values.topLeft} onChange={(v) => onChange("TopLeft", v)} />
            <PxInput label="Top Right" value={values.topRight} onChange={(v) => onChange("TopRight", v)} />
            <PxInput label="Bottom Left" value={values.bottomLeft} onChange={(v) => onChange("BottomLeft", v)} />
            <PxInput label="Bottom Right" value={values.bottomRight} onChange={(v) => onChange("BottomRight", v)} />
          </div>
        </PopoverShell>
      )}
    </div>
  );
}

/**
 * A second background layer with an addable/removable Image | Gradient |
 * Color tab picker, each tab keeping its own fields independently so
 * switching tabs never loses another tab's configuration — same interaction
 * as this control in Elementor/Webflow-style page builders.
 */
function SectionOverlayField({
  type,
  onTypeChange,
  color,
  onColorChange,
  image,
  onImageChange,
  position,
  onPositionChange,
  attachment,
  onAttachmentChange,
  repeat,
  onRepeatChange,
  size,
  onSizeChange,
  gradientType,
  onGradientTypeChange,
  gradientAngle,
  onGradientAngleChange,
  gradientColor1,
  onGradientColor1Change,
  gradientStop1,
  onGradientStop1Change,
  gradientColor2,
  onGradientColor2Change,
  gradientStop2,
  onGradientStop2Change,
}: {
  type: string;
  onTypeChange: (v: string) => void;
  color: string;
  onColorChange: (v: string) => void;
  image: string;
  onImageChange: (v: string) => void;
  position: string;
  onPositionChange: (v: string) => void;
  attachment: string;
  onAttachmentChange: (v: string) => void;
  repeat: string;
  onRepeatChange: (v: string) => void;
  size: string;
  onSizeChange: (v: string) => void;
  gradientType: string;
  onGradientTypeChange: (v: string) => void;
  gradientAngle: string;
  onGradientAngleChange: (v: string) => void;
  gradientColor1: string;
  onGradientColor1Change: (v: string) => void;
  gradientStop1: string;
  onGradientStop1Change: (v: string) => void;
  gradientColor2: string;
  onGradientColor2Change: (v: string) => void;
  gradientStop2: string;
  onGradientStop2Change: (v: string) => void;
}) {
  const active = type !== "none";

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400">Overlay</label>
        <button
          type="button"
          onClick={() => onTypeChange(active ? "none" : "color")}
          title={active ? "Remove overlay" : "Add overlay"}
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border text-sm leading-none transition-colors ${
            active ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {active ? "×" : "+"}
        </button>
      </div>

      {active && (
        <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-zinc-900 p-1">
            {(["image", "gradient", "color"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTypeChange(t)}
                className={`rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${
                  type === t ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {type === "color" && <ColorField label="Color" value={color} onChange={onColorChange} />}

          {type === "gradient" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Color 1" value={gradientColor1} onChange={onGradientColor1Change} />
                <LabeledField label="Stop 1 (%)">
                  <input
                    type="number"
                    value={gradientStop1}
                    onChange={(e) => onGradientStop1Change(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </LabeledField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Color 2" value={gradientColor2} onChange={onGradientColor2Change} />
                <LabeledField label="Stop 2 (%)">
                  <input
                    type="number"
                    value={gradientStop2}
                    onChange={(e) => onGradientStop2Change(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </LabeledField>
              </div>
              <button
                type="button"
                onClick={() => {
                  onGradientColor1Change(gradientColor2);
                  onGradientStop1Change(gradientStop2);
                  onGradientColor2Change(gradientColor1);
                  onGradientStop2Change(gradientStop1);
                }}
                title="Swap Color 1 / Stop 1 with Color 2 / Stop 2"
                className="self-start rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Flip
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Type</label>
                  <select
                    value={gradientType}
                    onChange={(e) => onGradientTypeChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    {BG_GRADIENT_TYPE_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                {gradientType === "linear" && (
                  <LabeledField label="Angle (deg)">
                    <input
                      type="number"
                      value={gradientAngle}
                      onChange={(e) => onGradientAngleChange(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </LabeledField>
                )}
              </div>
            </div>
          )}

          {type === "image" && (
            <div className="flex flex-col gap-3">
              <ImagePicker label="Image" images={image ? [image] : []} onChange={(images) => onImageChange(images[images.length - 1] ?? "")} category="builder" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Position</label>
                  <select
                    value={position}
                    onChange={(e) => onPositionChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    {BG_POSITION_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Size</label>
                  <select value={size} onChange={(e) => onSizeChange(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none">
                    {BG_SIZE_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Repeat</label>
                  <select
                    value={repeat}
                    onChange={(e) => onRepeatChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    {BG_REPEAT_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Attachment</label>
                  <select
                    value={attachment}
                    onChange={(e) => onAttachmentChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    {BG_ATTACHMENT_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PropField({
  field,
  binding,
}: {
  field: PropFieldDescriptor;
  binding: {
    value: unknown;
    onChange: (v: unknown) => void;
    isOverridden?: boolean;
    inheritedFrom?: "desktop" | "tablet";
    onReset?: () => void;
  };
}) {
  const { value, onChange, isOverridden, inheritedFrom, onReset } = binding;
  const label = `${field.label}${field.required ? " *" : ""}`;
  // Refs for the Global Dynamic Tags trigger's cursor-position insertion
  // (see DynamicTagButton.tsx) — harmless to declare both even though only
  // one of the text/textarea branches below ever actually attaches one.
  const textInputRef = useRef<HTMLInputElement>(null);
  const textareaFieldRef = useRef<HTMLTextAreaElement>(null);

  switch (field.kind) {
    case "text":
      if (IMAGE_FIELD_KEYS.has(field.key)) {
        const stringValue = typeof value === "string" ? value : "";
        // Image tokens are whole-value-only (a src can't be half-token) —
        // once the field IS a token, ImagePicker's own gallery/upload UI
        // doesn't apply at all (it has no free-text entry, and would try to
        // render `{{post.featuredImage}}` as a literal broken <img> src), so
        // it's replaced entirely by a small "Dynamic: {label}" chip until
        // cleared back to a real picked image.
        if (isDynamicToken(stringValue)) {
          const tagKey = extractDynamicTagKey(stringValue) ?? "";
          return (
            <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs text-amber-300">
                <span className="truncate">Dynamic: {getDynamicTagLabel(tagKey)}</span>
                <button type="button" onClick={() => onChange("")} className="shrink-0 rounded px-2 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                  Clear
                </button>
              </div>
            </LabeledField>
          );
        }
        const current = stringValue ? [stringValue] : [];
        return (
          <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
            <div className="flex items-start gap-1.5">
              <div className="min-w-0 flex-1">
                <ImagePicker
                  label=""
                  images={current}
                  onChange={(images) => onChange(images[images.length - 1] ?? "")}
                  category="builder"
                />
              </div>
              <DynamicTagButton currentValue={stringValue} onInsert={(next) => onChange(next)} filter={(tag) => Boolean(tag.isImage)} />
            </div>
          </LabeledField>
        );
      }
      if (LENGTH_FIELD_RANGES[field.key]) {
        const { min, max, step, unit } = LENGTH_FIELD_RANGES[field.key];
        return (
          <LengthField
            label={label}
            value={typeof value === "string" ? value : ""}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            defaultUnit={unit}
            isOverridden={isOverridden}
            inheritedFrom={inheritedFrom}
            onReset={onReset}
          />
        );
      }
      return (
        <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <input
                ref={textInputRef}
                type="text"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm ${isOverridden ? "border-amber-400/80 ring-1 ring-amber-400/30" : "border-zinc-700"}`}
              />
            </div>
            <DynamicTagButton inputRef={textInputRef} currentValue={typeof value === "string" ? value : ""} onInsert={(next) => onChange(next)} />
          </div>
        </LabeledField>
      );
    case "textarea":
      if (field.key === "html") {
        return (
          <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
            <RichTextEditor value={typeof value === "string" ? value : ""} onChange={onChange} />
          </LabeledField>
        );
      }
      return (
        <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <textarea
                ref={textareaFieldRef}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
                className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 font-mono text-xs ${isOverridden ? "border-amber-400/80 ring-1 ring-amber-400/30" : "border-zinc-700"}`}
              />
            </div>
            <DynamicTagButton inputRef={textareaFieldRef} currentValue={typeof value === "string" ? value : ""} onInsert={(next) => onChange(next)} />
          </div>
        </LabeledField>
      );
    case "number":
      return (
        <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
          <input
            type="number"
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm ${isOverridden ? "border-amber-400/80 ring-1 ring-amber-400/30" : "border-zinc-700"}`}
          />
        </LabeledField>
      );
    case "boolean":
      return (
        <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
            Enabled
          </label>
        </LabeledField>
      );
    case "select":
      if (field.valueType !== "number" && SEGMENTED_FIELD_KEYS.has(field.key)) {
        return (
          <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
            <SegmentedField
              label=""
              value={value != null ? String(value) : ""}
              onChange={(v) => onChange(v)}
              options={field.options}
            />
          </LabeledField>
        );
      }
      return (
        <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
          <select
            value={value != null ? String(value) : ""}
            onChange={(e) => onChange(field.valueType === "number" ? Number(e.target.value) : e.target.value)}
            className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm ${isOverridden ? "border-amber-400/80 ring-1 ring-amber-400/30" : "border-zinc-700"}`}
          >
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </LabeledField>
      );
    case "json":
      return (
        <LabeledField label={`${label} (JSON)`} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
          <JsonField value={value} onChange={onChange} />
        </LabeledField>
      );
  }
}

function JsonField({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const text = value !== undefined ? JSON.stringify(value, null, 2) : "";
  return (
    <textarea
      defaultValue={text}
      onBlur={(e) => {
        if (!e.target.value.trim()) return;
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          // leave the field as-is; invalid JSON is not written back until it parses
        }
      }}
      rows={4}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
    />
  );
}

function LabeledField({
  label,
  children,
  isOverridden,
  inheritedFrom,
  onReset,
}: {
  label: string;
  children: React.ReactNode;
  isOverridden?: boolean;
  inheritedFrom?: "desktop" | "tablet";
  onReset?: () => void;
}) {
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className={`block text-xs ${isOverridden ? "font-semibold text-amber-400" : "text-zinc-400"}`}>{label}</label>
            {inheritedFrom && !isOverridden && (
              <span className="rounded bg-zinc-800 px-1 py-0.2 text-[9px] text-zinc-500 uppercase tracking-wide">
                {inheritedFrom}
              </span>
            )}
          </div>
          {isOverridden && onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reset breakpoint override (restore inheritance)"
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
            >
              ⟲ reset
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function WebflowEasingEditorModal({
  isOpen,
  onClose,
  value,
  onChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (val: string) => void;
}) {
  const [p1, setP1] = useState<{ x: number; y: number }>({ x: 0.25, y: 0.1 });
  const [p2, setP2] = useState<{ x: number; y: number }>({ x: 0.25, y: 1 });
  const [activeName, setActiveName] = useState("Ease");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Syncs the curve editor's local point state from the incoming preset
    // `value` prop — same "sync internal state from a prop" pattern as
    // AnimationTimelineEditor.tsx's selectedLayerId sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value === "linear") { setP1({ x: 0, y: 0 }); setP2({ x: 1, y: 1 }); setActiveName("Linear"); }
    else if (value === "ease") { setP1({ x: 0.25, y: 0.1 }); setP2({ x: 0.25, y: 1 }); setActiveName("Ease"); }
    else if (value === "ease-in") { setP1({ x: 0.42, y: 0 }); setP2({ x: 1, y: 1 }); setActiveName("Ease In"); }
    else if (value === "ease-out") { setP1({ x: 0, y: 0 }); setP2({ x: 0.58, y: 1 }); setActiveName("Ease Out"); }
    else if (value === "ease-in-out") { setP1({ x: 0.42, y: 0 }); setP2({ x: 0.58, y: 1 }); setActiveName("Ease In Out"); }
  }, [value]);

  if (!isOpen) return null;

  const selectPreset = (name: string, cubicStr: string, p1Val: { x: number; y: number }, p2Val: { x: number; y: number }) => {
    setActiveName(name);
    setP1(p1Val);
    setP2(p2Val);
    onChange(cubicStr);
  };

  const svgWidth = 200;
  const svgHeight = 200;
  const padding = 20;
  const chartW = svgWidth - padding * 2;
  const chartH = svgHeight - padding * 2;

  const startX = padding;
  const startY = svgHeight - padding;
  const endX = svgWidth - padding;
  const endY = padding;

  const handle1X = startX + p1.x * chartW;
  const handle1Y = startY - p1.y * chartH;

  const handle2X = startX + p2.x * chartW;
  const handle2Y = startY - p2.y * chartH;

  const pathD = `M ${startX} ${startY} C ${handle1X} ${handle1Y}, ${handle2X} ${handle2Y}, ${endX} ${endY}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex w-[540px] h-[380px] rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden text-xs">
        <div className="w-48 border-r border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-3 overflow-y-auto">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Default</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { name: "Linear", val: "linear", p1: { x: 0, y: 0 }, p2: { x: 1, y: 1 } },
                { name: "Ease", val: "ease", p1: { x: 0.25, y: 0.1 }, p2: { x: 0.25, y: 1 } },
                { name: "Ease In", val: "ease-in", p1: { x: 0.42, y: 0 }, p2: { x: 1, y: 1 } },
                { name: "Ease Out", val: "ease-out", p1: { x: 0, y: 0 }, p2: { x: 0.58, y: 1 } },
                { name: "Ease In Out", val: "ease-in-out", p1: { x: 0.42, y: 0 }, p2: { x: 0.58, y: 1 } },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => selectPreset(item.name, item.val, item.p1, item.p2)}
                  className={`p-2 rounded border flex flex-col items-center gap-1 transition-all ${
                    activeName === item.name ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="h-6 w-8 border border-zinc-800 bg-zinc-950 rounded flex items-center justify-center">
                    <div className="h-0.5 w-6 bg-current rounded-full" />
                  </div>
                  <span className="text-[10px] font-medium truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Ease In</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { name: "Quad", val: "cubic-bezier(0.11, 0, 0.5, 0)", p1: { x: 0.11, y: 0 }, p2: { x: 0.5, y: 0 } },
                { name: "Cubic", val: "cubic-bezier(0.32, 0, 0.67, 0)", p1: { x: 0.32, y: 0 }, p2: { x: 0.67, y: 0 } },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => selectPreset(item.name, item.val, item.p1, item.p2)}
                  className={`p-1.5 rounded border text-center font-medium ${
                    activeName === item.name ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-[10px]">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Ease Out</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { name: "Quad", val: "cubic-bezier(0.5, 1, 0.89, 1)", p1: { x: 0.5, y: 1 }, p2: { x: 0.89, y: 1 } },
                { name: "Cubic", val: "cubic-bezier(0.33, 1, 0.68, 1)", p1: { x: 0.33, y: 1 }, p2: { x: 0.68, y: 1 } },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => selectPreset(item.name, item.val, item.p1, item.p2)}
                  className={`p-1.5 rounded border text-center font-medium ${
                    activeName === item.name ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-[10px]">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between relative bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="font-semibold text-zinc-100 text-sm">Easing Editor</span>
            </div>
            <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center my-auto relative">
            <div className="flex items-center justify-between w-[220px] mb-1">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold hover:text-amber-300"
              >
                <div className="h-4 w-4 rounded-full border border-amber-400 flex items-center justify-center">▶</div>
                <span>{activeName}</span>
              </button>
            </div>

            <div className="relative border border-zinc-800 bg-zinc-950/80 rounded-lg p-2 shadow-inner">
              <svg width={svgWidth} height={svgHeight} className="overflow-visible">
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={padding}
                    y1={padding + (chartH / 5) * i}
                    x2={svgWidth - padding}
                    y2={padding + (chartH / 5) * i}
                    stroke="#27272a"
                    strokeWidth="1"
                  />
                ))}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={padding + (chartW / 5) * i}
                    y1={padding}
                    x2={padding + (chartW / 5) * i}
                    y2={svgHeight - padding}
                    stroke="#27272a"
                    strokeWidth="1"
                  />
                ))}

                <line x1={startX} y1={startY} x2={handle1X} y2={handle1Y} stroke="#3b82f6" strokeWidth="1.5" />
                <line x1={endX} y1={endY} x2={handle2X} y2={handle2Y} stroke="#3b82f6" strokeWidth="1.5" />

                <path d={pathD} fill="none" stroke="#ffffff" strokeWidth="2.5" />

                <circle cx={handle1X} cy={handle1Y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" className="cursor-pointer" />
                <circle cx={handle2X} cy={handle2Y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" className="cursor-pointer" />
              </svg>

              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-widest text-zinc-500 uppercase">TIME</span>
              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-bold tracking-widest text-zinc-500 uppercase -rotate-90">PROGRESS</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 pt-2.5">
            <span className="font-mono text-[11px] text-zinc-400">
              {value || `cubic-bezier(${p1.x}, ${p1.y}, ${p2.x}, ${p2.y})`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-amber-400 px-3 py-1 text-xs font-semibold text-zinc-950 hover:bg-amber-300"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebflowEffectsSection({
  activeStyle,
  patchStyle,
}: {
  activeStyle: ResponsiveStyleFields;
  patchStyle: (patch: ResponsiveStyleFields) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingShadow, setEditingShadow] = useState(false);
  const [editingTransform, setEditingTransform] = useState(false);
  const [editingTransition, setEditingTransition] = useState(false);
  const [editingFilter, setEditingFilter] = useState(false);
  const [isEasingEditorOpen, setIsEasingEditorOpen] = useState(false);

  const [transformType, setTransformType] = useState<"move" | "scale" | "rotate" | "skew">("move");
  const [shadowType, setShadowType] = useState<"outside" | "inside">("outside");

  const [transformX, setTransformX] = useState(16);
  const [transformY, setTransformY] = useState(0);
  const [transformZ, setTransformZ] = useState(0);

  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(2);
  const [shadowBlur, setShadowBlur] = useState(5);
  const [shadowSpread, setShadowSpread] = useState(0);
  const [shadowColor, setShadowColor] = useState("rgba(0, 0, 0, 0.2)");

  const [transitionProp, setTransitionProp] = useState("letter-spacing");
  const [transitionDuration, setTransitionDuration] = useState(200);
  const [transitionEasing, setTransitionEasing] = useState("ease");

  const [filterType, setFilterType] = useState("blur");
  const [filterValue, setFilterValue] = useState(5);

  const currentBlend = String(activeStyle.mixBlendMode || "normal").toLowerCase();
  const currentOpacityNum = activeStyle.opacity !== undefined ? Math.round(parseFloat(String(activeStyle.opacity)) * 100) : 100;
  const currentOutline = String(activeStyle.outlineStyle || "none").toLowerCase();

  const currentCursor = String(activeStyle.cursor || "auto").toLowerCase();
  const currentEvents = String(activeStyle.pointerEvents || "auto").toLowerCase();

  const currentBoxShadow = String(activeStyle.boxShadow || "");
  const currentTransformStr = String(activeStyle.transform || "");
  const currentTransitionStr = String(activeStyle.transition || "");
  const currentFilterStr = String(activeStyle.filter || "");

  const updateTransform = (x: number, y: number, z: number, type: string) => {
    let str = "";
    if (type === "move") str = `translate3d(${x}px, ${y}px, ${z}px)`;
    else if (type === "scale") str = `scale3d(${x / 10}, ${y / 10}, 1)`;
    else if (type === "rotate") str = `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
    else if (type === "skew") str = `skew(${x}deg, ${y}deg)`;
    patchStyle({ transform: str });
  };

  const updateBoxShadow = (x: number, y: number, blur: number, spread: number, color: string, type: string) => {
    const insetStr = type === "inside" ? "inset " : "";
    const str = `${insetStr}${x}px ${y}px ${blur}px ${spread}px ${color}`;
    patchStyle({ boxShadow: str });
  };

  const updateTransition = (prop: string, duration: number, easing: string) => {
    const str = `${prop} ${duration}ms ${easing}`;
    patchStyle({ transition: str });
  };

  const updateFilter = (type: string, val: number) => {
    let str = "";
    if (type === "blur") str = `blur(${val}px)`;
    else if (type === "brightness") str = `brightness(${val}%)`;
    else if (type === "contrast") str = `contrast(${val}%)`;
    else if (type === "grayscale") str = `grayscale(${val}%)`;
    else if (type === "hue-rotate") str = `hue-rotate(${val}deg)`;
    else if (type === "saturate") str = `saturate(${val}%)`;
    else if (type === "sepia") str = `sepia(${val}%)`;
    else if (type === "invert") str = `invert(${val}%)`;
    patchStyle({ filter: str });
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden text-xs">
      <WebflowEasingEditorModal
        isOpen={isEasingEditorOpen}
        onClose={() => setIsEasingEditorOpen(false)}
        value={transitionEasing}
        onChange={(val) => {
          setTransitionEasing(val);
          updateTransition(transitionProp, transitionDuration, val);
        }}
      />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
          Effects &amp; Shadows
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 p-3 border-t border-zinc-800/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Blending</span>
            <select
              value={currentBlend}
              onChange={(e) => patchStyle({ mixBlendMode: e.target.value })}
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none capitalize"
            >
              <option value="normal">Normal</option>
              <option value="darken">Darken</option>
              <option value="multiply">Multiply</option>
              <option value="color-burn">Color burn</option>
              <option value="lighten">Lighten</option>
              <option value="screen">Screen</option>
              <option value="color-dodge">Color dodge</option>
              <option value="overlay">Overlay</option>
              <option value="soft-light">Soft light</option>
              <option value="hard-light">Hard light</option>
              <option value="difference">Difference</option>
              <option value="exclusion">Exclusion</option>
              <option value="hue">Hue</option>
              <option value="saturation">Saturation</option>
              <option value="color">Color</option>
              <option value="luminosity">Luminosity</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Opacity</span>
            <div className="flex flex-1 items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={currentOpacityNum}
                onChange={(e) => patchStyle({ opacity: String(parseFloat(e.target.value) / 100) })}
                className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg cursor-pointer"
              />
              <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 gap-1">
                <input
                  type="text"
                  value={currentOpacityNum}
                  onChange={(e) => patchStyle({ opacity: String((parseFloat(e.target.value) || 0) / 100) })}
                  className="w-8 bg-transparent text-xs text-zinc-100 font-mono text-center focus:outline-none"
                />
                <span className="text-[10px] font-bold text-zinc-400">%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Outline</span>
            <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              <button
                type="button"
                onClick={() => patchStyle({ outlineStyle: "none" })}
                title="None"
                className={`flex-1 py-1 flex justify-center rounded ${currentOutline === "none" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ outlineStyle: "solid" })}
                title="Solid"
                className={`flex-1 py-1 flex justify-center rounded ${currentOutline === "solid" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
              >
                —
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ outlineStyle: "dashed" })}
                title="Dashed"
                className={`flex-1 py-1 flex justify-center rounded ${currentOutline === "dashed" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
              >
                ---
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ outlineStyle: "dotted" })}
                title="Dotted"
                className={`flex-1 py-1 flex justify-center rounded ${currentOutline === "dotted" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
              >
                •••
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-800/40 pt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Box shadows</span>
              <button
                type="button"
                onClick={() => setEditingShadow(!editingShadow)}
                className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {currentBoxShadow && (
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200">
                <span className="font-mono text-[11px] truncate">Outer shadow: {currentBoxShadow}</span>
                <Trash2
                  className="h-3.5 w-3.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                  onClick={() => patchStyle({ boxShadow: "" })}
                />
              </div>
            )}

            {editingShadow && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-10">Type</span>
                  <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShadowType("outside");
                        updateBoxShadow(shadowX, shadowY, shadowBlur, shadowSpread, shadowColor, "outside");
                      }}
                      className={`flex-1 py-1 text-center text-xs font-medium rounded ${shadowType === "outside" ? "bg-zinc-800 text-zinc-100 ring-1 ring-blue-500" : "text-zinc-400"}`}
                    >
                      Outside
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShadowType("inside");
                        updateBoxShadow(shadowX, shadowY, shadowBlur, shadowSpread, shadowColor, "inside");
                      }}
                      className={`flex-1 py-1 text-center text-xs font-medium rounded ${shadowType === "inside" ? "bg-zinc-800 text-zinc-100 ring-1 ring-blue-500" : "text-zinc-400"}`}
                    >
                      Inside
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-8">X</span>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={shadowX}
                    onChange={(e) => {
                      const x = parseInt(e.target.value) || 0;
                      setShadowX(x);
                      updateBoxShadow(x, shadowY, shadowBlur, shadowSpread, shadowColor, shadowType);
                    }}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                  />
                  <span className="text-xs font-mono text-zinc-200">{shadowX} PX</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-8">Y</span>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={shadowY}
                    onChange={(e) => {
                      const y = parseInt(e.target.value) || 0;
                      setShadowY(y);
                      updateBoxShadow(shadowX, y, shadowBlur, shadowSpread, shadowColor, shadowType);
                    }}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                  />
                  <span className="text-xs font-mono text-zinc-200">{shadowY} PX</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-8">Blur</span>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={shadowBlur}
                    onChange={(e) => {
                      const b = parseInt(e.target.value) || 0;
                      setShadowBlur(b);
                      updateBoxShadow(shadowX, shadowY, b, shadowSpread, shadowColor, shadowType);
                    }}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                  />
                  <span className="text-xs font-mono text-zinc-200">{shadowBlur} PX</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-8">Size</span>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={shadowSpread}
                    onChange={(e) => {
                      const s = parseInt(e.target.value) || 0;
                      setShadowSpread(s);
                      updateBoxShadow(shadowX, shadowY, shadowBlur, s, shadowColor, shadowType);
                    }}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                  />
                  <span className="text-xs font-mono text-zinc-200">{shadowSpread} PX</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-8">Color</span>
                  <input
                    type="text"
                    value={shadowColor}
                    onChange={(e) => {
                      setShadowColor(e.target.value);
                      updateBoxShadow(shadowX, shadowY, shadowBlur, shadowSpread, e.target.value, shadowType);
                    }}
                    className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800/40 pt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">2D & 3D transforms</span>
              <button
                type="button"
                onClick={() => setEditingTransform(!editingTransform)}
                className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {currentTransformStr && (
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200">
                <span className="font-mono text-[11px] truncate">Transform: {currentTransformStr}</span>
                <Trash2
                  className="h-3.5 w-3.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                  onClick={() => patchStyle({ transform: "" })}
                />
              </div>
            )}

            {editingTransform && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-10">Type</span>
                  <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                    {(["move", "scale", "rotate", "skew"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTransformType(t);
                          updateTransform(transformX, transformY, transformZ, t);
                        }}
                        className={`flex-1 py-1 text-center text-xs font-medium capitalize rounded ${transformType === t ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-6">X</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={transformX}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setTransformX(val);
                      updateTransform(val, transformY, transformZ, transformType);
                    }}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                  />
                  <span className="text-xs font-mono text-zinc-200">{transformX} PX</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-6">Y</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={transformY}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setTransformY(val);
                      updateTransform(transformX, val, transformZ, transformType);
                    }}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                  />
                  <span className="text-xs font-mono text-zinc-200">{transformY} PX</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-6">Z</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={transformZ}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setTransformZ(val);
                      updateTransform(transformX, transformY, val, transformType);
                    }}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                  />
                  <span className="text-xs font-mono text-zinc-200">{transformZ} PX</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800/40 pt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Transitions</span>
              <button
                type="button"
                onClick={() => setEditingTransition(!editingTransition)}
                className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {currentTransitionStr && (
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200">
                <span className="font-mono text-[11px] truncate">Transition: {currentTransitionStr}</span>
                <Trash2
                  className="h-3.5 w-3.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                  onClick={() => patchStyle({ transition: "" })}
                />
              </div>
            )}

            {editingTransition && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-14">Type</span>
                  <select
                    value={transitionProp}
                    onChange={(e) => {
                      setTransitionProp(e.target.value);
                      updateTransition(e.target.value, transitionDuration, transitionEasing);
                    }}
                    className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                  >
                    <optgroup label="Common">
                      <option value="opacity">Opacity</option>
                      <option value="margin">Margin</option>
                      <option value="padding">Padding</option>
                      <option value="border">Border</option>
                      <option value="transform">Transform</option>
                      <option value="filter">Filter</option>
                      <option value="flex">Flex</option>
                    </optgroup>
                    <optgroup label="Background">
                      <option value="background-color">Background Color</option>
                      <option value="background-position">Background Position</option>
                      <option value="text-shadow">Text Shadow</option>
                      <option value="box-shadow">Box Shadow</option>
                    </optgroup>
                    <optgroup label="Size">
                      <option value="width">Width</option>
                      <option value="height">Height</option>
                      <option value="max-height">Max Height</option>
                      <option value="max-width">Max Width</option>
                      <option value="min-height">Min Height</option>
                      <option value="min-width">Min Width</option>
                    </optgroup>
                    <optgroup label="Borders">
                      <option value="border-radius">Border Radius</option>
                      <option value="border-color">Border Color</option>
                      <option value="border-width">Border Width</option>
                    </optgroup>
                    <optgroup label="Typography">
                      <option value="color">Font Color</option>
                      <option value="font-size">Font Size</option>
                      <option value="line-height">Line Height</option>
                      <option value="letter-spacing">Letter Spacing</option>
                      <option value="text-indent">Text Indent</option>
                      <option value="word-spacing">Word Spacing</option>
                      <option value="font-variation-settings">Font Variations</option>
                    </optgroup>
                    <optgroup label="Position">
                      <option value="top">Top</option>
                      <option value="left">Left</option>
                      <option value="bottom">Bottom</option>
                    </optgroup>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-14">Duration</span>
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    step={50}
                    value={transitionDuration}
                    onChange={(e) => {
                      const dur = parseInt(e.target.value) || 200;
                      setTransitionDuration(dur);
                      updateTransition(transitionProp, dur, transitionEasing);
                    }}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-mono text-zinc-200">{transitionDuration} MS</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-14">Easing</span>
                  <button
                    type="button"
                    onClick={() => setIsEasingEditorOpen(true)}
                    className="flex-1 flex items-center justify-between rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 hover:border-amber-400/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span className="truncate">{transitionEasing}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800/40 pt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Filters</span>
              <button
                type="button"
                onClick={() => setEditingFilter(!editingFilter)}
                className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {currentFilterStr && (
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200">
                <span className="font-mono text-[11px] truncate">Filter: {currentFilterStr}</span>
                <Trash2
                  className="h-3.5 w-3.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                  onClick={() => patchStyle({ filter: "" })}
                />
              </div>
            )}

            {editingFilter && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-14">Filter</span>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      updateFilter(e.target.value, filterValue);
                    }}
                    className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                  >
                    <optgroup label="General">
                      <option value="blur">Blur</option>
                      <option value="drop-shadow">Drop shadow</option>
                    </optgroup>
                    <optgroup label="Color adjustments">
                      <option value="brightness">Brightness</option>
                      <option value="contrast">Contrast</option>
                      <option value="hue-rotate">Hue rotate</option>
                      <option value="saturate">Saturation</option>
                    </optgroup>
                    <optgroup label="Color effects">
                      <option value="grayscale">Grayscale</option>
                      <option value="invert">Invert</option>
                      <option value="sepia">Sepia</option>
                    </optgroup>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 w-14">
                    {filterType === "blur" ? "Radius" : "Amount"}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={filterType === "hue-rotate" ? 360 : 100}
                    value={filterValue}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setFilterValue(val);
                      updateFilter(filterType, val);
                    }}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-mono text-zinc-200">
                    {filterValue} {filterType === "blur" ? "PX" : filterType === "hue-rotate" ? "DEG" : "%"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-zinc-800/40 pt-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Cursor</span>
            <div className="flex flex-1 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
              <MousePointer className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={currentCursor}
                onChange={(e) => patchStyle({ cursor: e.target.value })}
                className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none cursor-pointer"
              >
                <optgroup label="General">
                  <option value="auto">auto</option>
                  <option value="default">default</option>
                  <option value="none">none</option>
                </optgroup>
                <optgroup label="Links & Status">
                  <option value="pointer">pointer</option>
                  <option value="not-allowed">not-allowed</option>
                  <option value="wait">wait</option>
                  <option value="progress">progress</option>
                  <option value="help">help</option>
                  <option value="context-menu">context-menu</option>
                </optgroup>
                <optgroup label="Selection">
                  <option value="cell">cell</option>
                  <option value="crosshair">crosshair</option>
                  <option value="text">text</option>
                  <option value="vertical-text">vertical-text</option>
                </optgroup>
                <optgroup label="Drag & Drop">
                  <option value="grab">grab</option>
                  <option value="grabbing">grabbing</option>
                  <option value="alias">alias</option>
                  <option value="copy">copy</option>
                  <option value="move">move</option>
                </optgroup>
                <optgroup label="Zoom">
                  <option value="zoom-in">zoom-in</option>
                  <option value="zoom-out">zoom-out</option>
                </optgroup>
                <optgroup label="Resize">
                  <option value="col-resize">col-resize</option>
                  <option value="row-resize">row-resize</option>
                  <option value="nesw-resize">nesw-resize</option>
                  <option value="nwse-resize">nwse-resize</option>
                  <option value="ew-resize">ew-resize</option>
                  <option value="ns-resize">ns-resize</option>
                  <option value="n-resize">n-resize</option>
                  <option value="w-resize">w-resize</option>
                  <option value="s-resize">s-resize</option>
                  <option value="e-resize">e-resize</option>
                  <option value="nw-resize">nw-resize</option>
                  <option value="ne-resize">ne-resize</option>
                  <option value="sw-resize">sw-resize</option>
                  <option value="se-resize">se-resize</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-zinc-800/40 pt-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Events</span>
            <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              <button
                type="button"
                onClick={() => patchStyle({ pointerEvents: "auto" })}
                className={`flex-1 py-1 text-center text-xs font-medium rounded ${currentEvents === "auto" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ pointerEvents: "none" })}
                className={`flex-1 py-1 text-center text-xs font-medium rounded ${currentEvents === "none" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
              >
                None
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-800/40 pt-2 flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-zinc-300">Backdrop filter</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-400 w-14">Blur</span>
              <UnitField
                label=""
                value={activeStyle.backdropFilterBlur ?? ""}
                onChange={(v) =>
                  patchStyle({
                    backdropFilterBlur: v,
                    backdropFilter: [v && `blur(${v})`, activeStyle.backdropFilterSaturate && `saturate(${activeStyle.backdropFilterSaturate})`].filter(Boolean).join(" "),
                  })
                }
                min={0}
                max={40}
                step={1}
                unit="px"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-400 w-14">Saturate</span>
              <UnitField
                label=""
                value={activeStyle.backdropFilterSaturate ?? ""}
                onChange={(v) =>
                  patchStyle({
                    backdropFilterSaturate: v,
                    backdropFilter: [activeStyle.backdropFilterBlur && `blur(${activeStyle.backdropFilterBlur})`, v && `saturate(${v})`].filter(Boolean).join(" "),
                  })
                }
                min={0}
                max={200}
                step={5}
                unit="%"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Raw `property: value` custom-CSS pairs, wired directly to the
 * already-existing `LayoutNodeStyle.css` bag (resolveNodeStyle.ts already
 * spreads this straight onto the wrapper's inline style) — this section is
 * UI-only, no new data model, following the reference's "+ Add" key/value
 * list pattern.
 */
function WebflowCustomPropertiesSection({
  css,
  onChange,
}: {
  css: Record<string, string> | undefined;
  onChange: (css: Record<string, string>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const entries = Object.entries(css ?? {});

  function updateEntry(index: number, key: string, value: string) {
    const next = [...entries];
    next[index] = [key, value];
    onChange(Object.fromEntries(next));
  }

  function removeEntry(index: number) {
    onChange(Object.fromEntries(entries.filter((_, i) => i !== index)));
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-zinc-400" />
          Custom Properties
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`} />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2 p-3 border-t border-zinc-800/60">
          {entries.map(([key, value], i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={key}
                onChange={(e) => updateEntry(i, e.target.value, value)}
                placeholder="property"
                className="w-1/2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-100 focus:border-amber-400/80 focus:outline-none"
              />
              <span className="text-zinc-600">:</span>
              <input
                value={value}
                onChange={(e) => updateEntry(i, key, e.target.value)}
                placeholder="value"
                className="w-1/2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-100 focus:border-amber-400/80 focus:outline-none"
              />
              <button type="button" onClick={() => removeEntry(i)} className="text-zinc-500 hover:text-red-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...(css ?? {}), "": "" })}
            className="flex items-center gap-1 self-start rounded-md border border-dashed border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:border-amber-400/60 hover:text-amber-300"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Arbitrary `key="value"` HTML attributes spread directly onto the wrapper
 * element (Settings tab, Phase 4) — wired to LayoutNodeStyle.htmlAttributes,
 * which apps/web's LayoutRenderer already sanitizes at render time
 * (event-handler and href/src keys are rejected there too, not just here).
 */
function WebflowCustomAttributesSection({
  attributes,
  onChange,
}: {
  attributes: Record<string, string> | undefined;
  onChange: (attributes: Record<string, string>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const entries = Object.entries(attributes ?? {});

  function updateEntry(index: number, key: string, value: string) {
    const next = [...entries];
    next[index] = [key, value];
    onChange(Object.fromEntries(next));
  }

  function removeEntry(index: number) {
    onChange(Object.fromEntries(entries.filter((_, i) => i !== index)));
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-zinc-400" />
          Custom attributes
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`} />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2 p-3 border-t border-zinc-800/60">
          {entries.map(([key, value], i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={key}
                onChange={(e) => updateEntry(i, e.target.value, value)}
                placeholder="name"
                className="w-1/2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-100 focus:border-amber-400/80 focus:outline-none"
              />
              <span className="text-zinc-600">=</span>
              <input
                value={value}
                onChange={(e) => updateEntry(i, key, e.target.value)}
                placeholder="value"
                className="w-1/2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-100 focus:border-amber-400/80 focus:outline-none"
              />
              <button type="button" onClick={() => removeEntry(i)} className="text-zinc-500 hover:text-red-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...(attributes ?? {}), "": "" })}
            className="flex items-center gap-1 self-start rounded-md border border-dashed border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:border-amber-400/60 hover:text-amber-300"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      )}
    </div>
  );
}

function WebflowBackgroundsSection({
  activeStyle,
  patchStyle,
}: {
  activeStyle: ResponsiveStyleFields;
  patchStyle: (patch: ResponsiveStyleFields) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingLayer, setEditingLayer] = useState(false);

  const currentColor = String(activeStyle.backgroundColor || activeStyle.background || "transparent");
  const currentClip = String(activeStyle.backgroundClip || "none").toLowerCase();

  const currentBgImage = String(activeStyle.backgroundImage || "");
  const currentBgSize = String(activeStyle.backgroundSize || "custom").toLowerCase();
  const currentBgPosition = String(activeStyle.backgroundPosition || "top left").toLowerCase();
  const currentBgRepeat = String(activeStyle.backgroundRepeat || "repeat").toLowerCase();
  const currentBgAttachment = String(activeStyle.backgroundAttachment || "scroll").toLowerCase();

  const extractUrl = (str: string) => {
    const m = str.match(/url\(['"]?(.*?)['"]?\)/i);
    return m ? m[1] : str;
  };

  const cleanUrl = extractUrl(currentBgImage);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <Box className="h-3.5 w-3.5 text-zinc-400" />
          Backgrounds
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 p-3 border-t border-zinc-800/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">Image & gradient</span>
            <button
              type="button"
              onClick={() => setEditingLayer(!editingLayer)}
              className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {editingLayer && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-12">Type</span>
                <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                  <button type="button" className="flex-1 py-1 flex justify-center bg-zinc-800 text-zinc-100 rounded">
                    <Box className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="flex-1 py-1 flex justify-center text-zinc-400 hover:text-zinc-200">
                    <div className="h-3.5 w-3.5 rounded-sm bg-gradient-to-r from-zinc-400 to-zinc-700" />
                  </button>
                  <button type="button" className="flex-1 py-1 flex justify-center text-zinc-400 hover:text-zinc-200">
                    <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-r from-zinc-400 to-zinc-700" />
                  </button>
                  <button type="button" className="flex-1 py-1 flex justify-center text-zinc-400 hover:text-zinc-200">
                    <div className="h-3.5 w-3.5 bg-zinc-400 rounded-sm" />
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-2.5">
                <div className="h-16 w-16 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center overflow-hidden">
                  {cleanUrl ? (
                    // Admin-only media preview thumbnail, not page-facing —
                    // same reasoning as Gallery's own usage elsewhere.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cleanUrl} alt="Background" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[9px] text-zinc-500 text-center font-mono">Background Image</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-mono text-zinc-200 truncate w-32">{cleanUrl || "background-image.svg"}</span>
                  <span className="text-[10px] text-zinc-500">250 × 250</span>
                  <span className="text-[10px] text-zinc-500">3.4 kB</span>
                  <label className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer">
                    <input type="checkbox" className="rounded accent-amber-400" /> @2x
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const url = prompt("Enter Image URL:", cleanUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe");
                  if (url) patchStyle({ backgroundImage: `url('${url}')` });
                }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Choose image
              </button>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-12">Size</span>
                <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                  <button
                    type="button"
                    onClick={() => patchStyle({ backgroundSize: "auto" })}
                    className={`flex-1 py-1 text-center text-xs font-medium rounded ${currentBgSize === "auto" || currentBgSize === "custom" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                  >
                    Custom
                  </button>
                  <button
                    type="button"
                    onClick={() => patchStyle({ backgroundSize: "cover" })}
                    className={`flex-1 py-1 text-center text-xs font-medium rounded ${currentBgSize === "cover" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                  >
                    Cover
                  </button>
                  <button
                    type="button"
                    onClick={() => patchStyle({ backgroundSize: "contain" })}
                    className={`flex-1 py-1 text-center text-xs font-medium rounded ${currentBgSize === "contain" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                  >
                    Contain
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-12">Position</span>
                <div className="flex items-center gap-3">
                  <div className="grid grid-cols-3 gap-1 rounded-md border border-zinc-800 bg-zinc-950 p-1.5">
                    {[
                      "top left", "top center", "top right",
                      "center left", "center center", "center right",
                      "bottom left", "bottom center", "bottom right",
                    ].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => patchStyle({ backgroundPosition: pos })}
                        className={`h-2.5 w-2.5 rounded-full transition-all ${currentBgPosition === pos ? "bg-amber-400 ring-2 ring-amber-400/40" : "bg-zinc-700 hover:bg-zinc-500"}`}
                      />
                    ))}
                  </div>

                  <div className="flex flex-col gap-1">
                    <WebflowSizeInput label="Left" value={currentBgPosition.includes("left") ? "0px" : "auto"} onChange={(v) => patchStyle({ backgroundPosition: `${v} top` })} defaultUnit="px" />
                    <WebflowSizeInput label="Top" value={currentBgPosition.includes("top") ? "0px" : "auto"} onChange={(v) => patchStyle({ backgroundPosition: `left ${v}` })} defaultUnit="px" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-12">Tile</span>
                <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                  <button
                    type="button"
                    onClick={() => patchStyle({ backgroundRepeat: "repeat" })}
                    title="Repeat Both"
                    className={`flex-1 py-1 flex justify-center rounded ${currentBgRepeat === "repeat" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => patchStyle({ backgroundRepeat: "repeat-x" })}
                    title="Horizontal Repeat"
                    className={`flex-1 py-1 flex justify-center rounded ${currentBgRepeat === "repeat-x" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                  >
                    ⋯
                  </button>
                  <button
                    type="button"
                    onClick={() => patchStyle({ backgroundRepeat: "repeat-y" })}
                    title="Vertical Repeat"
                    className={`flex-1 py-1 flex justify-center rounded ${currentBgRepeat === "repeat-y" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                  >
                    ⋮
                  </button>
                  <button
                    type="button"
                    onClick={() => patchStyle({ backgroundRepeat: "no-repeat" })}
                    title="Don't Tile"
                    className={`flex-1 py-1 flex justify-center rounded ${currentBgRepeat === "no-repeat" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-12">Fixed</span>
                <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                  <button
                    type="button"
                    onClick={() => patchStyle({ backgroundAttachment: "fixed" })}
                    className={`flex-1 py-1 text-center text-xs font-medium rounded ${currentBgAttachment === "fixed" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => patchStyle({ backgroundAttachment: "scroll" })}
                    className={`flex-1 py-1 text-center text-xs font-medium rounded ${currentBgAttachment === "scroll" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                  >
                    Not fixed
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentBgImage && (
            <button
              type="button"
              onClick={() => setEditingLayer(!editingLayer)}
              className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
            >
              <div className="flex items-center gap-2 font-mono text-[11px] truncate">
                <Box className="h-3.5 w-3.5 text-amber-400" />
                <span className="truncate">{cleanUrl || "background-image.svg"}</span>
              </div>
              <Trash2
                className="h-3.5 w-3.5 text-zinc-500 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  patchStyle({ backgroundImage: "" });
                }}
              />
            </button>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Color</span>
            <div className="flex flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
              <input
                type="color"
                value={currentColor.startsWith("#") ? currentColor : "#000000"}
                onChange={(e) => patchStyle({ backgroundColor: e.target.value, background: e.target.value })}
                className="h-4 w-4 rounded border-none bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={currentColor}
                onChange={(e) => patchStyle({ backgroundColor: e.target.value, background: e.target.value })}
                className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Clipping</span>
            <select
              value={currentClip}
              onChange={(e) => patchStyle({ backgroundClip: e.target.value })}
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="none">None</option>
              <option value="text">Clip text to background</option>
              <option value="padding-box">padding-box</option>
              <option value="content-box">content-box</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function WebflowBordersSection({
  activeStyle,
  patchStyle,
}: {
  activeStyle: ResponsiveStyleFields;
  patchStyle: (patch: ResponsiveStyleFields) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isIndividualCorners, setIsIndividualCorners] = useState(false);
  const [activeSide, setActiveSide] = useState<"all" | "top" | "right" | "bottom" | "left">("all");

  const currentRadius = String(activeStyle.borderRadius || "0px");
  const radiusNum = parseInt(currentRadius) || 0;

  const currentStyle = String(
    activeSide === "top"
      ? activeStyle.borderTopStyle || activeStyle.borderStyle || "none"
      : activeSide === "right"
        ? activeStyle.borderRightStyle || activeStyle.borderStyle || "none"
        : activeSide === "bottom"
          ? activeStyle.borderBottomStyle || activeStyle.borderStyle || "none"
          : activeSide === "left"
            ? activeStyle.borderLeftStyle || activeStyle.borderStyle || "none"
            : activeStyle.borderStyle || "none"
  ).toLowerCase();

  const currentWidth = String(
    activeSide === "top"
      ? activeStyle.borderTopWidth || activeStyle.borderWidthTop || activeStyle.borderWidth || "0px"
      : activeSide === "right"
        ? activeStyle.borderRightWidth || activeStyle.borderWidthRight || activeStyle.borderWidth || "0px"
        : activeSide === "bottom"
          ? activeStyle.borderBottomWidth || activeStyle.borderWidthBottom || activeStyle.borderWidth || "0px"
          : activeSide === "left"
            ? activeStyle.borderLeftWidth || activeStyle.borderWidthLeft || activeStyle.borderWidth || "0px"
            : activeStyle.borderWidth || "0px"
  );

  const currentColor = String(
    activeSide === "top"
      ? activeStyle.borderTopColor || activeStyle.borderColor || "black"
      : activeSide === "right"
        ? activeStyle.borderRightColor || activeStyle.borderColor || "black"
        : activeSide === "bottom"
          ? activeStyle.borderBottomColor || activeStyle.borderColor || "black"
          : activeSide === "left"
            ? activeStyle.borderLeftColor || activeStyle.borderColor || "black"
            : activeStyle.borderColor || "black"
  );

  const setSideStyle = (st: string) => {
    if (activeSide === "all") patchStyle({ borderStyle: st as "none" | "solid" | "dashed" | "dotted" | "double" });
    else if (activeSide === "top") patchStyle({ borderTopStyle: st });
    else if (activeSide === "right") patchStyle({ borderRightStyle: st });
    else if (activeSide === "bottom") patchStyle({ borderBottomStyle: st });
    else if (activeSide === "left") patchStyle({ borderLeftStyle: st });
  };

  const setSideWidth = (w: string) => {
    if (activeSide === "all") patchStyle({ borderWidth: w });
    else if (activeSide === "top") patchStyle({ borderTopWidth: w, borderWidthTop: w });
    else if (activeSide === "right") patchStyle({ borderRightWidth: w, borderWidthRight: w });
    else if (activeSide === "bottom") patchStyle({ borderBottomWidth: w, borderWidthBottom: w });
    else if (activeSide === "left") patchStyle({ borderLeftWidth: w, borderWidthLeft: w });
  };

  const setSideColor = (c: string) => {
    if (activeSide === "all") patchStyle({ borderColor: c });
    else if (activeSide === "top") patchStyle({ borderTopColor: c });
    else if (activeSide === "right") patchStyle({ borderRightColor: c });
    else if (activeSide === "bottom") patchStyle({ borderBottomColor: c });
    else if (activeSide === "left") patchStyle({ borderLeftColor: c });
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <LayoutGrid className="h-3.5 w-3.5 text-zinc-400" />
          Borders &amp; Corners
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 p-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-12">Radius</span>

            <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
              <button
                type="button"
                onClick={() => setIsIndividualCorners(false)}
                title="All corners"
                className={`p-1 rounded ${!isIndividualCorners ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}
              >
                <div className="h-3.5 w-3.5 rounded border-2 border-current" />
              </button>
              <button
                type="button"
                onClick={() => setIsIndividualCorners(true)}
                title="Individual corners"
                className={`p-1 rounded ${isIndividualCorners ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}
              >
                <div className="h-3.5 w-3.5 border-2 border-dashed border-current rounded-sm" />
              </button>
            </div>

            {!isIndividualCorners ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={radiusNum}
                  onChange={(e) => patchStyle({ borderRadius: `${e.target.value}px` })}
                  className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                />
                <WebflowSizeInput label="" value={currentRadius} onChange={(v) => patchStyle({ borderRadius: v })} defaultUnit="px" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                <WebflowSizeInput label="TL" value={activeStyle.borderRadiusTopLeft} onChange={(v) => patchStyle({ borderRadiusTopLeft: v })} defaultUnit="px" />
                <WebflowSizeInput label="TR" value={activeStyle.borderRadiusTopRight} onChange={(v) => patchStyle({ borderRadiusTopRight: v })} defaultUnit="px" />
                <WebflowSizeInput label="BL" value={activeStyle.borderRadiusBottomLeft} onChange={(v) => patchStyle({ borderRadiusBottomLeft: v })} defaultUnit="px" />
                <WebflowSizeInput label="BR" value={activeStyle.borderRadiusBottomRight} onChange={(v) => patchStyle({ borderRadiusBottomRight: v })} defaultUnit="px" />
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800/40 pt-2 flex flex-col gap-2">
            <span className="text-[11px] font-medium text-zinc-400">Borders</span>

            <div className="flex items-center gap-4">
              <div className="relative flex flex-col items-center gap-1 w-20">
                <button
                  type="button"
                  onClick={() => setActiveSide("top")}
                  className={`h-5 w-7 rounded flex items-center justify-center border transition-all ${
                    activeSide === "top" ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="h-0.5 w-4 bg-current" />
                </button>

                <div className="flex items-center justify-between gap-1 w-full">
                  <button
                    type="button"
                    onClick={() => setActiveSide("left")}
                    className={`h-5 w-5 rounded flex items-center justify-center border transition-all ${
                      activeSide === "left" ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="h-4 w-0.5 bg-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSide("all")}
                    className={`h-6 w-6 rounded flex items-center justify-center border transition-all ${
                      activeSide === "all" ? "border-amber-400 bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/40" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="h-3.5 w-3.5 rounded-sm border-2 border-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSide("right")}
                    className={`h-5 w-5 rounded flex items-center justify-center border transition-all ${
                      activeSide === "right" ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="h-4 w-0.5 bg-current" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSide("bottom")}
                  className={`h-5 w-7 rounded flex items-center justify-center border transition-all ${
                    activeSide === "bottom" ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="h-0.5 w-4 bg-current" />
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-400 w-10">Style</span>
                  <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                    <button
                      type="button"
                      onClick={() => setSideStyle("none")}
                      title="None"
                      className={`flex-1 py-1 flex justify-center rounded ${currentStyle === "none" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSideStyle("solid")}
                      title="Solid"
                      className={`flex-1 py-1 flex justify-center rounded ${currentStyle === "solid" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                    >
                      —
                    </button>
                    <button
                      type="button"
                      onClick={() => setSideStyle("dashed")}
                      title="Dashed"
                      className={`flex-1 py-1 flex justify-center rounded ${currentStyle === "dashed" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                    >
                      ---
                    </button>
                    <button
                      type="button"
                      onClick={() => setSideStyle("dotted")}
                      title="Dotted"
                      className={`flex-1 py-1 flex justify-center rounded ${currentStyle === "dotted" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                    >
                      •••
                    </button>
                  </div>
                </div>

                <WebflowSizeInput label="Width" value={currentWidth} onChange={(v) => setSideWidth(v)} defaultUnit="px" />

                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-400 w-10">Color</span>
                  <div className="flex flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
                    <input
                      type="color"
                      value={currentColor.startsWith("#") ? currentColor : "#000000"}
                      onChange={(e) => setSideColor(e.target.value)}
                      className="h-3.5 w-3.5 rounded border-none bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={currentColor}
                      onChange={(e) => setSideColor(e.target.value)}
                      className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WebflowTypographySection({
  activeStyle,
  patchStyle,
}: {
  activeStyle: ResponsiveStyleFields;
  patchStyle: (patch: ResponsiveStyleFields) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [editingShadowIndex, setEditingShadowIndex] = useState<number | null>(null);

  const currentFont = String(activeStyle.fontFamily || "system-ui");
  const currentWeight = String(activeStyle.fontWeight || "400");
  const currentColor = String(activeStyle.color || "black");
  const currentAlign = String(activeStyle.textAlign || activeStyle.align || "left").toLowerCase();
  const currentDecor = String(activeStyle.textDecoration || "none").toLowerCase();

  const currentFontStyle = String(activeStyle.fontStyle || "normal").toLowerCase();
  const currentTransform = String(activeStyle.textTransform || "none").toLowerCase();
  const currentDirection = String(activeStyle.textDirection || "ltr").toLowerCase();

  const currentWordBreak = String(activeStyle.wordBreak || "normal");
  const currentWhiteSpace = String(activeStyle.whiteSpace || "normal");
  const currentTextWrap = String(activeStyle.textWrap || "normal");
  const currentTextOverflow = String(activeStyle.textOverflow || "clip").toLowerCase();

  const currentStrokeWidth = String(activeStyle.webkitTextStrokeWidth || activeStyle.textStrokeWidth || "0px");
  const currentStrokeColor = String(activeStyle.webkitTextStrokeColor || activeStyle.textStrokeColor || "black");

  const rawShadow = String(activeStyle.textShadow || "");
  const shadows = rawShadow ? [rawShadow] : [];

  const parseTextShadow = (str: string) => {
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 3) {
      return {
        x: parseInt(parts[0]) || 0,
        y: parseInt(parts[1]) || 1,
        blur: parseInt(parts[2]) || 1,
        color: parts.slice(3).join(" ") || "rgba(0, 0, 0, 0.2)",
      };
    }
    return { x: 0, y: 1, blur: 1, color: "rgba(0, 0, 0, 0.2)" };
  };

  const updateShadow = (x: number, y: number, blur: number, color: string) => {
    const newShadowStr = `${x}px ${y}px ${blur}px ${color}`;
    patchStyle({ textShadow: newShadowStr });
  };

  const activeShadowParsed = shadows.length > 0 ? parseTextShadow(shadows[0]) : { x: 0, y: 1, blur: 1, color: "rgba(0, 0, 0, 0.2)" };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5 text-zinc-400" />
          Typography
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 p-3 border-t border-zinc-800/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Font</span>
            <select
              value={currentFont}
              onChange={(e) => patchStyle({ fontFamily: e.target.value })}
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="system-ui">system-ui</option>
              <option value="Inter, sans-serif">Inter</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Helvetica, sans-serif">Helvetica</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
              <option value="Verdana, sans-serif">Verdana</option>
              <option value="monospace">Monospace</option>
              <option value="'Playfair Display', serif">Playfair Display</option>
              <option value="Poppins, sans-serif">Poppins</option>
              <option value="Montserrat, sans-serif">Montserrat</option>
              <option value="Roboto, sans-serif">Roboto</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Weight</span>
            <select
              value={currentWeight}
              onChange={(e) => patchStyle({ fontWeight: e.target.value as LayoutNodeStyle["fontWeight"] })}
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="100">100 - Thin</option>
              <option value="200">200 - Extra Light</option>
              <option value="300">300 - Light</option>
              <option value="400">400 - Normal</option>
              <option value="500">500 - Medium</option>
              <option value="600">600 - Semi Bold</option>
              <option value="700">700 - Bold</option>
              <option value="800">800 - Extra Bold</option>
              <option value="900">900 - Black</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <WebflowSizeInput label="Size" value={activeStyle.fontSize} onChange={(v) => patchStyle({ fontSize: v })} defaultUnit="rem" />
            <WebflowSizeInput label="Height" value={activeStyle.lineHeight} onChange={(v) => patchStyle({ lineHeight: v })} defaultUnit="-" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Color</span>
            <div className="flex flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
              <input
                type="color"
                value={currentColor.startsWith("#") ? currentColor : "#000000"}
                onChange={(e) => patchStyle({ color: e.target.value })}
                className="h-4 w-4 rounded border-none bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={currentColor}
                onChange={(e) => patchStyle({ color: e.target.value })}
                className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Align</span>
            <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              <button
                type="button"
                onClick={() => patchStyle({ textAlign: "left", align: "left" })}
                title="Align Left"
                className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                  currentAlign === "left" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ textAlign: "center", align: "center" })}
                title="Align Center"
                className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                  currentAlign === "center" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ textAlign: "right", align: "right" })}
                title="Align Right"
                className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                  currentAlign === "right" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ textAlign: "justify", align: "justify" })}
                title="Align Justify"
                className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                  currentAlign === "justify" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Decor</span>
            <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              <button
                type="button"
                onClick={() => patchStyle({ textDecoration: "none" })}
                title="None"
                className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                  currentDecor === "none" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ textDecoration: "line-through" })}
                title="Strikethrough"
                className={`flex-1 flex items-center justify-center rounded-md py-1 text-xs font-bold transition-all line-through ${
                  currentDecor === "line-through" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                T
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ textDecoration: "overline" })}
                title="Overline"
                className={`flex-1 flex items-center justify-center rounded-md py-1 text-xs font-bold transition-all overline ${
                  currentDecor === "overline" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                T
              </button>
              <button
                type="button"
                onClick={() => patchStyle({ textDecoration: "underline" })}
                title="Underline"
                className={`flex-1 flex items-center justify-center rounded-md py-1 text-xs font-bold transition-all underline ${
                  currentDecor === "underline" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                T
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-800/40 pt-2">
            <button
              type="button"
              onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
            >
              {moreOptionsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              More type options
            </button>

            {moreOptionsOpen && (
              <div className="flex flex-col gap-3 mt-3 pl-2">
                <div className="grid grid-cols-3 gap-2">
                  <WebflowSizeInput label="Letter" value={activeStyle.letterSpacing} onChange={(v) => patchStyle({ letterSpacing: v })} defaultUnit="px" />
                  <WebflowSizeInput label="Indent" value={activeStyle.textIndent} onChange={(v) => patchStyle({ textIndent: v })} defaultUnit="px" />
                  <WebflowSizeInput label="Cols" value={activeStyle.columnCount} onChange={(v) => patchStyle({ columnCount: v })} allowNone={true} />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] text-zinc-500 font-medium">Italicize</span>
                    <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
                      <button
                        type="button"
                        onClick={() => patchStyle({ fontStyle: "normal" })}
                        className={`px-2 py-0.5 text-xs font-bold rounded ${currentFontStyle === "normal" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => patchStyle({ fontStyle: "italic" })}
                        className={`px-2 py-0.5 text-xs font-bold italic rounded ${currentFontStyle === "italic" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        I
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] text-zinc-500 font-medium">Capitalize</span>
                    <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
                      <button
                        type="button"
                        onClick={() => patchStyle({ textTransform: "none" })}
                        className={`px-1.5 py-0.5 text-xs rounded ${currentTransform === "none" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => patchStyle({ textTransform: "uppercase" })}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${currentTransform === "uppercase" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        AA
                      </button>
                      <button
                        type="button"
                        onClick={() => patchStyle({ textTransform: "capitalize" })}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${currentTransform === "capitalize" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        Aa
                      </button>
                      <button
                        type="button"
                        onClick={() => patchStyle({ textTransform: "lowercase" })}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${currentTransform === "lowercase" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        aa
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] text-zinc-500 font-medium">Direction</span>
                    <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
                      <button
                        type="button"
                        onClick={() => patchStyle({ textDirection: "ltr" })}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${currentDirection === "ltr" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        LTR
                      </button>
                      <button
                        type="button"
                        onClick={() => patchStyle({ textDirection: "rtl" })}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${currentDirection === "rtl" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        RTL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-400 w-10">Word</span>
                    <select
                      value={currentWordBreak}
                      onChange={(e) => patchStyle({ wordBreak: e.target.value })}
                      className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="break-all">Break-All</option>
                      <option value="keep-all">Keep-All</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-400 w-10">Line</span>
                    <select
                      value={currentWhiteSpace}
                      onChange={(e) => patchStyle({ whiteSpace: e.target.value })}
                      className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="nowrap">No-Wrap</option>
                      <option value="pre">Pre</option>
                      <option value="pre-wrap">Pre-Wrap</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-400 w-10">Wrap</span>
                    <select
                      value={currentTextWrap}
                      onChange={(e) => patchStyle({ textWrap: e.target.value })}
                      className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="nowrap">No-Wrap</option>
                      <option value="balance">Balance</option>
                      <option value="pretty">Pretty</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-400 w-12">Truncate</span>
                    <div className="flex flex-1 items-center rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
                      <button
                        type="button"
                        onClick={() => patchStyle({ textOverflow: "clip" })}
                        className={`flex-1 text-center py-0.5 text-[10px] font-medium rounded ${currentTextOverflow === "clip" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        Clip
                      </button>
                      <button
                        type="button"
                        onClick={() => patchStyle({ textOverflow: "ellipsis" })}
                        className={`flex-1 text-center py-0.5 text-[10px] font-medium rounded ${currentTextOverflow === "ellipsis" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
                      >
                        Ellipsis
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-400 w-14">Stroke</span>
                  <div className="flex flex-1 items-center gap-2">
                    <WebflowSizeInput label="Width" value={currentStrokeWidth} onChange={(v) => patchStyle({ webkitTextStrokeWidth: v, textStrokeWidth: v })} defaultUnit="px" />
                    <div className="flex flex-1 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
                      <input
                        type="color"
                        value={currentStrokeColor.startsWith("#") ? currentStrokeColor : "#000000"}
                        onChange={(e) => patchStyle({ webkitTextStrokeColor: e.target.value, textStrokeColor: e.target.value })}
                        className="h-3.5 w-3.5 rounded border-none bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentStrokeColor}
                        onChange={(e) => patchStyle({ webkitTextStrokeColor: e.target.value, textStrokeColor: e.target.value })}
                        className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800/40 pt-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Text shadows</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateShadow(0, 1, 1, "rgba(0, 0, 0, 0.2)");
                        setEditingShadowIndex(0);
                      }}
                      className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded hover:bg-zinc-800"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {shadows.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {shadows.map((sh, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingShadowIndex(editingShadowIndex === idx ? null : idx)}
                            className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
                          >
                            <span className="font-mono text-[11px]">Text shadow: {sh}</span>
                            <Trash2
                              className="h-3.5 w-3.5 text-zinc-500 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                patchStyle({ textShadow: "" });
                                setEditingShadowIndex(null);
                              }}
                            />
                          </button>

                          {editingShadowIndex === idx && (
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl flex flex-col gap-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-zinc-400 w-8">X</span>
                                <input
                                  type="range"
                                  min={-50}
                                  max={50}
                                  value={activeShadowParsed.x}
                                  onChange={(e) =>
                                    updateShadow(parseInt(e.target.value) || 0, activeShadowParsed.y, activeShadowParsed.blur, activeShadowParsed.color)
                                  }
                                  className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                                />
                                <div className="flex items-center rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-xs font-mono text-zinc-100">
                                  {activeShadowParsed.x} PX
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-zinc-400 w-8">Y</span>
                                <input
                                  type="range"
                                  min={-50}
                                  max={50}
                                  value={activeShadowParsed.y}
                                  onChange={(e) =>
                                    updateShadow(activeShadowParsed.x, parseInt(e.target.value) || 0, activeShadowParsed.blur, activeShadowParsed.color)
                                  }
                                  className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                                />
                                <div className="flex items-center rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-xs font-mono text-zinc-100">
                                  {activeShadowParsed.y} PX
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-zinc-400 w-8">Blur</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={50}
                                  value={activeShadowParsed.blur}
                                  onChange={(e) =>
                                    updateShadow(activeShadowParsed.x, activeShadowParsed.y, parseInt(e.target.value) || 0, activeShadowParsed.color)
                                  }
                                  className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg"
                                />
                                <div className="flex items-center rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-xs font-mono text-zinc-100">
                                  {activeShadowParsed.blur} PX
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-zinc-400 w-8">Color</span>
                                <div className="flex flex-1 items-center gap-2 rounded border border-zinc-800 bg-zinc-950 px-2 py-1">
                                  <input
                                    type="text"
                                    value={activeShadowParsed.color}
                                    onChange={(e) =>
                                      updateShadow(activeShadowParsed.x, activeShadowParsed.y, activeShadowParsed.blur, e.target.value)
                                    }
                                    className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// `label` is optional: WebflowSizeSection's own grid supplies row/column
// headers instead and calls this without one (that's the caller most prone
// to width starvation — 3 side-by-side boxes in a narrow sidebar), while
// every other caller (padding/margin controls, etc.) keeps its own inline
// label. Either way, the value+unit box itself used to have a fixed-width
// (`w-12`) input that couldn't shrink, so at a narrow enough width it
// collided with the unit <select> instead of yielding space to it.
// `flex-1 min-w-0` on the input (a true 0 flex-basis, not just a shrink
// hint) and `shrink-0` on the select fixes that structurally for every
// caller: the input always yields first, the select never gets squeezed,
// and they can never overlap regardless of how narrow the box gets.
function WebflowSizeInput({
  label,
  value,
  onChange,
  defaultUnit = "px",
  allowNone = false,
}: {
  label?: string;
  value?: string;
  onChange: (v: string) => void;
  defaultUnit?: string;
  allowNone?: boolean;
}) {
  const parseVal = (strVal?: string) => {
    if (!strVal || strVal === "") return { num: "", unit: allowNone ? "none" : "auto", isAuto: !allowNone, isNone: allowNone };
    const s = String(strVal).trim().toLowerCase();
    if (s === "auto") return { num: "", unit: "auto", isAuto: true, isNone: false };
    if (s === "none") return { num: "", unit: "none", isAuto: false, isNone: true };
    const match = s.match(/^([+-]?\d+(?:\.\d+)?)\s*([a-z%]*)$/i);
    if (match) {
      return { num: match[1], unit: match[2] || defaultUnit, isAuto: false, isNone: false };
    }
    return { num: s, unit: defaultUnit, isAuto: false, isNone: false };
  };

  const parsed = parseVal(value);

  const box = (
    <div className="flex min-w-0 flex-1 items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
      <input
        type="text"
        value={parsed.isAuto ? "Auto" : parsed.isNone ? "None" : parsed.num}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (v.toLowerCase() === "auto") onChange("auto");
          else if (v.toLowerCase() === "none") onChange("none");
          else if (v === "") onChange(allowNone ? "none" : "auto");
          else onChange(`${v}${parsed.unit === "auto" || parsed.unit === "none" ? defaultUnit : parsed.unit}`);
        }}
        className="w-0 min-w-0 flex-1 truncate bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
      />
      <select
        value={parsed.unit}
        onChange={(e) => {
          const u = e.target.value;
          if (u === "auto") onChange("auto");
          else if (u === "none") onChange("none");
          else onChange(`${parsed.num || "0"}${u}`);
        }}
        className="shrink-0 bg-transparent text-[10px] font-bold text-zinc-400 focus:outline-none uppercase cursor-pointer"
      >
        {!allowNone && <option value="auto">AUTO</option>}
        {allowNone && <option value="none">NONE</option>}
        <option value="px">PX</option>
        <option value="%">%</option>
        <option value="vw">VW</option>
        <option value="vh">VH</option>
        <option value="rem">REM</option>
        <option value="em">EM</option>
      </select>
    </div>
  );

  if (!label) return box;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="w-14 shrink-0 text-[11px] font-medium text-zinc-400">{label}</span>
      {box}
    </div>
  );
}

function WebflowSizeSection({
  activeStyle,
  patchStyle,
}: {
  activeStyle: ResponsiveStyleFields;
  patchStyle: (patch: ResponsiveStyleFields) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const currentOverflow = String(activeStyle.overflow || "visible").toLowerCase();
  const currentRatio = String(activeStyle.aspectRatio || "auto");
  const currentBoxSizing = String(activeStyle.boxSizing || "border-box").toLowerCase();

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <Maximize2 className="h-3.5 w-3.5 text-zinc-400" />
          Sizing &amp; Overflow
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 p-3 border-t border-zinc-800/60">
          <div className="grid grid-cols-[36px_1fr_1fr] items-center gap-x-2 gap-y-1.5">
            <span />
            <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Width</span>
            <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Height</span>

            <span className="text-[11px] text-zinc-400">Size</span>
            <WebflowSizeInput value={activeStyle.width} onChange={(v) => patchStyle({ width: v })} />
            <WebflowSizeInput value={activeStyle.height} onChange={(v) => patchStyle({ height: v })} defaultUnit="vh" />

            <span className="text-[11px] text-zinc-400">Min</span>
            <WebflowSizeInput value={activeStyle.minWidth} onChange={(v) => patchStyle({ minWidth: v })} />
            <WebflowSizeInput value={activeStyle.minHeight} onChange={(v) => patchStyle({ minHeight: v })} />

            <span className="text-[11px] text-zinc-400">Max</span>
            <WebflowSizeInput value={activeStyle.maxWidth} onChange={(v) => patchStyle({ maxWidth: v })} allowNone={true} />
            <WebflowSizeInput value={activeStyle.maxHeight} onChange={(v) => patchStyle({ maxHeight: v })} allowNone={true} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-zinc-800/40 pt-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Overflow</span>
            <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              <button
                type="button"
                onClick={() => patchStyle({ overflow: "visible" })}
                title="Visible"
                className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                  currentOverflow === "visible" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => patchStyle({ overflow: "hidden" })}
                title="Hidden"
                className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                  currentOverflow === "hidden" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => patchStyle({ overflow: "scroll" })}
                title="Scroll"
                className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                  currentOverflow === "scroll" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Crop className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => patchStyle({ overflow: "clip" })}
                title="Clip"
                className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                  currentOverflow === "clip" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Scissors className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => patchStyle({ overflow: "auto" })}
                title="Auto"
                className={`flex-1 flex items-center justify-center rounded-md py-1 text-xs font-medium transition-all ${
                  currentOverflow === "auto" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Auto
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-800/40 pt-2">
            <button
              type="button"
              onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
            >
              {moreOptionsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              More size options
            </button>

            {moreOptionsOpen && (
              <div className="flex flex-col gap-2.5 mt-2.5 pl-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-400 w-14">Ratio</span>
                  <select
                    value={currentRatio}
                    onChange={(e) => patchStyle({ aspectRatio: e.target.value })}
                    className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="auto">Auto</option>
                    <option value="1 / 1">1:1 (Square)</option>
                    <option value="16 / 9">16:9 (Widescreen)</option>
                    <option value="4 / 3">4:3</option>
                    <option value="3 / 2">3:2</option>
                    <option value="2 / 1">2:1</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-400 w-14">Box size</span>
                  <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                    <button
                      type="button"
                      onClick={() => patchStyle({ boxSizing: "border-box" })}
                      title="Border-box"
                      className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                        currentBoxSizing === "border-box" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <svg className="h-4 w-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
                        <rect x="4" y="4" width="16" height="16" rx="1" strokeDasharray="3 3" />
                        <rect x="8" y="8" width="8" height="8" rx="0.5" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => patchStyle({ boxSizing: "content-box" })}
                      title="Content-box"
                      className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                        currentBoxSizing === "content-box" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <svg className="h-4 w-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
                        <rect x="4" y="4" width="16" height="16" rx="1" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WebflowPositionSection({
  activeStyle,
  patchStyle,
}: {
  activeStyle: ResponsiveStyleFields;
  patchStyle: (patch: ResponsiveStyleFields) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [floatClearOpen, setFloatClearOpen] = useState(false);

  const currentPos = String(activeStyle.position || "static").toLowerCase();
  const currentFloat = String(activeStyle.float || "none").toLowerCase();
  const currentClear = String(activeStyle.clear || "none").toLowerCase();

  const isPositioned = currentPos !== "static";

  const applyPresetPin = (preset: string) => {
    if (preset === "full") {
      patchStyle({ top: "0px", right: "0px", bottom: "0px", left: "0px" });
    } else if (preset === "top-left") {
      patchStyle({ top: "0px", left: "0px", right: "auto", bottom: "auto" });
    } else if (preset === "top-right") {
      patchStyle({ top: "0px", right: "0px", left: "auto", bottom: "auto" });
    } else if (preset === "bottom-left") {
      patchStyle({ bottom: "0px", left: "0px", top: "auto", right: "auto" });
    } else if (preset === "bottom-right") {
      patchStyle({ bottom: "0px", right: "0px", top: "auto", left: "auto" });
    } else if (preset === "top") {
      patchStyle({ top: "0px", left: "0px", right: "0px", bottom: "auto" });
    } else if (preset === "bottom") {
      patchStyle({ bottom: "0px", left: "0px", right: "0px", top: "auto" });
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <Pin className="h-3.5 w-3.5 text-zinc-400" />
          Position
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 p-3 border-t border-zinc-800/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Position</span>
            <div className="flex flex-1 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
              <span className="text-zinc-400">
                {currentPos === "static" ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5 text-amber-400" />
                )}
              </span>
              <select
                value={currentPos}
                onChange={(e) => patchStyle({ position: e.target.value as LayoutNodeStyle["position"] })}
                className="w-full bg-zinc-950 text-xs text-zinc-100 focus:outline-none capitalize cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-zinc-100"
              >
                <option value="static" className="bg-zinc-900 text-zinc-100">Static</option>
                <option value="relative" className="bg-zinc-900 text-zinc-100">Relative</option>
                <option value="absolute" className="bg-zinc-900 text-zinc-100">Absolute</option>
                <option value="fixed" className="bg-zinc-900 text-zinc-100">Fixed</option>
                <option value="sticky" className="bg-zinc-900 text-zinc-100">Sticky</option>
              </select>
            </div>
          </div>

          {isPositioned && (
            <div className="flex flex-col gap-3 pt-1 border-t border-zinc-800/40">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Presets</span>
                <div className="flex items-center gap-1">
                  {["full", "top-left", "top-right", "bottom-left", "bottom-right", "top", "bottom"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyPresetPin(preset)}
                      className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[9px] font-bold uppercase text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
                    >
                      {preset.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <WebflowSizeInput label="Top" value={activeStyle.top} onChange={(v) => patchStyle({ top: v })} allowNone={true} />
                <WebflowSizeInput label="Right" value={activeStyle.right} onChange={(v) => patchStyle({ right: v })} allowNone={true} />
                <WebflowSizeInput label="Bottom" value={activeStyle.bottom} onChange={(v) => patchStyle({ bottom: v })} allowNone={true} />
                <WebflowSizeInput label="Left" value={activeStyle.left} onChange={(v) => patchStyle({ left: v })} allowNone={true} />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-14">Z-Index</span>
                <input
                  type="text"
                  value={activeStyle.zIndex ?? ""}
                  onChange={(e) => patchStyle({ zIndex: e.target.value })}
                  placeholder="auto"
                  className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="border-t border-zinc-800/40 pt-2">
            <button
              type="button"
              onClick={() => setFloatClearOpen(!floatClearOpen)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
            >
              {floatClearOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Float and clear
            </button>

            {floatClearOpen && (
              <div className="flex flex-col gap-2.5 mt-2.5 pl-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-400 w-14">Float</span>
                  <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                    <button
                      type="button"
                      onClick={() => patchStyle({ float: "none" })}
                      title="Float None"
                      className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                        currentFloat === "none" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => patchStyle({ float: "left" })}
                      title="Float Left"
                      className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                        currentFloat === "left" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => patchStyle({ float: "right" })}
                      title="Float Right"
                      className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                        currentFloat === "right" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-400 w-14">Clear</span>
                  <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                    <button
                      type="button"
                      onClick={() => patchStyle({ clear: "none" })}
                      title="Clear None"
                      className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                        currentClear === "none" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => patchStyle({ clear: "left" })}
                      title="Clear Left"
                      className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                        currentClear === "left" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => patchStyle({ clear: "right" })}
                      title="Clear Right"
                      className={`flex-1 flex items-center justify-center rounded-md py-1 transition-all ${
                        currentClear === "right" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => patchStyle({ clear: "both" })}
                      title="Clear Both"
                      className={`flex-1 flex items-center justify-center rounded-md py-1 text-xs font-bold transition-all ${
                        currentClear === "both" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      ⟷
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WebflowSpacingSection({
  activeStyle,
  patchStyle,
}: {
  activeStyle: ResponsiveStyleFields;
  patchStyle: (patch: ResponsiveStyleFields) => void;
}) {
  const [isSpacingSynced, setIsSpacingSynced] = useState(false);
  const [activeZone, setActiveZone] = useState<keyof ResponsiveStyleFields | null>("marginBottom");

  const parseVal = (key: keyof ResponsiveStyleFields) => {
    const raw = activeStyle[key];
    if (raw === undefined || raw === null || raw === "") return { num: 0, unit: "px", isAuto: false, display: "0" };
    const strVal = String(raw).trim();
    if (strVal.toLowerCase() === "auto") return { num: 0, unit: "auto", isAuto: true, display: "Auto" };
    const match = strVal.match(/^([+-]?\d+(?:\.\d+)?)\s*([a-z%]*)$/i);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2] ? match[2].toLowerCase() : "px";
      return { num, unit, isAuto: false, display: String(num) };
    }
    return { num: 0, unit: "px", isAuto: false, display: strVal };
  };

  const marginTopParsed = parseVal("marginTop");
  const marginRightParsed = parseVal("marginRight");
  const marginBottomParsed = parseVal("marginBottom");
  const marginLeftParsed = parseVal("marginLeft");

  const paddingTopParsed = parseVal("paddingTop");
  const paddingRightParsed = parseVal("paddingRight");
  const paddingBottomParsed = parseVal("paddingBottom");
  const paddingLeftParsed = parseVal("paddingLeft");

  const updateValue = (
    key: keyof ResponsiveStyleFields,
    newValStr: string,
    modifiers?: { altKey?: boolean; shiftKey?: boolean }
  ) => {
    const isMargin = key.startsWith("margin");
    const isPadding = key.startsWith("padding");

    const patch: ResponsiveStyleFields = { [key]: newValStr };

    if (modifiers?.shiftKey || isSpacingSynced) {
      if (isMargin) {
        patch.marginTop = newValStr;
        patch.marginRight = newValStr;
        patch.marginBottom = newValStr;
        patch.marginLeft = newValStr;
      } else if (isPadding) {
        patch.paddingTop = newValStr;
        patch.paddingRight = newValStr;
        patch.paddingBottom = newValStr;
        patch.paddingLeft = newValStr;
      }
    } else if (modifiers?.altKey) {
      const oppMap: Record<string, keyof ResponsiveStyleFields> = {
        marginTop: "marginBottom",
        marginBottom: "marginTop",
        marginRight: "marginLeft",
        marginLeft: "marginRight",
        paddingTop: "paddingBottom",
        paddingBottom: "paddingTop",
        paddingRight: "paddingLeft",
        paddingLeft: "paddingRight",
      };
      const opp = oppMap[key];
      if (opp) (patch as Record<string, string>)[opp] = newValStr;
    }

    patchStyle(patch);
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    key: keyof ResponsiveStyleFields
  ) => {
    e.preventDefault();
    setActiveZone(key);

    const startX = e.clientX;
    const startY = e.clientY;
    const parsed = parseVal(key);
    const startNum = parsed.isAuto ? 0 : parsed.num;
    const unit = parsed.isAuto ? "px" : parsed.unit;
    const isVertical = key.includes("Top") || key.includes("Bottom");
    // Top/Right grow when dragged away from the box (up/right); Bottom/Left
    // grow in the opposite screen direction (down/left) — same axis, flipped
    // sign — since "away from the box" points a different way for each.
    const sign = key.includes("Bottom") || key.includes("Left") ? -1 : 1;

    const onMouseMove = (ev: MouseEvent) => {
      ev.preventDefault();
      const deltaX = ev.clientX - startX;
      const deltaY = startY - ev.clientY;
      const delta = (isVertical ? deltaY : deltaX) * sign;

      const nextNum = Math.max(0, Math.round(startNum + delta));
      updateValue(key, `${nextNum}${unit}`, { altKey: ev.altKey, shiftKey: ev.shiftKey });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const activeZoneParsed = activeZone ? parseVal(activeZone) : null;
  const isMarginZone = activeZone ? activeZone.startsWith("margin") : false;

  return (
    <AccordionSection
      title="Spacing (Box Model)"
      icon={Move}
      badge={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsSpacingSynced(!isSpacingSynced);
          }}
          title={isSpacingSynced ? "Sync All Sides (Active)" : "Sync All Sides (Disabled)"}
          className={`p-1 rounded transition-colors ${
            isSpacingSynced ? "text-amber-400 bg-amber-500/10 border border-amber-500/30" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <svg className="h-3.5 w-3.5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
            <rect x="7" y="7" width="10" height="10" rx="1" />
          </svg>
        </button>
      }
    >
        <div className="flex flex-col gap-3">
          <div className="relative w-full rounded-lg border border-zinc-800 bg-zinc-900/90 pt-3 px-3 pb-4 select-none flex flex-col items-center">
            <span className="absolute top-2 left-2.5 text-[9px] font-bold text-zinc-500 tracking-wider">MARGIN</span>

            <div className="w-full flex justify-center py-1">
              <button
                type="button"
                onMouseDown={(e) => handleMouseDown(e, "marginTop")}
                onClick={() => setActiveZone("marginTop")}
                className={`text-xs transition-all ${
                  activeZone === "marginTop"
                    ? "ring-2 ring-blue-500 border border-blue-500 bg-zinc-950 text-zinc-100 font-semibold px-2 py-0.5 rounded"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-0.5 rounded cursor-ns-resize"
                }`}
              >
                {marginTopParsed.display}
              </button>
            </div>

            <div className="w-full flex items-center justify-between gap-1">
              <button
                type="button"
                onMouseDown={(e) => handleMouseDown(e, "marginLeft")}
                onClick={() => setActiveZone("marginLeft")}
                className={`text-xs transition-all ${
                  activeZone === "marginLeft"
                    ? "ring-2 ring-blue-500 border border-blue-500 bg-zinc-950 text-zinc-100 font-semibold px-2 py-0.5 rounded"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-0.5 rounded cursor-ew-resize"
                }`}
              >
                {marginLeftParsed.display}
              </button>

              <div className="relative flex-1 rounded-md border border-zinc-800 bg-zinc-950/90 p-2.5 flex flex-col items-center">
                <span className="absolute top-1.5 left-2 text-[9px] font-bold text-zinc-500 tracking-wider">PADDING</span>

                <div className="w-full flex justify-center py-0.5">
                  <button
                    type="button"
                    onMouseDown={(e) => handleMouseDown(e, "paddingTop")}
                    onClick={() => setActiveZone("paddingTop")}
                    className={`text-xs transition-all ${
                      activeZone === "paddingTop"
                        ? "ring-2 ring-blue-500 border border-blue-500 bg-zinc-900 text-zinc-100 font-semibold px-2 py-0.5 rounded"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-0.5 rounded cursor-ns-resize"
                    }`}
                  >
                    {paddingTopParsed.display}
                  </button>
                </div>

                <div className="w-full flex items-center justify-between gap-1 py-1">
                  <button
                    type="button"
                    onMouseDown={(e) => handleMouseDown(e, "paddingLeft")}
                    onClick={() => setActiveZone("paddingLeft")}
                    className={`text-xs transition-all ${
                      activeZone === "paddingLeft"
                        ? "ring-2 ring-blue-500 border border-blue-500 bg-zinc-900 text-zinc-100 font-semibold px-2 py-0.5 rounded"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-0.5 rounded cursor-ew-resize"
                    }`}
                  >
                    {paddingLeftParsed.display}
                  </button>

                  <div className="h-5 flex-1 min-w-[24px] max-w-[48px] rounded border border-zinc-800 bg-zinc-900/60" />

                  <button
                    type="button"
                    onMouseDown={(e) => handleMouseDown(e, "paddingRight")}
                    onClick={() => setActiveZone("paddingRight")}
                    className={`text-xs transition-all ${
                      activeZone === "paddingRight"
                        ? "ring-2 ring-blue-500 border border-blue-500 bg-zinc-900 text-zinc-100 font-semibold px-2 py-0.5 rounded"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-0.5 rounded cursor-ew-resize"
                    }`}
                  >
                    {paddingRightParsed.display}
                  </button>
                </div>

                <div className="w-full flex justify-center py-0.5">
                  <button
                    type="button"
                    onMouseDown={(e) => handleMouseDown(e, "paddingBottom")}
                    onClick={() => setActiveZone("paddingBottom")}
                    className={`text-xs transition-all ${
                      activeZone === "paddingBottom"
                        ? "ring-2 ring-blue-500 border border-blue-500 bg-zinc-900 text-zinc-100 font-semibold px-2 py-0.5 rounded"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-0.5 rounded cursor-ns-resize"
                    }`}
                  >
                    {paddingBottomParsed.display}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onMouseDown={(e) => handleMouseDown(e, "marginRight")}
                onClick={() => setActiveZone("marginRight")}
                className={`text-xs transition-all ${
                  activeZone === "marginRight"
                    ? "ring-2 ring-blue-500 border border-blue-500 bg-zinc-950 text-zinc-100 font-semibold px-2 py-0.5 rounded"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-0.5 rounded cursor-ew-resize"
                }`}
              >
                {marginRightParsed.display}
              </button>
            </div>

            <div className="w-full flex justify-center py-1">
              <button
                type="button"
                onMouseDown={(e) => handleMouseDown(e, "marginBottom")}
                onClick={() => setActiveZone("marginBottom")}
                className={`text-xs transition-all ${
                  activeZone === "marginBottom"
                    ? "ring-2 ring-blue-500 border border-blue-500 bg-zinc-950 text-zinc-100 font-semibold px-2 py-0.5 rounded"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 px-2 py-0.5 rounded cursor-ns-resize"
                }`}
              >
                {marginBottomParsed.display}
              </button>
            </div>
          </div>

          {activeZone && activeZoneParsed && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="text-zinc-400">
                  {activeZone.includes("Top") ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : activeZone.includes("Bottom") ? (
                    <ArrowDown className="h-4 w-4" />
                  ) : activeZone.includes("Left") ? (
                    <ArrowLeft className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </div>

                <input
                  type="range"
                  min={0}
                  max={300}
                  value={activeZoneParsed.isAuto ? 0 : activeZoneParsed.num}
                  onChange={(e) =>
                    updateValue(
                      activeZone,
                      activeZoneParsed.isAuto ? "0px" : `${e.target.value}${activeZoneParsed.unit}`,
                      { altKey: (e as unknown as { altKey?: boolean }).altKey, shiftKey: (e as unknown as { shiftKey?: boolean }).shiftKey }
                    )
                  }
                  className="flex-1 min-w-0 accent-amber-400 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                />

                <div className="flex shrink-0 items-center rounded-md border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 gap-1">
                  <input
                    type="text"
                    value={activeZoneParsed.display}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.toLowerCase() === "auto") {
                        updateValue(activeZone, "auto");
                      } else {
                        const num = parseInt(val) || 0;
                        updateValue(activeZone, `${num}${activeZoneParsed.unit}`);
                      }
                    }}
                    className="w-10 bg-transparent text-xs text-zinc-100 font-mono text-center focus:outline-none"
                  />
                  <select
                    value={activeZoneParsed.isAuto ? "auto" : activeZoneParsed.unit}
                    onChange={(e) => {
                      const selectedUnit = e.target.value;
                      if (selectedUnit === "auto") {
                        updateValue(activeZone, "auto");
                      } else {
                        updateValue(activeZone, `${activeZoneParsed.num}${selectedUnit}`);
                      }
                    }}
                    className="bg-transparent text-[10px] font-bold text-zinc-400 focus:outline-none uppercase"
                  >
                    <option value="px">PX</option>
                    <option value="rem">REM</option>
                    <option value="em">EM</option>
                    <option value="%">%</option>
                    <option value="vw">VW</option>
                    <option value="vh">VH</option>
                    {isMarginZone && <option value="auto">AUTO</option>}
                  </select>
                </div>
              </div>

              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  disabled={!isMarginZone}
                  onClick={(e) => updateValue(activeZone, "auto", { altKey: e.altKey, shiftKey: e.shiftKey })}
                  className={`w-20 rounded-md font-semibold text-xs transition-all flex items-center justify-center ${
                    activeZoneParsed.isAuto
                      ? "bg-zinc-800 text-amber-400 ring-1 ring-amber-400/40"
                      : isMarginZone
                        ? "bg-zinc-800/80 text-zinc-200 hover:bg-zinc-800"
                        : "bg-zinc-950 text-zinc-600 cursor-not-allowed opacity-50"
                  }`}
                >
                  Auto
                </button>

                <div className="grid grid-cols-4 gap-1 flex-1">
                  {[0, 10, 20, 40, 60, 100, 140, 220].map((preset) => {
                    const presetValStr = preset === 0 ? "0" : `${preset}px`;
                    const isActive = !activeZoneParsed.isAuto && activeZoneParsed.num === preset;

                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={(e) =>
                          updateValue(activeZone, presetValStr, { altKey: e.altKey, shiftKey: e.shiftKey })
                        }
                        className={`rounded-md py-1 px-0.5 font-mono text-[10px] text-center transition-all truncate ${
                          isActive
                            ? "bg-zinc-800 text-amber-400 ring-1 ring-amber-400/40 font-semibold"
                            : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
    </AccordionSection>
  );
}

function WebflowLayoutSection({
  activeStyle,
  patchStyle,
  breakpoint,
  node,
  onChangeProps,
}: {
  activeStyle: ResponsiveStyleFields;
  patchStyle: (patch: ResponsiveStyleFields) => void;
  breakpoint: Breakpoint;
  node: LayoutNode;
  onChangeProps: (props: Record<string, unknown>) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [noneDropdownOpen, setNoneDropdownOpen] = useState(false);
  const [directionDropdownOpen, setDirectionDropdownOpen] = useState(false);
  const [isGapLocked, setIsGapLocked] = useState(true);
  const [moreGridOptionsOpen, setMoreGridOptionsOpen] = useState(false);
  const [hoveredOptionNote, setHoveredOptionNote] = useState<string | null>(null);

  const rawDisplay = activeStyle.display || (node.props.display as string) || "block";
  const currentDisplay = String(rawDisplay).toLowerCase();
  
  const currentDir = String(activeStyle.flexDirection || activeStyle.direction || (node.props.direction as string) || "row").toLowerCase();
  const currentWrap = String(activeStyle.flexWrap || activeStyle.wrap || (node.props.wrap as string) || "nowrap").toLowerCase();

  const currentJustify = String(activeStyle.justifyContent || (node.props.justifyContent as string) || "flex-start");
  const currentAlign = String(activeStyle.alignItems || (node.props.alignItems as string) || "stretch");

  const rawGap = String(activeStyle.gap || (node.props.gap as string) || "16px");
  const gapValueMatch = rawGap.match(/^(\d+(?:\.\d+)?)\s*([a-z%]*)$/i);
  const gapNum = gapValueMatch ? parseFloat(gapValueMatch[1]) : 16;
  const gapUnit = gapValueMatch && gapValueMatch[2] ? gapValueMatch[2].toLowerCase() : "px";

  const rawRowGap = String(activeStyle.rowGap || rawGap);
  const rawColGap = String(activeStyle.columnGap || rawGap);

  const gridCols = String(activeStyle.gridTemplateColumns || activeStyle.gridColumns || "2");
  const gridRows = String(activeStyle.gridTemplateRows || activeStyle.gridRows || "2");
  const gridFlow = String(activeStyle.gridAutoFlow || activeStyle.gridDirection || "row");

  const setDisplay = (val: string) => {
    patchStyle({ display: val });
    if (node.type === "Section" || node.type === "Columns") {
      onChangeProps({ display: val });
    }
  };

  const setFlexDirectionAndWrap = (dir: string, wrapVal: string) => {
    patchStyle({ flexDirection: dir as LayoutNodeStyle["flexDirection"], direction: dir as LayoutNodeStyle["direction"], flexWrap: wrapVal, wrap: wrapVal });
    if (node.type === "Section" || node.type === "Columns") {
      onChangeProps({ direction: dir, wrap: wrapVal });
    }
  };

  const setJustifyAndAlign = (just: string, algn: string) => {
    patchStyle({ justifyContent: just, alignItems: algn });
    if (node.type === "Section" || node.type === "Columns") {
      onChangeProps({ justifyContent: just, alignItems: algn });
    }
  };

  const setGapValue = (num: number, unit: string) => {
    const formatted = `${num}${unit}`;
    patchStyle({ gap: formatted });
    if (node.type === "Section" || node.type === "Columns") {
      onChangeProps({ gap: formatted });
    }
  };

  const isBlock = currentDisplay === "block";
  const isFlex = currentDisplay === "flex";
  const isGrid = currentDisplay === "grid";
  const isInlineFlex = currentDisplay === "inline-flex";
  const isInlineBlock = currentDisplay === "inline-block";
  const isInline = currentDisplay === "inline";
  const isNone = currentDisplay === "none";
  const isExpandedInlineNone = isNone || isInlineBlock || isInline || isInlineFlex;

  const displayDropdownLabel = isInlineBlock
    ? "Inline-Block"
    : isInline
      ? "Inline"
      : isInlineFlex
        ? "Inline-Flex"
        : "None";

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          <LayoutGrid className="h-3.5 w-3.5 text-zinc-400" />
          Layout &amp; Display
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 p-3 border-t border-zinc-800/60">
          {breakpoint !== "desktop" && (
            <ResponsiveFieldNote breakpoint={breakpoint} />
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 w-14">Display</span>
            <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 relative">
              <button
                type="button"
                onClick={() => setDisplay("block")}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                  isBlock ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Block
              </button>
              <button
                type="button"
                onClick={() => setDisplay("flex")}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                  isFlex ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Flex
              </button>
              <button
                type="button"
                onClick={() => setDisplay("grid")}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                  isGrid ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Grid
              </button>
              
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setNoneDropdownOpen(!noneDropdownOpen)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-medium transition-all ${
                    isExpandedInlineNone ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="truncate">{displayDropdownLabel}</span>
                  <ChevronDown className="h-3 w-3 ml-0.5 shrink-0 text-zinc-400" />
                </button>

                {noneDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNoneDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl text-zinc-200">
                      {[
                        { label: "Block", value: "block" },
                        { label: "Inline-Block", value: "inline-block" },
                        { label: "Inline", value: "inline" },
                        { label: "Inline-Flex", value: "inline-flex" },
                        { label: "None", value: "none" },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setDisplay(item.value);
                            setNoneDropdownOpen(false);
                          }}
                          className={`flex w-full items-center px-3 py-1.5 text-xs text-left transition-colors hover:bg-zinc-800 ${
                            currentDisplay === item.value ? "text-amber-400 font-semibold" : "text-zinc-300"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {(isFlex || isInlineFlex) && (
            <div className="flex flex-col gap-3 pt-1 border-t border-zinc-800/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-14">Direction</span>
                <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 relative">
                  <button
                    type="button"
                    onClick={() => setFlexDirectionAndWrap("row", "nowrap")}
                    title="Horizontal Row (→)"
                    className={`flex-1 flex items-center justify-center rounded-md py-1 text-xs transition-all ${
                      currentDir === "row" && currentWrap !== "wrap" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setFlexDirectionAndWrap("column", "nowrap")}
                    title="Vertical Column (↓)"
                    className={`flex-1 flex items-center justify-center rounded-md py-1 text-xs transition-all ${
                      currentDir === "column" && currentWrap !== "wrap" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>

                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => setDirectionDropdownOpen(!directionDropdownOpen)}
                      title="Wrap & Direction Options"
                      className={`flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs transition-all ${
                        currentWrap === "wrap" || currentWrap === "wrap-reverse" || currentDir.includes("reverse")
                          ? "bg-zinc-800 text-zinc-100 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <svg className="h-4 w-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M4 7h12a3 3 0 0 1 0 6H4m0 0l4-4m-4 4l4 4" />
                      </svg>
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {directionDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setDirectionDropdownOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-zinc-800 bg-zinc-900 py-2 shadow-2xl text-zinc-200 text-xs">
                          <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Left to right</div>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: row; flex-wrap: wrap;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("row", "wrap");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-bold">⤿</span> Wrap down
                          </button>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: row; flex-wrap: wrap-reverse;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("row", "wrap-reverse");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-bold">⤾</span> Wrap up
                          </button>

                          <div className="my-1 border-t border-zinc-800" />

                          <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Right to left</div>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: row-reverse; flex-wrap: nowrap;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("row-reverse", "nowrap");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" /> Single row
                          </button>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: row-reverse; flex-wrap: wrap;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("row-reverse", "wrap");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-bold">⤾</span> Wrap down
                          </button>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: row-reverse; flex-wrap: wrap-reverse;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("row-reverse", "wrap-reverse");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-bold">⤿</span> Wrap up
                          </button>

                          <div className="my-1 border-t border-zinc-800" />

                          <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Top to bottom</div>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: column; flex-wrap: wrap;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("column", "wrap");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-bold">⤿</span> Wrap right
                          </button>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: column; flex-wrap: wrap-reverse;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("column", "wrap-reverse");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-bold">⤾</span> Wrap left
                          </button>

                          <div className="my-1 border-t border-zinc-800" />

                          <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Bottom to top</div>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: column-reverse; flex-wrap: nowrap;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("column-reverse", "nowrap");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <ArrowUp className="h-3.5 w-3.5" /> Single column
                          </button>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: column-reverse; flex-wrap: wrap;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("column-reverse", "wrap");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-bold">⤿</span> Wrap right
                          </button>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredOptionNote("flex-direction: column-reverse; flex-wrap: wrap-reverse;")}
                            onMouseLeave={() => setHoveredOptionNote(null)}
                            onClick={() => {
                              setFlexDirectionAndWrap("column-reverse", "wrap-reverse");
                              setDirectionDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 transition-colors"
                          >
                            <span className="font-bold">⤾</span> Wrap left
                          </button>

                          <div className="mt-2 border-t border-zinc-800 pt-2 px-3 text-[10px] text-zinc-500 italic">
                            {hoveredOptionNote || "Hover an option to see direction and wrap values."}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-14">Align</span>
                
                <div className="flex flex-1 items-center gap-3">
                  <div className="h-16 w-16 shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 flex flex-col justify-between select-none relative">
                    {currentAlign === "stretch" && currentDir === "row" ? (
                      <div className={`h-full w-full flex justify-between items-center px-1 ${
                        currentJustify === "center" ? "justify-center gap-1.5" : currentJustify === "flex-end" ? "justify-end gap-1.5" : "justify-between"
                      }`}>
                        <div className="h-full w-0.5 bg-zinc-300 rounded-full" />
                        <div className="h-full w-0.5 bg-zinc-300 rounded-full" />
                        <div className="h-full w-0.5 bg-zinc-300 rounded-full" />
                      </div>
                    ) : currentAlign === "stretch" && currentDir === "column" ? (
                      <div className={`h-full w-full flex flex-col justify-between items-center py-1 ${
                        currentJustify === "center" ? "justify-center gap-1.5" : currentJustify === "flex-end" ? "justify-end gap-1.5" : "justify-between"
                      }`}>
                        <div className="w-full h-0.5 bg-zinc-300 rounded-full" />
                        <div className="w-full h-0.5 bg-zinc-300 rounded-full" />
                        <div className="w-full h-0.5 bg-zinc-300 rounded-full" />
                      </div>
                    ) : (
                      [0, 1, 2].map((r) => (
                        <div key={r} className="flex justify-between items-center">
                          {[0, 1, 2].map((c) => {
                            const isColumnDir = currentDir.includes("column");
                            const rowJustifyMap = ["flex-start", "center", "flex-end"];
                            const colAlignMap = ["flex-start", "center", "flex-end"];
                            
                            const targetJust = isColumnDir ? rowJustifyMap[r] : rowJustifyMap[c];
                            const targetAlign = isColumnDir ? colAlignMap[c] : colAlignMap[r];

                            const isCellActive = currentJustify === targetJust && currentAlign === targetAlign;

                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setJustifyAndAlign(targetJust, targetAlign)}
                                className="h-3 w-3 flex items-center justify-center rounded-full hover:bg-zinc-800 transition-colors"
                              >
                                <div
                                  className={`h-1 w-1 rounded-full transition-all ${
                                    isCellActive ? "bg-amber-400 ring-2 ring-amber-400/40 scale-125" : "bg-zinc-600"
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 w-3">X</span>
                      <select
                        value={currentDir === "column" ? currentAlign : currentJustify}
                        onChange={(e) => {
                          if (currentDir === "column") {
                            setJustifyAndAlign(currentJustify, e.target.value);
                          } else {
                            setJustifyAndAlign(e.target.value, currentAlign);
                          }
                        }}
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="flex-start">Left</option>
                        <option value="center">Center</option>
                        <option value="flex-end">Right</option>
                        <option value="space-between">Space-Between</option>
                        <option value="space-around">Space-Around</option>
                        <option value="stretch">Stretch</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 w-3">Y</span>
                      <select
                        value={currentDir === "column" ? currentJustify : currentAlign}
                        onChange={(e) => {
                          if (currentDir === "column") {
                            setJustifyAndAlign(e.target.value, currentAlign);
                          } else {
                            setJustifyAndAlign(currentJustify, e.target.value);
                          }
                        }}
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="flex-start">Top</option>
                        <option value="center">Center</option>
                        <option value="flex-end">Bottom</option>
                        <option value="stretch">Stretch</option>
                        <option value="baseline">Baseline</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-14">Gap</span>
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={gapNum}
                    onChange={(e) => setGapValue(Number(e.target.value), gapUnit)}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 gap-1">
                    <input
                      type="text"
                      value={gapNum}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setGapValue(val, gapUnit);
                      }}
                      className="w-8 bg-transparent text-xs text-zinc-100 text-center font-mono focus:outline-none"
                    />
                    <select
                      value={gapUnit}
                      onChange={(e) => setGapValue(gapNum, e.target.value)}
                      className="bg-transparent text-[10px] font-bold text-zinc-400 focus:outline-none uppercase"
                    >
                      <option value="px">PX</option>
                      <option value="rem">REM</option>
                      <option value="em">EM</option>
                      <option value="%">%</option>
                      <option value="vw">VW</option>
                      <option value="vh">VH</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGapLocked(!isGapLocked)}
                    title={isGapLocked ? "Gap Locked" : "Gap Unlocked"}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                  >
                    {isGapLocked ? <Lock className="h-3.5 w-3.5 text-zinc-400" /> : <Unlink className="h-3.5 w-3.5 text-amber-400" />}
                  </button>
                </div>
              </div>

              {!isGapLocked && (
                <div className="flex flex-col gap-1.5 pl-16">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 w-12">Row Gap</span>
                    <input
                      type="text"
                      value={rawRowGap}
                      onChange={(e) => patchStyle({ rowGap: e.target.value })}
                      className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-100 font-mono"
                      placeholder="e.g. 16px"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 w-12">Col Gap</span>
                    <input
                      type="text"
                      value={rawColGap}
                      onChange={(e) => patchStyle({ columnGap: e.target.value })}
                      className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-100 font-mono"
                      placeholder="e.g. 16px"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {isGrid && (
            <div className="flex flex-col gap-3 pt-1 border-t border-zinc-800/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-14">Grid</span>
                <div className="flex flex-1 items-center gap-2">
                  <div className="flex flex-col items-center flex-1">
                    <input
                      type="text"
                      value={gridCols}
                      onChange={(e) => patchStyle({ gridTemplateColumns: e.target.value, gridColumns: e.target.value })}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 font-mono text-center focus:border-amber-400 focus:outline-none"
                    />
                    <span className="text-[9px] font-medium text-zinc-500 mt-0.5">Columns</span>
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <input
                      type="text"
                      value={gridRows}
                      onChange={(e) => patchStyle({ gridTemplateRows: e.target.value, gridRows: e.target.value })}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 font-mono text-center focus:border-amber-400 focus:outline-none"
                    />
                    <span className="text-[9px] font-medium text-zinc-500 mt-0.5">Rows</span>
                  </div>
                  <button type="button" className="p-1.5 rounded border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200" title="Edit Grid Layout">
                    <Sliders className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-14">Direction</span>
                <div className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                    <button
                      type="button"
                      onClick={() => patchStyle({ gridAutoFlow: "row", gridDirection: "row" })}
                      className={`flex-1 flex items-center justify-center rounded-md py-1 text-xs transition-all ${
                        gridFlow === "row" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      title="Row Auto-Flow"
                    >
                      <span className="font-bold">⤿</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => patchStyle({ gridAutoFlow: "column", gridDirection: "column" })}
                      className={`flex-1 flex items-center justify-center rounded-md py-1 text-xs transition-all ${
                        gridFlow === "column" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      title="Column Auto-Flow"
                    >
                      <span className="font-bold">⤾</span>
                    </button>
                  </div>
                  <LayoutGrid className="h-4 w-4 text-zinc-500" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-14">Align</span>
                <div className="flex flex-1 items-center gap-3">
                  <div className="h-14 w-14 shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 p-2 flex items-center justify-center text-zinc-500">
                    <LayoutGrid className="h-6 w-6 stroke-1 text-zinc-400" />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 w-3">X</span>
                      <select
                        value={currentJustify}
                        onChange={(e) => setJustifyAndAlign(e.target.value, currentAlign)}
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="stretch">Stretch</option>
                        <option value="flex-start">Left</option>
                        <option value="center">Center</option>
                        <option value="flex-end">Right</option>
                        <option value="space-between">Space-Between</option>
                        <option value="space-around">Space-Around</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 w-3">Y</span>
                      <select
                        value={currentAlign}
                        onChange={(e) => setJustifyAndAlign(currentJustify, e.target.value)}
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="stretch">Stretch</option>
                        <option value="flex-start">Top</option>
                        <option value="center">Center</option>
                        <option value="flex-end">Bottom</option>
                        <option value="baseline">Baseline</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-400 w-14">Gap</span>
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={gapNum}
                    onChange={(e) => setGapValue(Number(e.target.value), gapUnit)}
                    className="flex-1 accent-amber-400 bg-zinc-800 h-1 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 gap-1">
                    <input
                      type="text"
                      value={gapNum}
                      onChange={(e) => setGapValue(parseInt(e.target.value) || 0, gapUnit)}
                      className="w-8 bg-transparent text-xs text-zinc-100 text-center font-mono focus:outline-none"
                    />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{gapUnit}</span>
                  </div>
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>

              <div className="mt-1 border-t border-zinc-800/40 pt-2">
                <button
                  type="button"
                  onClick={() => setMoreGridOptionsOpen(!moreGridOptionsOpen)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
                >
                  {moreGridOptionsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  More alignment options
                </button>
                {moreGridOptionsOpen && (
                  <div className="mt-2 pl-5 space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>Justify Items</span>
                      <select
                        value={activeStyle.gridAlignX || "stretch"}
                        onChange={(e) => patchStyle({ gridAlignX: e.target.value })}
                        className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-100"
                      >
                        <option value="stretch">Stretch</option>
                        <option value="start">Start</option>
                        <option value="center">Center</option>
                        <option value="end">End</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Align Content</span>
                      <select
                        value={activeStyle.gridAlignY || "stretch"}
                        onChange={(e) => patchStyle({ gridAlignY: e.target.value })}
                        className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-100"
                      >
                        <option value="stretch">Stretch</option>
                        <option value="start">Start</option>
                        <option value="center">Center</option>
                        <option value="end">End</option>
                        <option value="space-between">Space-Between</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResponsiveFieldNote({ breakpoint }: { breakpoint: Breakpoint }) {
  return (
    <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
      Editing the {BREAKPOINTS.find((b) => b.value === breakpoint)?.label} value for the fields below — Desktop keeps
      whatever&apos;s already set. Switch back to Desktop to edit that value directly.
    </p>
  );
}

function StyleField({ label, value, onChange, isOverridden, inheritedFrom, onReset }: { label: string; value?: string; onChange: (v: string) => void; isOverridden?: boolean; inheritedFrom?: "desktop" | "tablet"; onReset?: () => void }) {
  return (
    <LabeledField label={label} isOverridden={isOverridden} inheritedFrom={inheritedFrom} onReset={onReset}>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm ${isOverridden ? "border-amber-400/80 ring-1 ring-amber-400/30" : "border-zinc-700"}`}
      />
    </LabeledField>
  );
}
