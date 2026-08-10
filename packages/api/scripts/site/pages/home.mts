import { T, IMG, section, sectionIntro, cols, card, h, p, eyebrow, button, buttonRow, iconBox, counter, image, doc, n, reveal, revealStagger, spacer } from "../kit.mjs";

export const homeMeta = {
  slug: "home",
  title: "Marwa Digital — Web Design, Development & SEO Agency",
  metaTitle: "Marwa Digital | Web Design, Development & SEO Agency",
  metaDescription:
    "Marwa Digital is a full-service digital agency building high-performance websites, brands and search strategies that turn traffic into revenue. See our work and get a proposal.",
  metaKeywords: "digital agency, web design agency, web development, SEO agency, branding agency, ecommerce development",
};

export function homeLayout() {
  return doc([
    // 1 ── Hero
    section(
      [
        eyebrow("Full-service digital agency"),
        h("We build websites that win attention — and keep it.", "h1", { align: "center" }),
        p(
          "Marwa Digital designs, builds and grows digital products for ambitious brands. Strategy, design, engineering and SEO under one roof — so your site doesn't just launch, it performs.",
          { align: "center", fontSize: "1.15rem", maxWidth: "720px" }
        ),
        n(
          "Section",
          { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", justifyContent: "center", alignItems: "center", contentWidth: "full", background: "transparent" },
          {
            children: [button("Start a project", "/contact"), button("View our work", "/case-studies", "ghost")],
            style: { marginTop: "10px" },
            timelines: reveal(0.2),
          }
        ),
        spacer("26px"),
        cols(
          [counter("120+", "Projects delivered"), counter("38", "Brands scaled"), counter("14", "Countries served"), counter("98%", "Client retention")],
          { count: 4, gap: "20px" }
        ),
      ],
      {
        id: "hero",
        backgroundImage: IMG.heroTeam,
        overlay: "rgba(8,11,31,0.82)",
        padY: "150px",
        align: "center",
        gap: "20px",
        style: { textAlign: "center", minHeight: "88vh", justifyContent: "center" },
      }
    ),

    // 2 ── Trust / positioning strip
    section(
      [
        cols(
          [
            iconBox("FaBolt", "Built for speed", "Core Web Vitals in the green on every build — because slow sites lose rankings and revenue."),
            iconBox("FaSearch", "Engineered to rank", "Technical SEO baked into the architecture, not bolted on after launch.", T.violet),
            iconBox("FaChartLine", "Measured on outcomes", "We report on pipeline and conversions, not vanity impressions.", "#22c55e"),
          ],
          { count: 3 }
        ),
      ],
      { background: T.bgAlt, padY: "72px" }
    ),

    // 3 ── Services
    section(
      [
        sectionIntro(
          "What we do",
          "Everything your brand needs to compete online",
          "Six disciplines, one team. Engage us for a single project or as your long-term digital partner."
        ),
        cols(
          [
            card([iconBox("FaPalette", "Web Design", "Conversion-focused interfaces designed around how your customers actually buy — not around trends.")]),
            card([iconBox("FaCode", "Web Development", "Fast, accessible, standards-compliant builds on modern frameworks with a CMS your team can actually use.", T.violet)]),
            card([iconBox("FaSearch", "SEO & Content", "Technical SEO, content strategy and digital PR that compounds into durable organic growth.", "#22c55e")]),
            card([iconBox("FaShoppingCart", "E-commerce", "Storefronts engineered for average order value, repeat purchase and checkout completion.", "#f59e0b")]),
            card([iconBox("FaStar", "Branding & Identity", "Positioning, naming, visual identity and messaging systems that make you impossible to confuse.", "#ec4899")]),
            card([iconBox("FaMobile", "Product & UX", "Research, prototyping and design systems for teams shipping real software at pace.", "#06b6d4")]),
          ],
          { count: 3 }
        ),
      ],
      { id: "services" }
    ),

    // 4 ── Split: why us
    section(
      [
        cols(
          [
            n("Section", { layoutMode: "flex", direction: "column", gap: "18px", contentWidth: "full", background: "transparent", justifyContent: "center" }, {
              children: [
                eyebrow("Why Marwa Digital"),
                h("A senior team, no handoffs, no surprises"),
                p(
                  "Most agencies sell you a pitch team and deliver with juniors. We don't. The strategists and engineers in your kickoff call are the ones doing the work — which is why our projects ship on time and our clients stay an average of three years.",
                ),
                n("Checklist", {
                  eyebrow: "",
                  title: "",
                  includedLabel: "What you get:",
                  includedItems: [
                    "A dedicated senior team from kickoff to launch",
                    "Fixed scope and fixed price — no hourly surprises",
                    "Weekly demos, so you always see progress",
                    "Full ownership of code, content and assets",
                    "30 days of post-launch support included",
                  ],
                  excludedLabel: "",
                  excludedItems: [],
                  ctaLabel: "Talk to a strategist",
                  ctaHref: "/contact",
                  containerBackground: "transparent",
                  containerBorderColor: "transparent",
                }),
              ],
            }),
            image(IMG.meeting, "The Marwa Digital team reviewing a website design together in the studio"),
          ],
          { count: 2, gap: "56px", align: "center" }
        ),
      ],
      { background: T.bgAlt }
    ),

    // 5 ── Process
    section(
      [
        sectionIntro("How we work", "A process built to remove risk", "Four phases, clear deliverables at each one, and no black boxes."),
        cols(
          [
            card([iconBox("FaSearch", "01 — Discover", "Stakeholder interviews, analytics review and competitor teardown. We find the constraints before we design around them.")]),
            card([iconBox("FaPalette", "02 — Design", "Wireframes, then full UI and a design system. You approve direction before a line of production code exists.", T.violet)]),
            card([iconBox("FaCode", "03 — Build", "Engineering in two-week sprints with weekly demos, QA across real devices, and accessibility baked in.", "#22c55e")]),
            card([iconBox("FaChartLine", "04 — Grow", "Launch, measure, iterate. Ongoing SEO and CRO turning the site into a compounding asset.", "#f59e0b")]),
          ],
          { count: 4, gap: "20px" }
        ),
      ],
      { id: "process" }
    ),

    // 6 ── Featured work
    section(
      [
        sectionIntro("Selected work", "Results, not just screenshots"),
        cols(
          [
            card([
              image(IMG.analytics, "Analytics dashboard showing organic traffic growth for a SaaS client", "12px"),
              h("312% organic growth in 9 months", "h3"),
              p("A B2B SaaS platform rebuilt on a new technical foundation, paired with a topical content programme that tripled qualified demo requests."),
            ]),
            card([
              image(IMG.desk, "Ecommerce product page design shown on a laptop", "12px"),
              h("+41% conversion on a rebuilt storefront", "h3"),
              p("We rebuilt a fashion retailer's checkout and product experience, lifting mobile conversion by 41% and average order value by 18%."),
            ]),
            card([
              image(IMG.studio, "Brand identity design materials laid out on a studio desk", "12px"),
              h("A rebrand that unlocked enterprise deals", "h3"),
              p("New positioning, identity and site for a consultancy moving upmarket — average contract value doubled within two quarters."),
            ]),
          ],
          { count: 3 }
        ),
        n("Section", { layoutMode: "flex", direction: "row", justifyContent: "center", contentWidth: "full", background: "transparent" }, {
          children: [button("Explore all case studies", "/case-studies", "ghost")],
          style: { marginTop: "34px" },
          timelines: reveal(0.1),
        }),
      ],
      { background: T.bgAlt }
    ),

    // 7 ── Stats band
    section(
      [
        cols([counter("9.4/10", "Average client rating"), counter("< 2s", "Median load time shipped"), counter("3 yrs", "Average client tenure"), counter("24h", "Response time")], { count: 4, gap: "20px" }),
      ],
      { padY: "78px", backgroundImage: IMG.city, overlay: "rgba(8,11,31,0.9)" }
    ),

    // 8 ── Testimonials
    section(
      [
        sectionIntro("Client stories", "What it's like to work with us"),
        cols(
          [
            card([
              p("“They rebuilt our site in ten weeks and it immediately outperformed the version we'd spent a year on. The difference was strategy — they understood our buyer before touching design.”"),
              h("Sarah Whitfield — VP Marketing, Northwind SaaS", "h4", { color: T.accent }),
            ]),
            card([
              p("“The only agency we've worked with that reports on revenue instead of impressions. Organic is now our biggest channel and it isn't close.”"),
              h("Daniel Okafor — Founder, Meridian Retail", "h4", { color: T.violet }),
            ]),
            card([
              p("“Senior people, clear communication, zero drama. They shipped on the date they promised, which in my experience is genuinely rare.”"),
              h("Priya Raman — COO, Aster Health", "h4", { color: "#22c55e" }),
            ]),
          ],
          { count: 3 }
        ),
      ],
      {}
    ),

    // 9 ── FAQ
    section(
      [
        sectionIntro("Questions", "Everything you're probably wondering"),
        n("Faq", {
          title: "",
          faqs: [
            { question: "How much does a website cost?", answer: "Most marketing sites land between $12k and $45k depending on page count, integrations and content needs. E-commerce and product work typically starts around $30k. You'll get a fixed price before we start — we don't bill hourly surprises." },
            { question: "How long does a project take?", answer: "A focused marketing site is typically 6–10 weeks from kickoff to launch. Larger builds with custom functionality or migrations run 12–16 weeks. We'll give you a dated plan in the proposal." },
            { question: "Do you work with our existing brand?", answer: "Absolutely. Plenty of clients come with brand guidelines already in place and we design within them. If your identity needs work, we can handle that too — but it's never forced on you." },
            { question: "What happens after launch?", answer: "Every project includes 30 days of post-launch support. After that, most clients move to a monthly retainer for SEO, CRO and ongoing development — though there's no obligation, and you own everything either way." },
            { question: "Do you do SEO, or just build the site?", answer: "Both. Technical SEO is part of every build, and content strategy, digital PR and ongoing optimisation are available as a dedicated engagement. Ranking is an outcome we're measured on, not an upsell." },
            { question: "Can our team edit the site ourselves?", answer: "Yes — that's the point. We build on a visual CMS so your marketing team can create pages, publish posts and update content without a developer in the loop." },
          ],
        }, { timelines: reveal(0.05) }),
      ],
      { background: T.bgAlt, id: "faq" }
    ),

    // 10 ── Final CTA
    section(
      [
        h("Let's build something worth finding.", "h2", { align: "center" }),
        p("Tell us what you're trying to achieve and we'll come back within one business day with a clear, costed plan — no obligation, no hard sell.", {
          align: "center",
          fontSize: "1.1rem",
          maxWidth: "640px",
        }),
        n("Section", { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", justifyContent: "center", contentWidth: "full", background: "transparent" }, {
          children: [button("Start a project", "/contact"), button("See our services", "/services", "ghost")],
          style: { marginTop: "14px" },
          timelines: reveal(0.15),
        }),
      ],
      {
        align: "center",
        padY: "120px",
        style: {
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(37,99,255,0.20) 0%, rgba(124,58,237,0.20) 100%)",
          borderStyle: "solid",
          borderWidth: "1px",
          borderColor: "rgba(255,255,255,0.10)",
        },
      }
    ),
  ]);
}
