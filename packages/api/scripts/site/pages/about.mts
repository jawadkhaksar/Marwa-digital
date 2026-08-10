import { GLOW, IMG, T, advHeading, button, cols, doc, eyebrow, glowCard, image, marquee, n, p, pill, quote, row, section, spacer, splitHeading, stackedImages, statTile, statement, step } from "../kit.mjs";

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
    // 1 ── Hero
    section(
      [
        cols(
          [
            n("Section", { layoutMode: "flex", direction: "column", gap: "22px", contentWidth: "full", background: "transparent", justifyContent: "center", alignItems: "flex-start" }, {
              children: [
                pill("About us"),
                splitHeading("We're the team brands call when the website", " has to actually work.", "left", "h1"),
                p("A strategy-led agency of 22 people. Ten years building sites, stores and products for founders and marketing teams who are measured on results — and we're measured the same way.", { fontSize: "1.12rem", maxWidth: "540px" }),
                row([button("Work with us", "/contact"), button("See our work", "/case-studies", "ghost")]),
              ],
            }),
            stackedImages([IMG.collab, IMG.meeting, IMG.workspace]),
          ],
          { count: 2, ratio: "66-33", gap: "56px", align: "center" }
        ),
      ],
      { padY: "124px", background: GLOW.topRight, style: { minHeight: "72vh", justifyContent: "center" } }
    ),

    // 2 ── Stats
    section(
      [cols([statTile("2015", "Founded"), statTile("120+", "Projects shipped", T.violet), statTile("22", "Team members", "#22c55e"), statTile("14", "Countries served", "#f59e0b")], { count: 4, gap: "18px" })],
      { padY: "70px", background: T.bgAlt }
    ),

    // 3 ── Story split
    section(
      [
        cols(
          [
            image(IMG.workspace, "The Marwa Digital studio workspace"),
            n("Section", { layoutMode: "flex", direction: "column", gap: "18px", contentWidth: "full", background: "transparent", justifyContent: "center" }, {
              children: [
                eyebrow("Our story"),
                splitHeading("Started because good work", " kept losing to good pitching"),
                p("Marwa Digital began in 2015 with three people and a stubborn belief: the agency that understands your business should be the one building your website. Too often the opposite happens — a polished pitch wins the work, then it's handed to whoever is free."),
                p("We built the company to remove that gap. Every engagement is staffed with senior people from day one, scoped honestly, and delivered against outcomes agreed up front. It's a slower way to grow an agency. It's also why most clients stay for years, and why most new work arrives by referral."),
              ],
            }),
          ],
          { count: 2, gap: "56px", align: "center" }
        ),
      ],
      { background: GLOW.center }
    ),

    // 4 ── Statement
    section([statement("Fewer clients. Deeper partnerships. Work we'll put our name on.")], { padY: "120px", background: GLOW.dual }),

    // 5 ── Values
    section(
      [
        advHeading("What we believe", "Five principles we won't trade away", "center"),
        p("They sound obvious. Most agencies quietly break all five.", { align: "center", fontSize: "1.04rem", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }),
        spacer("14px"),
        cols(
          [
            glowCard("FaCheck", "Clarity over cleverness", "If a visitor has to work out what you do, the design failed — no matter how it looks in a portfolio.", T.accent),
            glowCard("FaBolt", "Speed is a feature", "Performance isn't a technical detail. It's the first thing every visitor experiences and what Google measures hardest.", T.violet),
            glowCard("FaStar", "Senior people, always", "No bait-and-switch staffing. The people who scope your project are the people who deliver it.", "#22c55e"),
            glowCard("FaChartLine", "Measured on outcomes", "We agree what success looks like before starting, then report against it honestly — including when it isn't working.", "#f59e0b"),
            glowCard("FaInfo", "You own everything", "Code, content, accounts, assets. No proprietary lock-in, no hostage situations if you ever leave.", "#ec4899"),
            glowCard("FaMobile", "Built for your team", "A site your marketers can update without a developer is worth more than one that needs us forever.", "#06b6d4"),
          ],
          { count: 3 }
        ),
      ],
      { background: GLOW.topLeft }
    ),

    // 6 ── Marquee
    section([marquee(["Strategy", "Research", "Web Design", "Engineering", "Technical SEO", "Brand Identity", "Conversion", "Product Design"], 30)], {
      padY: "34px",
      background: T.bgAlt,
      style: { borderStyle: "solid", borderWidth: "1px", borderColor: "rgba(255,255,255,0.07)" },
    }),

    // 7 ── How we work (numbered)
    section(
      [
        advHeading("How we work", "What the first month looks like", "center"),
        spacer("14px"),
        cols(
          [
            step("01", "Discovery first", "Stakeholder interviews, analytics review and a competitor teardown before anyone opens a design tool.", T.accent),
            step("02", "Strategy readout", "We present what we found, what it means, and where we think the leverage is — before design starts.", T.violet),
            step("03", "Structure, then surface", "Information architecture and wireframes get agreed before visual design, so structure is never an afterthought.", "#22c55e"),
            step("04", "Weekly demos", "You see working progress every week. Course corrections happen while they're still cheap.", "#f59e0b"),
          ],
          { count: 4, gap: "22px" }
        ),
      ],
      { background: GLOW.center }
    ),

    // 8 ── Team disciplines
    section(
      [
        advHeading("The team", "Senior by default", "center"),
        spacer("14px"),
        cols(
          [
            glowCard("FaStar", "Strategy & Research", "Positioning, buyer research, analytics and measurement planning — the work that decides whether the build succeeds.", T.accent),
            glowCard("FaPalette", "Design & Brand", "Identity, interface design and design systems built for teams that need to scale their own output.", T.violet),
            glowCard("FaCode", "Engineering", "Front-end, back-end and integrations. Modern stacks, accessible markup, code your next developer can read.", "#22c55e"),
            glowCard("FaSearch", "SEO & Growth", "Technical SEO, content strategy and conversion optimisation that compounds long after launch.", "#f59e0b"),
          ],
          { count: 4, gap: "20px" }
        ),
      ],
      { background: T.bgAlt }
    ),

    // 9 ── Testimonials
    section(
      [
        advHeading("Client stories", "Why they stayed", "center"),
        spacer("14px"),
        cols(
          [
            quote("We interviewed six agencies. Marwa was the only one that pushed back on our brief — and they were right to.", "Sarah Whitfield", "VP Marketing, Northwind SaaS", T.accent),
            quote("Three years in and they still feel like part of our team rather than a vendor we manage.", "Daniel Okafor", "Founder, Meridian Retail", T.violet),
            quote("Honest about what wouldn't work, which saved us a five-figure mistake in month one.", "Priya Raman", "COO, Aster Health", "#22c55e"),
          ],
          { count: 3 }
        ),
      ],
      { background: GLOW.topLeft }
    ),

    // 10 ── CTA
    section(
      [
        splitHeading("Let's find out", " if we're a fit.", "center"),
        p("A 30-minute call, no pitch deck. We'll tell you honestly whether we're the right team for what you're trying to do.", { align: "center", fontSize: "1.08rem", maxWidth: "620px", marginLeft: "auto", marginRight: "auto" }),
        row([button("Book a call", "/contact"), button("See our work", "/case-studies", "ghost")], "center"),
      ],
      {
        align: "center",
        padY: "120px",
        background: GLOW.dual,
        style: { textAlign: "center", borderStyle: "solid", borderWidth: "1px", borderColor: "rgba(255,255,255,0.10)" },
      }
    ),
  ]);
}
