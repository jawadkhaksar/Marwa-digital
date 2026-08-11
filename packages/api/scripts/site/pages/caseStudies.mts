import { GLOW, IMG, T, advHeading, button, card, cols, doc, eyebrow, h, image, n, p, pill, reveal, row, section, splitHeading, stackedImages, statTile, tickList } from "../kit.mjs";

export const caseStudiesMeta = {
  slug: "case-studies",
  title: "Case Studies — Client Results",
  metaTitle: "Case Studies | Real Client Results — Marwa Digital",
  metaDescription:
    "See how Marwa Digital grew organic traffic 312%, lifted e-commerce conversion 41% and rebuilt brands for enterprise deals. Real projects, real numbers.",
  metaKeywords: "digital agency case studies, web design results, SEO case study, ecommerce conversion case study",
};

function study(
  client: string,
  industry: string,
  headline: string,
  challenge: string,
  approach: string,
  results: string[],
  img: string,
  alt: string,
  flip: boolean,
  accent: string
) {
  const copy = n("Section", { layoutMode: "flex", direction: "column", gap: "16px", contentWidth: "full", background: "transparent", justifyContent: "center" }, {
    children: [
      eyebrow(`${client} · ${industry}`),
      h(headline),
      p(`<strong>The challenge.</strong> ${challenge}`),
      p(`<strong>What we did.</strong> ${approach}`),
      tickList(results, accent),
      row([button("Start a similar project", "/contact", "ghost")]),
    ],
  });
  const pic = image(img, alt);
  return section([cols(flip ? [pic, copy] : [copy, pic], { count: 2, gap: "56px", align: "center" })], {
    background: flip ? T.bgAlt : undefined,
    style: { borderColor: accent },
  });
}

export function caseStudiesLayout() {
  return doc([
    section(
      [
        cols(
          [
            n("Section", { layoutMode: "flex", direction: "column", gap: "22px", contentWidth: "full", background: "transparent", justifyContent: "center", alignItems: "flex-start" }, {
              children: [
                pill("Case studies"),
                splitHeading("Work we can point to", " numbers for.", "left", "h1"),
                p("Every project below shipped, launched and moved a metric the client cared about. Where we can share figures, we have — where a client asked us not to, we've said so.", { fontSize: "1.12rem", maxWidth: "540px" }),
                row([button("Start a project", "/contact"), button("See services", "/services", "ghost")]),
              ],
            }),
            stackedImages([IMG.analytics, IMG.workspace, IMG.meeting]),
          ],
          { count: 2, ratio: "66-33", gap: "56px", align: "center" }
        ),
      ],
      { padY: "124px", background: GLOW.topRight, style: { minHeight: "72vh", justifyContent: "center" } }
    ),

    section(
      [cols([statTile("312%", "Best organic growth"), statTile("41%", "Best conversion lift"), statTile("2.1x", "Average pipeline increase"), statTile("120+", "Projects delivered")], { count: 4, gap: "20px" })],
      { background: T.bgAlt, padY: "76px" }
    ),

    study(
      "Northwind",
      "B2B SaaS",
      "312% organic growth and 3x demo requests in nine months",
      "A capable product buried under a slow, sprawling site with no topical structure. Organic traffic had flatlined for two years and paid was the only channel producing pipeline.",
      "We rebuilt the front end on Next.js, restructured the information architecture around buyer intent rather than internal org chart, fixed a long tail of technical SEO debt, and shipped a 40-piece content programme mapped to their funnel.",
      [
        "Organic sessions up 312% in nine months",
        "Qualified demo requests up 3.1x",
        "Median page load down from 5.2s to 1.4s",
        "Cost per acquisition down 46% as paid dependency fell",
      ],
      IMG.analytics,
      "Analytics dashboard showing a steep increase in organic traffic",
      false,
      T.accent
    ),

    study(
      "Meridian Retail",
      "E-commerce",
      "A rebuilt storefront that lifted conversion 41%",
      "Strong brand, healthy traffic, and a checkout that leaked customers on mobile. Analytics showed two-thirds of mobile sessions abandoned at the payment step.",
      "We rebuilt product discovery and the entire checkout flow, introduced express payment methods, restructured product pages around objections raised in customer interviews, and instrumented the funnel properly so future decisions had evidence behind them.",
      [
        "Mobile conversion rate up 41%",
        "Average order value up 18%",
        "Checkout abandonment down from 67% to 38%",
        "Repeat purchase rate up 24% within two quarters",
      ],
      IMG.workspace,
      "Ecommerce product page shown on a laptop screen",
      true,
      "#f59e0b"
    ),

    study(
      "Aster Health",
      "Healthcare",
      "A rebrand that unlocked enterprise deals",
      "A respected consultancy priced and presented like a small local firm, losing competitive pitches to less capable but better-positioned rivals.",
      "We repositioned the firm around measurable clinical outcomes, rebuilt the identity and messaging system, and delivered a site designed for procurement teams and clinical directors rather than a general audience.",
      [
        "Average contract value doubled within two quarters",
        "Win rate on competitive pitches up from 22% to 48%",
        "Two enterprise accounts closed in the first six months",
        "Inbound enquiries up 87%",
      ],
      IMG.meeting,
      "Healthcare consultancy team in a strategy meeting",
      false,
      "#22c55e"
    ),

    study(
      "Lumen Studio",
      "Professional services",
      "From invisible to page one in a crowded market",
      "A design studio with excellent work and effectively zero search presence, competing against agencies with a decade of SEO investment behind them.",
      "Rather than fight for head terms, we built topical authority around the specific niches they win in, published a focused body of genuinely useful content, and earned links through original research the industry press picked up.",
      [
        "Ranking page one for 34 commercial keywords",
        "Organic traffic up 240% year on year",
        "Inbound leads now 60% of new business",
        "Original research cited by three industry publications",
      ],
      IMG.studio,
      "Design studio team collaborating on creative work",
      true,
      "#ec4899"
    ),

    section(
      [
        advHeading("The pattern", "What the successful projects have in common", "center"),
        cols(
          [
            card([h("Strategy before pixels", "h3"), p("Every result above started with research that changed the brief. The projects that skip discovery are the ones that ship on time and change nothing.")]),
            card([h("Speed as a lever", "h3"), p("Load time improvements alone accounted for a meaningful share of the conversion gains in three of these four projects.")], T.violet),
            card([h("Measurement from day one", "h3"), p("We instrument the funnel before launch. You can't optimise what you were never able to see.")], "#22c55e"),
          ],
          { count: 3 }
        ),
      ],
      {}
    ),

    section(
      [
        advHeading("Client stories", "In their words", "center"),
        cols(
          [
            card([p("“They rebuilt our site in ten weeks and it immediately outperformed the version we'd spent a year on.”"), h("Sarah Whitfield — VP Marketing, Northwind", "h4", { color: T.accent })]),
            card([p("“The only agency we've worked with that reports on revenue instead of impressions.”"), h("Daniel Okafor — Founder, Meridian Retail", "h4", { color: T.violet })]),
            card([p("“Senior people, clear communication, zero drama. They shipped on the date they promised.”"), h("Priya Raman — COO, Aster Health", "h4", { color: "#22c55e" })]),
          ],
          { count: 3 }
        ),
      ],
      { background: T.bgAlt }
    ),

    section(
      [
        h("Want results like these?", "h2", { align: "center" }),
        p("Tell us where you're stuck. We'll tell you what we'd do about it — and whether it's worth doing at all.", { align: "center", fontSize: "1.08rem", maxWidth: "620px" }),
        n("Section", { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", justifyContent: "center", contentWidth: "full", background: "transparent" }, {
          children: [button("Start a project", "/contact"), button("See our services", "/services", "ghost")],
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
