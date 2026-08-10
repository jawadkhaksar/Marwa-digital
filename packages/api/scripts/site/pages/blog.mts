import { T, IMG, section, sectionIntro, cols, card, h, p, eyebrow, button, iconBox, doc, n, reveal } from "../kit.mjs";

export const blogMeta = {
  slug: "insights",
  title: "Insights — Web, SEO & Brand Strategy",
  metaTitle: "Insights | Web Design, SEO & Growth Articles — Marwa Digital",
  metaDescription:
    "Practical articles on web performance, technical SEO, conversion optimisation and brand strategy — written by the team that ships the work, not a content farm.",
  metaKeywords: "web design blog, SEO insights, conversion optimisation articles, digital agency blog",
};

export function blogLayout() {
  return doc([
    section(
      [
        eyebrow("Insights"),
        h("Things we've learned shipping real projects", "h1", { align: "center" }),
        p(
          "No listicles, no rewritten press releases. Just what actually worked (and what didn't) across a decade of building sites, stores and brands.",
          { align: "center", fontSize: "1.12rem", maxWidth: "740px" }
        ),
      ],
      { backgroundImage: IMG.code, overlay: "rgba(8,11,31,0.88)", padY: "126px", align: "center", style: { textAlign: "center" } }
    ),

    section(
      [
        sectionIntro("Latest articles", "Fresh from the team"),
        n("Posts", { columns: "3", itemCount: "9", showExcerpt: true, showDate: true }, { timelines: reveal(0.05) }),
      ],
      {}
    ),

    section(
      [
        sectionIntro("What we write about", "Four themes we keep coming back to"),
        cols(
          [
            card([iconBox("FaBolt", "Performance", "Why load time is a revenue metric, and the specific things that actually move Core Web Vitals.")]),
            card([iconBox("FaSearch", "Technical SEO", "Crawl budgets, information architecture and the structural work that outlasts algorithm updates.", T.violet)]),
            card([iconBox("FaChartLine", "Conversion", "Research methods, testing discipline and the psychology behind pages that persuade.", "#22c55e")]),
            card([iconBox("FaStar", "Brand strategy", "Positioning, messaging and the difference between looking different and being different.", "#f59e0b")]),
          ],
          { count: 4, gap: "20px" }
        ),
      ],
      { background: T.bgAlt }
    ),

    section(
      [
        cols(
          [
            n("Section", { layoutMode: "flex", direction: "column", gap: "16px", contentWidth: "full", background: "transparent", justifyContent: "center" }, {
              children: [
                eyebrow("Work with us"),
                h("Reading is good. Shipping is better."),
                p("If something here is relevant to a problem you're facing, we're happy to talk it through — no pitch, no obligation. Most of our best projects started as a question in an email."),
                n("Section", { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", contentWidth: "full", background: "transparent" }, {
                  children: [button("Start a conversation", "/contact"), button("See our services", "/services", "ghost")],
                  style: { marginTop: "8px" },
                }),
              ],
            }),
            n("Image", { src: IMG.meeting, alt: "Marwa Digital team discussing a client project", imageBorderRadiusTop: T.radius, imageBorderRadiusRight: T.radius, imageBorderRadiusBottom: T.radius, imageBorderRadiusLeft: T.radius, width: "100%" }, { timelines: reveal(0.08) }),
          ],
          { count: 2, gap: "52px", align: "center" }
        ),
      ],
      {}
    ),
  ]);
}

/** Full articles seeded as real Post rows so the blog isn't an empty shell. */
export const BLOG_POSTS = [
  {
    slug: "why-your-website-speed-is-costing-you-revenue",
    title: "Why Your Website Speed Is Costing You Revenue (And How To Fix It)",
    excerpt:
      "A one-second delay can cut conversions by 7%. Here's how to find what's actually slowing your site down — and the fixes that move the needle in practice.",
    metaTitle: "Why Website Speed Costs You Revenue — And How to Fix It",
    metaDescription:
      "Slow sites lose money and rankings. A practical guide to diagnosing Core Web Vitals problems and the fixes that actually work, from an agency that ships them.",
    content: `<p>Every time we audit a site that's underperforming, load time is a factor. Not always the biggest one — but it's never irrelevant, and it's usually the cheapest thing to fix.</p>
<h2>Speed is a conversion problem before it's an SEO problem</h2>
<p>Google made Core Web Vitals a ranking signal, which is why most teams start caring about performance. But the ranking impact is modest compared to what slowness does to the people who already made it to your site.</p>
<p>Our own client data matches the published research: a site loading in 1.4 seconds converts substantially better than the same site at 4 seconds. In one e-commerce rebuild, load time improvements alone accounted for roughly a third of a 41% conversion gain. Nothing about the offer changed — visitors simply stopped leaving before the page appeared.</p>
<h2>Where the time actually goes</h2>
<p>When we profile a slow site, the causes cluster into four buckets, almost always in this order of impact:</p>
<h3>1. Unoptimised images</h3>
<p>The single most common culprit. A hero image exported at 4000px and 3MB will destroy Largest Contentful Paint on mobile no matter how good your hosting is. Serve modern formats (WebP or AVIF), size images to their actual rendered dimensions, and lazy-load anything below the fold.</p>
<h3>2. Render-blocking scripts</h3>
<p>Every marketing tag, chat widget and analytics script added over the years is competing for the main thread. Audit what's actually loading — we routinely find tags for tools the client stopped using two years ago. Defer everything non-critical.</p>
<h3>3. Font loading</h3>
<p>Custom fonts block text rendering unless you tell them not to. Use <code>font-display: swap</code>, preload the fonts you need above the fold, and subset them so you're not shipping character sets you'll never render.</p>
<h3>4. Server response time</h3>
<p>If Time To First Byte is over 600ms, no amount of front-end work will save you. This is usually cheap hosting, an unoptimised database query, or a CMS doing too much work per request. Static generation or edge caching solves most of it.</p>
<h2>How to measure it honestly</h2>
<p>Run PageSpeed Insights, but pay attention to field data (real users) over lab data (a simulated test). Lab scores are useful for debugging; field data is what Google actually ranks on and what your customers actually experience.</p>
<p>Then test on a real mid-range Android phone on a throttled connection. Your MacBook on office wifi is not your customer.</p>
<h2>What good looks like</h2>
<p>We treat these as the pass mark on every project we hand over: Largest Contentful Paint under 2.5 seconds, Interaction to Next Paint under 200ms, Cumulative Layout Shift under 0.1. Hitting them isn't exotic — it's mostly discipline about images, scripts and fonts.</p>
<p>If your site misses those numbers, the fix is usually a week of focused work rather than a rebuild. It's the highest-return week most marketing teams can spend.</p>`,
  },
  {
    slug: "technical-seo-checklist-for-a-website-redesign",
    title: "The Technical SEO Checklist Every Website Redesign Needs",
    excerpt:
      "Redesigns are where rankings go to die. The migration checklist we run on every project to make sure traffic goes up after launch, not down.",
    metaTitle: "Technical SEO Checklist for a Website Redesign | Marwa Digital",
    metaDescription:
      "A practical technical SEO migration checklist for website redesigns — redirects, URL structure, metadata and monitoring — from an agency that runs it on every build.",
    content: `<p>The most expensive mistake in a website redesign isn't a design choice. It's launching a beautiful new site that quietly loses half its organic traffic because nobody planned the migration.</p>
<p>We've inherited enough of these clean-ups to have made the process boring on purpose. Here's the checklist.</p>
<h2>Before you design anything</h2>
<h3>Crawl the existing site</h3>
<p>You cannot preserve what you haven't catalogued. Crawl every URL, export it, and note which pages have traffic, which have backlinks, and which have neither. That last group is your deletion candidate list.</p>
<h3>Export your rankings and traffic baseline</h3>
<p>Pull twelve months of Search Console and analytics data before touching anything. Without a baseline you'll have no way to tell whether a post-launch dip is a real problem or normal seasonality.</p>
<h3>Identify your money pages</h3>
<p>Usually 10–20% of pages drive most organic value. Those get individual attention during migration. Everything else can be handled in bulk.</p>
<h2>During design and build</h2>
<h3>Preserve URL structure where you can</h3>
<p>Every URL you change is a redirect you have to maintain and a small amount of authority you risk losing. Change URLs when there's a genuine structural reason — not because the new CMS defaults to a different pattern.</p>
<h3>Map every old URL to a new one</h3>
<p>Build a redirect map as a spreadsheet during the project, not the night before launch. Every old URL needs a 301 to the closest equivalent page. Redirecting everything to the homepage is the classic destructive shortcut — Google treats those as soft 404s and drops them.</p>
<h3>Carry metadata across deliberately</h3>
<p>Titles, meta descriptions, canonical tags, structured data and image alt text all need to survive the move. This is tedious and it's where most agencies get sloppy.</p>
<h3>Keep the information architecture intentional</h3>
<p>Search engines infer topical relationships from your internal linking and hierarchy. A redesign that flattens a well-structured site into a shallow one loses that context, even if every individual page survives.</p>
<h2>Launch day</h2>
<ul>
<li>Verify the staging site was never indexed — check for a stray <code>noindex</code> that made it to production, which is the single most common launch disaster</li>
<li>Submit the new XML sitemap in Search Console</li>
<li>Spot-check redirects across every template type, not just a handful</li>
<li>Confirm analytics and tracking fire correctly on the new pages</li>
</ul>
<h2>The first 30 days</h2>
<p>Expect some volatility — Google needs to recrawl and reassess. What you're watching for is direction, not day-to-day noise. Check Search Console for crawl errors and coverage drops weekly, and keep the redirect map in place permanently. Removing redirects after six months because "traffic has settled" is how sites quietly lose authority years later.</p>
<h2>The honest summary</h2>
<p>A well-executed migration is invisible: traffic continues its existing trend, then improves as the better site does its job. A bad one costs six to twelve months of recovery. The difference is almost entirely planning done before design started.</p>`,
  },
  {
    slug: "how-to-write-website-copy-that-converts",
    title: "How To Write Website Copy That Actually Converts",
    excerpt:
      "Most website copy describes the company. Converting copy answers the questions standing between a visitor and a decision. Here's the difference.",
    metaTitle: "How to Write Website Copy That Converts | Marwa Digital",
    metaDescription:
      "A practical framework for writing website copy that converts — buyer questions, message hierarchy, specificity and proof. With before-and-after examples.",
    content: `<p>Ask most companies what their homepage says and they'll describe themselves: who they are, how long they've been trading, what they're passionate about. Ask their customers what they needed to know before buying and you'll get a completely different list.</p>
<p>That gap is where conversion is lost.</p>
<h2>Start with the questions, not the message</h2>
<p>Before writing a word, we interview customers — ideally recent ones, including people who chose a competitor. We're listening for the specific questions they needed answered and the specific fears that nearly stopped them.</p>
<p>Those questions become the page structure. Every section exists to answer one, in roughly the order a real buyer asks them.</p>
<h2>Lead with the outcome, not the mechanism</h2>
<p>Visitors care what changes for them. The technology, methodology or process matters only as evidence that the outcome is achievable.</p>
<p><strong>Weak:</strong> "We use a proprietary six-stage methodology built on twenty years of combined industry experience."</p>
<p><strong>Better:</strong> "Most clients see qualified enquiries double within six months. Here's the process that gets them there."</p>
<p>Same information. The second version leads with what the reader wanted and uses the process as proof rather than as the headline.</p>
<h2>Specificity is the cheapest credibility you can buy</h2>
<p>Vague claims read as marketing noise and get skipped. Specific ones read as fact.</p>
<p>"Fast turnaround" means nothing — every competitor says it. "Most projects launch in eight weeks; we'll give you a dated plan before you commit" means something, and it's falsifiable, which is exactly why it's believable.</p>
<h2>Handle objections instead of hiding from them</h2>
<p>Every buyer has reasons not to act: price, risk, timing, switching cost, or simply not believing you. Copy that ignores them doesn't make them disappear — it just leaves the visitor to resolve them alone, usually by leaving.</p>
<p>Publishing your pricing, naming who you're <em>not</em> right for, and being direct about what's excluded all convert better than the vague alternative, because they signal you have nothing to hide.</p>
<h2>One idea per section</h2>
<p>Nobody reads a website — they scan it, and stop when something catches. If a section is making three points, all three get missed. Give each section a single job, make the heading carry the message on its own, and let the body text support readers who slow down.</p>
<h2>Write the call to action as the next step, not the final one</h2>
<p>"Buy now" asks for a commitment most visitors aren't ready to make. "See pricing" or "Book a 20-minute call" matches where they actually are and converts better precisely because it asks for less.</p>
<h2>Test it against a stranger</h2>
<p>Show your homepage to someone unfamiliar with your business for five seconds, then ask what you do and who it's for. If they can't answer, no amount of design will save the page. That test has killed more of our own drafts than any client feedback ever has.</p>`,
  },
  {
    slug: "signs-your-business-needs-a-website-redesign",
    title: "Seven Signs Your Business Has Outgrown Its Website",
    excerpt:
      "A redesign is expensive and disruptive, so it shouldn't be reflexive. Here are the seven signals that genuinely justify one — and what to do instead if none apply.",
    metaTitle: "7 Signs You Need a Website Redesign | Marwa Digital",
    metaDescription:
      "How to tell whether your website genuinely needs a redesign or just targeted fixes. Seven honest signals, and the cheaper alternatives worth trying first.",
    content: `<p>We turn down redesign projects fairly regularly. Often the site isn't the problem, and rebuilding it would be an expensive way to avoid the actual issue.</p>
<p>Here's how we tell the difference.</p>
<h2>1. Mobile traffic converts far worse than desktop</h2>
<p>If most of your traffic is mobile and most of your conversions are desktop, your mobile experience is actively costing money. Sometimes that's fixable in place; if the site was designed desktop-first years ago, usually it isn't.</p>
<h2>2. Your team can't publish without a developer</h2>
<p>When every content change needs a ticket, content stops happening. That's a slow, invisible cost — it's why sites go stale and why SEO programmes stall out. A CMS your marketers can actually operate pays for itself.</p>
<h2>3. The site contradicts your current positioning</h2>
<p>Companies evolve faster than their websites. If you've moved upmarket, changed your offer, or now sell to a different buyer, a site describing the old business will keep attracting the old customers.</p>
<h2>4. Performance is bad and can't be fixed incrementally</h2>
<p>Sometimes slowness is images and scripts, which is a week of work. Sometimes it's a fundamentally heavy platform or a decade of accumulated plugins, where every fix uncovers two more. The second case justifies a rebuild.</p>
<h2>5. You can't measure anything</h2>
<p>If nobody can tell you which pages generate enquiries, you're making decisions blind. Occasionally this is just missing instrumentation. Often the site's structure makes meaningful measurement impossible.</p>
<h2>6. Competitors consistently out-convert you on the same traffic</h2>
<p>If you're winning the click and losing the customer, the problem is on your site. That's worth diagnosing carefully — it may be copy and proof rather than design, which is much cheaper to fix.</p>
<h2>7. It's genuinely embarrassing in sales conversations</h2>
<p>Soft, but real. If your sales team avoids sending prospects to the website, it's costing you deals in a way that's hard to see in analytics.</p>
<h2>If none of these apply</h2>
<p>Then don't redesign. Spend a fraction of the budget on the specific weakness instead — a conversion audit, a performance sprint, better content, or clearer messaging on the pages that already get traffic. We've had clients get a bigger lift from two weeks of focused work than they'd have got from a full rebuild.</p>
<p>The best redesign is the one you can justify with a number. If you can't, you're probably buying a new coat of paint.</p>`,
  },
  {
    slug: "what-a-brand-is-and-what-it-is-not",
    title: "What A Brand Actually Is (And What It Isn't)",
    excerpt:
      "Your logo isn't your brand. Neither is your colour palette. A practical definition of brand for people who have to make decisions about it.",
    metaTitle: "What a Brand Actually Is — A Practical Definition | Marwa Digital",
    metaDescription:
      "Brand isn't your logo. A clear, practical explanation of what brand really means, why positioning comes first, and how to tell if yours is working.",
    content: `<p>Ask ten people what a brand is and you'll get ten answers, most of them about visuals. That confusion is expensive, because it leads companies to solve positioning problems with a new logo.</p>
<h2>A working definition</h2>
<p>Your brand is the set of expectations people hold about you. It lives in their heads, not in your brand guidelines. Everything you produce — the site, the product, the sales call, the invoice — either reinforces or contradicts those expectations.</p>
<p>Your visual identity is how you signal the brand. It's important, and it's downstream of the actual question: what do we want to be known for, by whom, and why should they believe us?</p>
<h2>Positioning comes first</h2>
<p>Positioning is the decision about what space you occupy in a buyer's mind relative to alternatives. It's mostly a decision about what you're <em>not</em>.</p>
<p>"We're for everyone" is not positioning. "We're the option for teams who've outgrown DIY tools but can't justify enterprise pricing" is — it tells you who to talk to, who to turn away, what to build, and what to charge.</p>
<p>Until that's settled, design work is decoration.</p>
<h2>Where identity does the work</h2>
<p>Once positioning is clear, identity makes it legible at a glance. A premium consultancy and a scrappy startup tool should not look the same, because their buyers are looking for different signals of credibility.</p>
<p>Good identity work is consistency more than creativity. The point isn't a clever mark — it's that a hundred touchpoints over three years all reinforce the same impression.</p>
<h2>Messaging is the connective tissue</h2>
<p>Positioning is internal. Messaging is how it gets said out loud, consistently, by people who weren't in the workshop. A messaging framework — the core value proposition, the proof points, the language for each audience — is what stops the story drifting the moment it leaves marketing.</p>
<h2>How to tell whether it's working</h2>
<p>Ask ten customers to describe what you do and who it's for. If you get ten meaningfully different answers, you don't have a brand problem you can design your way out of — you have a positioning problem, and the words are the fix.</p>
<p>If they broadly agree with each other but disagree with how you'd describe yourselves, that's a messaging problem: the market has decided something about you that your marketing hasn't caught up with.</p>
<p>If they agree with each other and with you, your brand is working. Spend the budget on reaching more of them instead.</p>`,
  },
  {
    slug: "conversion-rate-optimisation-where-to-start",
    title: "Conversion Rate Optimisation: Where To Actually Start",
    excerpt:
      "Most CRO advice is a list of tactics. Here's the sequence we follow instead — research first, tests second — and why button colours are last.",
    metaTitle: "Conversion Rate Optimisation: Where to Start | Marwa Digital",
    metaDescription:
      "A practical CRO framework: find where users drop off, understand why, prioritise by impact, then test. Includes how to avoid the most common testing mistakes.",
    content: `<p>Conversion optimisation has a reputation problem. Too much of the published advice is a list of tactics — change the button colour, add urgency, use more social proof — presented as universal truths. They aren't. They're hypotheses that happened to work on someone else's site.</p>
<p>Here's the sequence that actually produces gains.</p>
<h2>Step 1: Find where you're losing people</h2>
<p>Before opinions, get the map. Build a funnel report showing drop-off at each step, segmented by device. On almost every site we audit, one step accounts for a disproportionate share of the loss — and it's frequently not the one the team assumed.</p>
<h2>Step 2: Work out why</h2>
<p>Analytics tells you where; it never tells you why. For that you need qualitative input:</p>
<ul>
<li><strong>Session recordings</strong> — watch real people fail. Rage clicks and repeated scrolling are unambiguous signals</li>
<li><strong>Heatmaps</strong> — see what gets attention and what gets scrolled past entirely</li>
<li><strong>Exit surveys</strong> — one question on the page where people leave: "What stopped you today?"</li>
<li><strong>Customer interviews</strong> — the highest-value and least-used source. Ask recent buyers what nearly stopped them</li>
</ul>
<h2>Step 3: Prioritise honestly</h2>
<p>You'll finish research with more ideas than capacity. Score each by expected impact, confidence in the evidence, and effort to implement. Do the high-impact, high-confidence, low-effort work first — it funds the rest of the programme politically.</p>
<h2>Step 4: Test properly, or don't test</h2>
<p>A/B testing needs traffic. If a page gets 200 visits a month, you will never reach significance, and running a test anyway produces a number that feels like evidence but isn't. Below meaningful volume, use research and judgement, ship the better version, and monitor.</p>
<p>Where you do have volume: one variable at a time, run for full weeks to cover the weekly cycle, and decide the sample size before you start rather than stopping the moment it looks good.</p>
<h2>What usually moves the needle</h2>
<p>Across our own projects, the recurring winners are unglamorous:</p>
<ul>
<li>Making the value proposition clearer in the first screen</li>
<li>Cutting form fields to what's genuinely required</li>
<li>Adding proof exactly where doubt occurs, rather than in a testimonials section nobody reaches</li>
<li>Fixing mobile-specific friction, particularly in checkout</li>
<li>Load time — repeatedly, and more than anyone expects</li>
</ul>
<p>Notice what's absent: button colours, countdown timers, and popups. They occasionally produce a small lift. They're never the reason a site converts badly.</p>
<h2>Treat it as a programme, not a project</h2>
<p>One round of fixes gives you a step change. A continuous cycle of research, testing and iteration compounds — and compounding is where the real returns are. The teams that win at CRO aren't running cleverer tests; they're simply still running them two years later.</p>`,
  },
];
