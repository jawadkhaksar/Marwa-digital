import { GLOW, IMG, T, advHeading, button, card, cols, counter, doc, eyebrow, glowCard, h, image, marquee, n, p, pill, reveal, row, section, splitHeading, stackedImages } from "../kit.mjs";

export const servicesMeta = {
  slug: "services",
  title: "Services — Web Design, Development, SEO & Branding",
  metaTitle: "Services | Web Design, Development, SEO & Branding — Marwa Digital",
  metaDescription:
    "Web design, web development, SEO, e-commerce, branding and product design from one senior team. Fixed scope, fixed price, measurable outcomes. See what we do.",
  metaKeywords: "web design services, web development services, SEO services, ecommerce development, branding services, UX design",
};

function serviceBlock(
  kicker: string,
  title: string,
  body: string,
  bullets: string[],
  img: string,
  alt: string,
  flip: boolean,
  accent: string,
  anchor: string
) {
  const copy = n("Section", { layoutMode: "flex", direction: "column", gap: "16px", contentWidth: "full", background: "transparent", justifyContent: "center" }, {
    children: [
      eyebrow(kicker),
      h(title),
      p(body),
      n("Checklist", {
        eyebrow: "",
        title: "",
        includedLabel: "Includes:",
        includedItems: bullets,
        excludedLabel: "",
        excludedItems: [],
        ctaLabel: "Discuss this service",
        ctaHref: "/contact",
        containerBackground: "transparent",
        containerBorderColor: "transparent",
      }),
    ],
  });
  const pic = image(img, alt);
  return section([cols(flip ? [pic, copy] : [copy, pic], { count: 2, gap: "56px", align: "center" })], {
    id: anchor,
    background: flip ? T.bgAlt : undefined,
    style: { borderStyle: "solid", borderWidth: "0px", borderColor: accent },
  });
}

export function servicesLayout() {
  return doc([
    section(
      [
        cols(
          [
            n("Section", { layoutMode: "flex", direction: "column", gap: "22px", contentWidth: "full", background: "transparent", justifyContent: "center", alignItems: "flex-start" }, {
              children: [
                pill("Our services"),
                splitHeading("Everything you need to compete online,", " under one roof.", "left", "h1"),
                p("Six disciplines that work together instead of against each other. Take one, or hand us the whole thing — either way you get senior people, a fixed price and a date you can plan around.", { fontSize: "1.12rem", maxWidth: "540px" }),
                row([button("Get a proposal", "/contact"), button("See pricing", "/pricing", "ghost")]),
              ],
            }),
            stackedImages([IMG.desk, IMG.code, IMG.studio]),
          ],
          { count: 2, ratio: "66-33", gap: "56px", align: "center" }
        ),
      ],
      { padY: "124px", background: GLOW.topLeft, style: { minHeight: "72vh", justifyContent: "center" } }
    ),

    section([marquee(["Web Design", "Development", "Technical SEO", "E-commerce", "Branding", "Product & UX", "CRO", "Content"])], {
      padY: "34px", background: T.bgAlt,
      style: { borderStyle: "solid", borderWidth: "1px", borderColor: "rgba(255,255,255,0.07)" },
    }),

    section(
      [
        cols(
          [
            glowCard("FaPalette", "Web Design", "Interfaces designed around how your customers actually buy.", T.accent),
            glowCard("FaCode", "Web Development", "Fast, accessible builds on modern frameworks.", T.violet),
            glowCard("FaSearch", "SEO & Content", "Organic growth that compounds quarter over quarter.", "#22c55e"),
            glowCard("FaShoppingCart", "E-commerce", "Storefronts engineered for AOV and repeat purchase.", "#f59e0b"),
            glowCard("FaStar", "Branding", "Positioning and identity that makes you unmistakable.", "#ec4899"),
            glowCard("FaMobile", "Product & UX", "Research, prototyping and design systems for software teams.", "#06b6d4"),
          ],
          { count: 3 }
        ),
      ],
      { background: T.bgAlt, padY: "84px" }
    ),

    serviceBlock(
      "01 — Web design",
      "Design that sells, not just design that wins awards",
      "We start with your buyer, not a moodboard. Every layout decision traces back to a question a customer needs answered before they'll act — which is why our redesigns typically lift conversion rather than just modernising the look.",
      [
        "Buyer research and message hierarchy",
        "Wireframes before visuals, so structure gets agreed early",
        "Full responsive UI across mobile, tablet and desktop",
        "A reusable design system, not a pile of one-off pages",
        "Accessibility to WCAG 2.2 AA built in from the start",
      ],
      IMG.studio,
      "Designer working on a website layout in a design tool",
      false,
      T.accent,
      "web-design"
    ),

    serviceBlock(
      "02 — Web development",
      "Builds that stay fast long after launch day",
      "Modern, standards-based engineering on Next.js and headless CMS architecture. Your site loads in under two seconds, scores green on Core Web Vitals, and your marketing team can publish without opening a ticket.",
      [
        "Next.js / React front-end with server rendering",
        "Headless CMS your team can actually operate",
        "Third-party integrations — CRM, payments, analytics, ERP",
        "Automated testing and staging environments",
        "Core Web Vitals in the green at handover, guaranteed",
      ],
      IMG.code,
      "Developer writing code for a website build",
      true,
      T.violet,
      "web-development"
    ),

    serviceBlock(
      "03 — SEO & content",
      "Rankings that survive the next algorithm update",
      "Technical foundations, topical authority and digital PR — the three things that still move organic rankings once the tricks stop working. We publish to a plan, measure against revenue, and report on what actually changed.",
      [
        "Technical audit and Core Web Vitals remediation",
        "Keyword and topical-authority mapping",
        "Content strategy, briefs and editorial calendar",
        "Digital PR and authoritative link acquisition",
        "Monthly reporting tied to pipeline, not impressions",
      ],
      IMG.analytics,
      "SEO analytics dashboard showing organic traffic growth",
      false,
      "#22c55e",
      "seo"
    ),

    serviceBlock(
      "04 — E-commerce",
      "Stores built around average order value",
      "Traffic is the easy part. We engineer the parts that decide profitability: product discovery, merchandising, checkout completion and the repeat-purchase loop that turns one sale into five.",
      [
        "Shopify, headless commerce or custom builds",
        "Checkout and cart optimisation",
        "Product discovery, search and merchandising",
        "Subscription, loyalty and retention mechanics",
        "Payments, tax, shipping and fulfilment integration",
      ],
      IMG.workspace,
      "Ecommerce storefront design displayed on a laptop",
      true,
      "#f59e0b",
      "ecommerce"
    ),

    serviceBlock(
      "05 — Branding & identity",
      "A brand that's hard to copy and easy to remember",
      "Positioning first, then the visual system that expresses it. We define what you stand for and who you're for, then build the identity, messaging and guidelines your whole team can apply consistently.",
      [
        "Market positioning and competitive differentiation",
        "Naming and messaging frameworks",
        "Logo, colour, typography and visual identity",
        "Brand guidelines your team can actually follow",
        "Launch assets across web, social and print",
      ],
      IMG.strategy,
      "Brand identity design materials on a studio table",
      false,
      "#ec4899",
      "branding"
    ),

    serviceBlock(
      "06 — Product & UX",
      "For teams shipping real software",
      "Research, prototyping and design systems for product teams under pressure to ship. We plug into your existing process rather than replacing it, and leave you with components your engineers can reuse.",
      [
        "User research and usability testing",
        "Interactive prototyping and concept validation",
        "Component-based design systems in Figma",
        "Design-to-engineering handoff documentation",
        "Ongoing product design support as you scale",
      ],
      IMG.meeting,
      "Product team reviewing user experience designs together",
      true,
      "#06b6d4",
      "product-ux"
    ),

    section(
      [
        advHeading("How engagements work", "Three ways to work with us", "center"),
        cols(
          [
            card([h("Project", "h3"), p("A defined build with a fixed scope, fixed price and a launch date. Best for redesigns, new sites and rebrands."), p("<strong>From $12,000</strong>", { color: T.text })]),
            card([h("Retainer", "h3"), p("A monthly block of senior time for ongoing SEO, CRO and development. Best once you're live and want to compound gains."), p("<strong>From $4,000/month</strong>", { color: T.text })], T.violet),
            card([h("Partnership", "h3"), p("We act as your embedded digital team — strategy, design and engineering on call. Best for scale-ups without an in-house team."), p("<strong>Custom</strong>", { color: T.text })], "#22c55e"),
          ],
          { count: 3 }
        ),
      ],
      { background: T.bgAlt }
    ),

    section(
      [cols([counter("120+", "Projects delivered"), counter("< 2s", "Median load time"), counter("312%", "Best organic lift"), counter("98%", "Client retention")], { count: 4, gap: "20px" })],
      { padY: "76px", backgroundImage: IMG.city, overlay: "rgba(8,11,31,0.9)" }
    ),

    section(
      [
        h("Not sure which service you need?", "h2", { align: "center" }),
        p("Tell us the outcome you're chasing and we'll tell you what actually gets you there — even when that's less work than you expected.", { align: "center", fontSize: "1.08rem", maxWidth: "640px" }),
        n("Section", { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", justifyContent: "center", contentWidth: "full", background: "transparent" }, {
          children: [button("Get a free proposal", "/contact"), button("Read case studies", "/case-studies", "ghost")],
          style: { marginTop: "14px" },
          timelines: reveal(0.15),
        }),
      ],
      {
        align: "center",
        padY: "116px",
        background: GLOW.dual,
        style: {
          textAlign: "center",
          borderStyle: "solid",
          borderWidth: "1px",
          borderColor: "rgba(255,255,255,0.10)",
        },
      }
    ),
  ]);
}
