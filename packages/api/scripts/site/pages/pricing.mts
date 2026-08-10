import { GLOW, T, advHeading, button, card, cols, doc, eyebrow, glowCard, h, n, p, pill, reveal, section, splitHeading } from "../kit.mjs";

export const pricingMeta = {
  slug: "pricing",
  title: "Pricing — Transparent Project & Retainer Rates",
  metaTitle: "Pricing | Website, SEO & Branding Costs — Marwa Digital",
  metaDescription:
    "Clear, published pricing for websites, e-commerce, SEO retainers and branding. Fixed scope, fixed price, no hourly surprises. See what a project actually costs.",
  metaKeywords: "web design pricing, website cost, SEO retainer pricing, agency rates, branding cost",
};

function tier(name: string, price: string, note: string, features: string[], accent: string, featured = false) {
  return card(
    [
      eyebrow(name),
      h(price, "h2", { fontSize: "clamp(1.9rem, 3vw, 2.5rem)" }),
      p(note),
      n("Checklist", {
        eyebrow: "",
        title: "",
        includedLabel: "Includes:",
        includedItems: features,
        excludedLabel: "",
        excludedItems: [],
        ctaLabel: featured ? "Get a proposal" : "Enquire",
        ctaHref: "/contact",
        containerBackground: "transparent",
        containerBorderColor: "transparent",
      }),
    ],
    accent
  );
}

export function pricingLayout() {
  return doc([
    section(
      [
        pill("Pricing"),
        splitHeading("Published prices, because guessing", " wastes everyone's time.", "center", "h1"),
        p("Most agencies hide pricing until you're deep in a sales process. These are the ranges our work actually lands in — so you can decide whether to keep reading.", { align: "center", fontSize: "1.1rem", maxWidth: "720px", marginLeft: "auto", marginRight: "auto" }),
      ],
      { padY: "116px", align: "center", background: GLOW.topRight, style: { textAlign: "center" } }
    ),

    section(
      [
        advHeading("Project work", "Fixed scope, fixed price", "center"),
        cols(
          [
            tier("Launch", "$12k – $20k", "A focused marketing site for founders and small teams who need to look credible and convert.", [
              "Up to 8 custom-designed pages",
              "Strategy workshop and message hierarchy",
              "Responsive design and build",
              "CMS setup so your team can edit",
              "On-page SEO foundations",
              "6–8 week delivery",
            ], T.accent),
            tier("Growth", "$20k – $45k", "Our most common engagement — a full site rebuild with the strategy and SEO work to make it perform.", [
              "Up to 20 custom-designed pages",
              "Full discovery: research, analytics, competitor audit",
              "Design system and component library",
              "Technical SEO and content migration",
              "Integrations — CRM, analytics, marketing tools",
              "10–12 week delivery",
            ], T.violet, true),
            tier("Scale", "$45k+", "E-commerce, product platforms and multi-market builds with custom functionality.", [
              "Unlimited pages and templates",
              "E-commerce or custom application build",
              "Multi-language and multi-region support",
              "Advanced integrations and custom APIs",
              "Load testing and performance engineering",
              "12–16 week delivery",
            ], "#22c55e"),
          ],
          { count: 3 }
        ),
      ],
      {}
    ),

    section(
      [
        advHeading("Ongoing work", "Retainers for after launch", "center"),
        cols(
          [
            tier("SEO & Content", "$4k / month", "Compounding organic growth — technical, content and authority work every month.", [
              "Technical SEO monitoring and fixes",
              "4 content pieces per month, researched and written",
              "Digital PR and link acquisition",
              "Monthly reporting against pipeline",
              "Quarterly strategy review",
            ], "#22c55e"),
            tier("Growth & CRO", "$5k / month", "Continuous testing and optimisation of the site you already have.", [
              "Conversion research and hypothesis backlog",
              "A/B testing programme",
              "Landing page design and build",
              "Analytics and funnel instrumentation",
              "Monthly performance review",
            ], "#f59e0b"),
            tier("Embedded team", "From $9k / month", "We act as your digital department — strategy, design and engineering on call.", [
              "Dedicated senior team allocation",
              "Design and development capacity each sprint",
              "Priority turnaround on requests",
              "Roadmap planning and technical direction",
              "Direct Slack access to the team",
            ], "#06b6d4"),
          ],
          { count: 3 }
        ),
      ],
      { background: T.bgAlt }
    ),

    section(
      [
        advHeading("What's always included", "No line-item surprises", "center"),
        cols(
          [
            glowCard("FaCheck", "Full ownership", "Code, designs, content and accounts are yours. No licensing traps, no hostage situations.", T.accent),
            glowCard("FaBolt", "Performance guarantee", "Core Web Vitals in the green at handover, or we keep working until they are.", T.violet),
            glowCard("FaStar", "30 days support", "Post-launch fixes and adjustments included as standard on every project.", "#22c55e"),
            glowCard("FaInfo", "Training", "A recorded walkthrough plus a live session so your team can run the site confidently.", "#f59e0b"),
          ],
          { count: 4, gap: "20px" }
        ),
      ],
      {}
    ),

    section(
      [
        advHeading("Pricing questions", "The things people ask before signing", "center"),
        n("Faq", {
          title: "",
          faqs: [
            { question: "Why fixed price instead of hourly?", answer: "Because hourly billing rewards slowness and puts the risk of our inefficiency on you. We scope carefully, quote a fixed number, and absorb the cost if we estimated badly. You get a figure you can budget against." },
            { question: "What if the scope changes mid-project?", answer: "Small adjustments are absorbed — we're not going to nickel-and-dime you over a extra section. Genuinely new scope gets quoted separately and approved before any work starts, so there's never a surprise invoice." },
            { question: "Do you require payment up front?", answer: "We take 40% to begin, 30% at design sign-off and 30% on launch. For retainers it's monthly in advance, cancellable with 30 days' notice." },
            { question: "Is there a cheaper option?", answer: "Honestly, not from us. Below roughly $12k we can't staff a project with senior people and do the strategy work that makes it succeed — and half-doing it serves nobody. We're happy to recommend good freelancers if the budget's below that." },
            { question: "Do prices include content writing?", answer: "Project quotes include messaging and page copy for the pages we design. Ongoing blog content and editorial programmes sit in the SEO retainer rather than the build." },
          ],
        }, { timelines: reveal(0.05) }),
      ],
      { background: T.bgAlt }
    ),

    section(
      [
        h("Get an exact number for your project", "h2", { align: "center" }),
        p("Send us the brief and we'll come back with a fixed quote and a delivery date within one business day.", { align: "center", fontSize: "1.08rem", maxWidth: "620px" }),
        n("Section", { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", justifyContent: "center", contentWidth: "full", background: "transparent" }, {
          children: [button("Request a quote", "/contact"), button("See our work", "/case-studies", "ghost")],
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
