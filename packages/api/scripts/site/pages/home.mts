import { GLOW, IMG, T, advHeading, button, card, cols, doc, eyebrow, glowCard, h, heroSlider, image, marquee, n, p, pill, quote, reveal, row, section, spacer, splitHeading, statTile, statement, step, tickList } from "../kit.mjs";

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
    // 1 ── Hero carousel: three slides, three different search intents
    section(
      [
        heroSlider([
          {
            image: "https://images.unsplash.com/photo-1635776062360-af423602aff3?auto=format&fit=crop&w=1920&q=80",
            heading: "Custom Web & Mobile App Development",
            subheading: "From custom web and mobile applications to AI-powered solutions and CMS platforms, our development team builds scalable digital products tailored to your business.",
            buttonLabel: "Explore more",
            buttonUrl: "/services#web-development",
            buttonLabel2: "Get a free consultation",
            buttonUrl2: "/contact",
          },
          {
            image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1920&q=80",
            heading: "Full-Stack Development & AI Solutions",
            subheading: "From custom web and mobile applications to AI-powered solutions and CMS platforms, our development team builds scalable digital products tailored to your business.",
            buttonLabel: "Explore more",
            buttonUrl: "/services#product-ux",
            buttonLabel2: "Get a free consultation",
            buttonUrl2: "/contact",
          },
          {
            image: "https://images.unsplash.com/photo-1614851099175-e5b30eb6f696?auto=format&fit=crop&w=1920&q=80",
            heading: "WordPress, Shopify & CMS Development",
            subheading: "From custom web and mobile applications to AI-powered solutions and CMS platforms, our development team builds scalable digital products tailored to your business.",
            buttonLabel: "Explore more",
            buttonUrl: "/services#ecommerce",
            buttonLabel2: "Get a free consultation",
            buttonUrl2: "/contact",
          },
        ]),
      ],
      { id: "hero", padY: "0px", background: "#06091a", style: { paddingLeft: "0px", paddingRight: "0px", mobile: { paddingLeft: "0px", paddingRight: "0px" } }, width: "100%" }
    ),

    // 1b ── Positioning strip directly under the carousel
    section(
      [
        cols(
          [
            n("Section", { layoutMode: "flex", direction: "column", gap: "20px", contentWidth: "full", background: "transparent", justifyContent: "center", alignItems: "flex-start" }, {
              children: [
                pill("Full-service digital agency"),
                splitHeading("We build software and websites that win attention —", " and keep it.", "left", "h2"),
                p("Strategy, design, engineering and SEO under one roof. We ship products that load fast, rank well and turn visitors into revenue — then we prove it with numbers.", { fontSize: "1.1rem", maxWidth: "540px" }),
                row([button("Start a project", "/contact"), button("View our work", "/case-studies", "ghost")]),
              ],
            }),
            cols([statTile("120+", "Projects"), statTile("98%", "Retention", T.violet), statTile("14", "Countries", "#22c55e"), statTile("9.4/10", "Client rating", "#f59e0b")], { count: 2, gap: "16px" }),
          ],
          { count: 2, gap: "56px", align: "center" }
        ),
      ],
      { padY: "84px", background: GLOW.topLeft }
    ),

    // 2 ── Moving keyword band
    section([marquee(["Web Design", "Web Development", "Technical SEO", "E-commerce", "Brand Identity", "Product & UX", "Conversion Optimisation", "Content Strategy"])], {
      padY: "34px",
      background: T.bgAlt,
      style: { borderStyle: "solid", borderWidth: "1px", borderColor: "rgba(255,255,255,0.07)" },
    }),

    // 3 ── Positioning trio (glowing cards)
    section(
      [
        cols(
          [
            glowCard("FaBolt", "Built for speed", "Core Web Vitals in the green on every build — because slow sites lose both rankings and revenue.", T.accent),
            glowCard("FaSearch", "Engineered to rank", "Technical SEO designed into the architecture from day one, not bolted on after launch.", T.violet),
            glowCard("FaChartLine", "Measured on outcomes", "We report on pipeline and conversions, never on vanity impressions.", "#22c55e"),
          ],
          { count: 3 }
        ),
      ],
      { padY: "88px", background: GLOW.center }
    ),

    // 4 ── Services
    section(
      [
        advHeading("What we do", "Everything your brand needs to compete online", "center", "compete online"),
        p("Six disciplines, one senior team. Take a single project or hand us the whole thing.", { align: "center", fontSize: "1.06rem", maxWidth: "660px", marginLeft: "auto", marginRight: "auto" }),
        spacer("14px"),
        cols(
          [
            glowCard("FaPalette", "Web Design", "Conversion-focused interfaces designed around how your customers actually buy — not around trends.", T.accent),
            glowCard("FaCode", "Web Development", "Fast, accessible builds on modern frameworks, with a CMS your team can actually operate.", T.violet),
            glowCard("FaSearch", "SEO & Content", "Technical SEO, content strategy and digital PR that compound into durable organic growth.", "#22c55e"),
            glowCard("FaShoppingCart", "E-commerce", "Storefronts engineered for average order value, repeat purchase and checkout completion.", "#f59e0b"),
            glowCard("FaStar", "Branding & Identity", "Positioning, naming and visual systems that make you impossible to confuse with anyone else.", "#ec4899"),
            glowCard("FaMobile", "Product & UX", "Research, prototyping and design systems for teams shipping real software at pace.", "#06b6d4"),
          ],
          { count: 3 }
        ),
      ],
      { id: "services", background: GLOW.topRight }
    ),

    // 5 ── Statement moment
    section([statement("We don't sell websites. We sell the outcome a website is supposed to produce.")], {
      padY: "128px",
      background: GLOW.dual,
    }),

    // 6 ── Why us split
    section(
      [
        cols(
          [
            n("Section", { layoutMode: "flex", direction: "column", gap: "18px", contentWidth: "full", background: "transparent", justifyContent: "center" }, {
              children: [
                eyebrow("Why Marwa Digital"),
                splitHeading("A senior team,", " no handoffs, no surprises"),
                p("Most agencies sell you a pitch team and deliver with juniors. We don't. The strategists and engineers in your kickoff call are the people doing the work — which is why our projects ship on time and our clients stay an average of three years."),
                tickList(["A dedicated senior team from kickoff to launch",
                    "Fixed scope and fixed price — no hourly surprises",
                    "Weekly demos, so you always see progress",
                    "Full ownership of code, content and assets",
                    "30 days of post-launch support included",]),
                row([button("Talk to a strategist", "/contact")]),
              ],
            }),
            image(IMG.meeting, "The Marwa Digital team reviewing a website design together"),
          ],
          { count: 2, gap: "58px", align: "center" }
        ),
      ],
      { background: T.bgAlt }
    ),

    // 7 ── Process (numbered steps)
    section(
      [
        advHeading("How we work", "A process built to remove risk", "center"),
        spacer("14px"),
        cols(
          [
            step("01", "Discover", "Stakeholder interviews, analytics review and competitor teardown. We find the constraints before designing around them.", T.accent),
            step("02", "Design", "Wireframes, then full UI and a design system. You approve direction before production code exists.", T.violet),
            step("03", "Build", "Two-week sprints with weekly demos, QA on real devices, accessibility baked in.", "#22c55e"),
            step("04", "Grow", "Launch, measure, iterate. Ongoing SEO and CRO turning the site into a compounding asset.", "#f59e0b"),
          ],
          { count: 4, gap: "22px" }
        ),
      ],
      { id: "process", background: GLOW.center }
    ),

    // 8 ── Featured work
    section(
      [
        advHeading("Selected work", "Results, not just screenshots", "center"),
        spacer("14px"),
        cols(
          [
            card([
              image(IMG.analytics, "Analytics dashboard showing organic traffic growth", "12px"),
              h("312% organic growth in 9 months", "h3"),
              p("A B2B SaaS platform rebuilt on a new technical foundation, paired with a topical content programme that tripled qualified demo requests."),
            ]),
            card([
              image(IMG.desk, "Ecommerce product page design shown on a laptop", "12px"),
              h("+41% conversion on a rebuilt storefront", "h3"),
              p("We rebuilt a fashion retailer's checkout and product experience, lifting mobile conversion 41% and average order value 18%."),
            ], T.violet),
            card([
              image(IMG.studio, "Brand identity design materials on a studio desk", "12px"),
              h("A rebrand that unlocked enterprise deals", "h3"),
              p("New positioning, identity and site for a consultancy moving upmarket — average contract value doubled within two quarters."),
            ], "#22c55e"),
          ],
          { count: 3 }
        ),
        row([button("Explore all case studies", "/case-studies", "ghost")], "center"),
      ],
      { background: T.bgAlt }
    ),

    // 9 ── Stats over photo
    section(
      [cols([statTile("9.4/10", "Client rating"), statTile("< 2s", "Median load", T.violet), statTile("3 yrs", "Avg. tenure", "#22c55e"), statTile("24h", "Response time", "#f59e0b")], { count: 4, gap: "18px" })],
      { padY: "82px", backgroundImage: IMG.city, overlay: "rgba(8,11,31,0.9)" }
    ),

    // 10 ── Testimonials
    section(
      [
        advHeading("Client stories", "What it's like to work with us", "center"),
        spacer("14px"),
        cols(
          [
            quote("They rebuilt our site in ten weeks and it immediately outperformed the version we'd spent a year on. The difference was strategy — they understood our buyer before touching design.", "Sarah Whitfield", "VP Marketing, Northwind SaaS", T.accent),
            quote("The only agency we've worked with that reports on revenue instead of impressions. Organic is now our biggest channel and it isn't close.", "Daniel Okafor", "Founder, Meridian Retail", T.violet),
            quote("Senior people, clear communication, zero drama. They shipped on the date they promised, which in my experience is genuinely rare.", "Priya Raman", "COO, Aster Health", "#22c55e"),
          ],
          { count: 3 }
        ),
      ],
      { background: GLOW.topLeft }
    ),

    // 11 ── FAQ
    section(
      [
        advHeading("Questions", "Everything you're probably wondering", "center"),
        spacer("8px"),
        n("Faq", {
          title: "",
          faqs: [
            { question: "How much does a website cost?", answer: "Most marketing sites land between $12k and $45k depending on page count, integrations and content needs. E-commerce and product work typically starts around $30k. You'll get a fixed price before we start — we don't bill hourly surprises." },
            { question: "How long does a project take?", answer: "A focused marketing site is typically 6–10 weeks from kickoff to launch. Larger builds with custom functionality or migrations run 12–16 weeks. We'll give you a dated plan in the proposal." },
            { question: "Do you work with our existing brand?", answer: "Absolutely. Plenty of clients arrive with brand guidelines already in place and we design within them. If your identity needs work we can handle that too — but it's never forced on you." },
            { question: "What happens after launch?", answer: "Every project includes 30 days of post-launch support. After that most clients move to a monthly retainer for SEO, CRO and ongoing development — though there's no obligation, and you own everything either way." },
            { question: "Do you do SEO, or just build the site?", answer: "Both. Technical SEO is part of every build, and content strategy, digital PR and ongoing optimisation are available as a dedicated engagement. Ranking is an outcome we're measured on, not an upsell." },
            { question: "Can our team edit the site ourselves?", answer: "Yes — that's the point. We build on a visual CMS so your marketing team can create pages, publish posts and update content without a developer in the loop." },
          ],
        }, { timelines: reveal(0.05) }),
      ],
      { id: "faq", background: T.bgAlt }
    ),

    // 12 ── Final CTA
    section(
      [
        splitHeading("Let's build something", " worth finding.", "center"),
        p("Tell us what you're trying to achieve and we'll come back within one business day with a clear, costed plan — no obligation, no hard sell.", {
          align: "center",
          fontSize: "1.1rem",
          maxWidth: "640px",
          marginLeft: "auto",
          marginRight: "auto",
        }),
        row([button("Start a project", "/contact"), button("See our services", "/services", "ghost")], "center"),
      ],
      {
        align: "center",
        padY: "126px",
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
