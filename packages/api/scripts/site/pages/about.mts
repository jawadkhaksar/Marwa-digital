import { T, IMG, section, sectionIntro, cols, card, h, p, eyebrow, button, iconBox, counter, image, doc, n, reveal, spacer } from "../kit.mjs";

export const aboutMeta = {
  slug: "about",
  title: "About Marwa Digital",
  metaTitle: "About Us | Marwa Digital — Strategy-Led Digital Agency",
  metaDescription:
    "Meet Marwa Digital: a senior team of strategists, designers and engineers building websites and brands that measurably grow revenue. Our story, values and how we work.",
  metaKeywords: "about digital agency, web design team, digital agency values, agency culture",
};

export function aboutLayout() {
  return doc([
    section(
      [
        eyebrow("About us"),
        h("We're the team brands call when the website has to actually work.", "h1", { align: "center" }),
        p(
          "Marwa Digital is a strategy-led digital agency. We've spent a decade building sites, stores and products for founders and marketing teams who are measured on results — and we're measured the same way.",
          { align: "center", fontSize: "1.12rem", maxWidth: "760px" }
        ),
      ],
      { backgroundImage: IMG.collab, overlay: "rgba(8,11,31,0.86)", padY: "132px", align: "center", style: { textAlign: "center" } }
    ),

    section(
      [
        cols(
          [
            image(IMG.workspace, "The Marwa Digital studio workspace"),
            n("Section", { layoutMode: "flex", direction: "column", gap: "18px", contentWidth: "full", background: "transparent", justifyContent: "center" }, {
              children: [
                eyebrow("Our story"),
                h("Started because good work kept losing to good pitching"),
                p(
                  "Marwa Digital began in 2015 with three people and a stubborn belief: the agency that understands your business should be the one building your website. Too often the opposite happens — a polished pitch wins the work, then it's handed to whoever is free.",
                ),
                p(
                  "We built the company to remove that gap. Every engagement is staffed with senior people from day one, scoped honestly, and delivered against outcomes we agree up front. It's a slower way to grow an agency. It's also why most of our clients have been with us for years, and why the majority of our new work arrives by referral.",
                ),
              ],
            }),
          ],
          { count: 2, gap: "56px", align: "center" }
        ),
      ],
      {}
    ),

    section(
      [cols([counter("2015", "Founded"), counter("120+", "Projects shipped"), counter("22", "Team members"), counter("14", "Countries served")], { count: 4, gap: "20px" })],
      { background: T.bgAlt, padY: "76px" }
    ),

    section(
      [
        sectionIntro("What we believe", "Five principles we won't trade away", "They sound obvious. Most agencies quietly break all five."),
        cols(
          [
            card([iconBox("FaCheck", "Clarity over cleverness", "If a visitor has to work out what you do, the design failed — no matter how it looks in a portfolio.")]),
            card([iconBox("FaBolt", "Speed is a feature", "Performance isn't a technical detail. It's the first thing every visitor experiences and the thing Google measures hardest.", T.violet)]),
            card([iconBox("FaStar", "Senior people, always", "No bait-and-switch staffing. The people who scope your project are the people who deliver it.", "#22c55e")]),
            card([iconBox("FaChartLine", "Measured on outcomes", "We agree what success looks like before we start, then report against it honestly — including when it's not working.", "#f59e0b")]),
            card([iconBox("FaInfo", "You own everything", "Code, content, accounts, assets. No proprietary lock-in, no hostage situations if you ever leave.", "#ec4899")]),
            card([iconBox("FaMobile", "Built for your team", "A site your marketers can update without a developer is worth more than one that needs us forever.", "#06b6d4")]),
          ],
          { count: 3 }
        ),
      ],
      {}
    ),

    section(
      [
        sectionIntro("How we work", "Fewer clients, deeper partnerships"),
        cols(
          [
            card([h("Discovery first, always", "h3"), p("We won't quote a website before understanding your buyers, your sales process and your constraints. The discovery phase is short, paid and produces something useful even if you never build with us.")]),
            card([h("Two-week sprints, weekly demos", "h3"), p("You see working software every week. No six-week silences ending in a reveal that misses the mark — course corrections happen while they're still cheap.")]),
            card([h("One team, start to finish", "h3"), p("Strategy, design and engineering sit together on your project. Nothing gets lost in a handoff between departments that never speak.")]),
          ],
          { count: 3 }
        ),
      ],
      { background: T.bgAlt }
    ),

    section(
      [
        sectionIntro("The team", "Senior by default"),
        cols(
          [
            card([iconBox("FaStar", "Strategy & Research", "Positioning, buyer research, analytics and measurement planning — the work that decides whether the build succeeds.")]),
            card([iconBox("FaPalette", "Design & Brand", "Identity, interface design and design systems built for teams that need to scale their own output.", T.violet)]),
            card([iconBox("FaCode", "Engineering", "Front-end, back-end and integrations. Modern stacks, accessible markup, and code your next developer can read.", "#22c55e")]),
            card([iconBox("FaSearch", "SEO & Growth", "Technical SEO, content strategy and conversion optimisation that compounds long after launch.", "#f59e0b")]),
          ],
          { count: 4, gap: "20px" }
        ),
      ],
      {}
    ),

    section(
      [
        cols(
          [
            n("Section", { layoutMode: "flex", direction: "column", gap: "18px", contentWidth: "full", background: "transparent", justifyContent: "center" }, {
              children: [
                eyebrow("Working with us"),
                h("What to expect in the first 30 days"),
                n("Checklist", {
                  eyebrow: "",
                  title: "",
                  includedLabel: "Your first month:",
                  includedItems: [
                    "Week 1 — kickoff, stakeholder interviews, analytics audit",
                    "Week 2 — competitive teardown and strategy readout",
                    "Week 3 — information architecture and wireframes",
                    "Week 4 — first full design direction presented",
                    "Throughout — a weekly demo and a named point of contact",
                  ],
                  excludedLabel: "",
                  excludedItems: [],
                  ctaLabel: "Book a discovery call",
                  ctaHref: "/contact",
                  containerBackground: "transparent",
                  containerBorderColor: "transparent",
                }),
              ],
            }),
            image(IMG.strategy, "Strategy workshop in progress with sticky notes and a whiteboard"),
          ],
          { count: 2, gap: "56px", align: "center" }
        ),
      ],
      { background: T.bgAlt }
    ),

    section(
      [
        sectionIntro("Client stories", "Why they stayed"),
        cols(
          [
            card([p("“We interviewed six agencies. Marwa was the only one that pushed back on our brief — and they were right to.”"), h("Sarah Whitfield — VP Marketing, Northwind SaaS", "h4", { color: T.accent })]),
            card([p("“Three years in and they still feel like part of our team rather than a vendor we manage.”"), h("Daniel Okafor — Founder, Meridian Retail", "h4", { color: T.violet })]),
            card([p("“Honest about what wouldn't work, which saved us a five-figure mistake in month one.”"), h("Priya Raman — COO, Aster Health", "h4", { color: "#22c55e" })]),
          ],
          { count: 3 }
        ),
      ],
      {}
    ),

    section(
      [
        h("Let's find out if we're a fit.", "h2", { align: "center" }),
        p("A 30-minute call, no pitch deck. We'll tell you honestly whether we're the right team for what you're trying to do.", { align: "center", fontSize: "1.08rem", maxWidth: "620px" }),
        n("Section", { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", justifyContent: "center", contentWidth: "full", background: "transparent" }, {
          children: [button("Book a call", "/contact"), button("See our work", "/case-studies", "ghost")],
          style: { marginTop: "14px" },
          timelines: reveal(0.15),
        }),
      ],
      {
        align: "center",
        padY: "116px",
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
