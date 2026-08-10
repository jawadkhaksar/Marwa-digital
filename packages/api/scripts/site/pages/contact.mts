import { T, IMG, section, sectionIntro, cols, card, h, p, eyebrow, iconBox, doc, n, reveal, spacer } from "../kit.mjs";

export const contactMeta = {
  slug: "contact",
  title: "Contact Marwa Digital",
  metaTitle: "Contact Us | Get a Free Proposal — Marwa Digital",
  metaDescription:
    "Tell us about your project and get a costed plan within one business day. Web design, development, SEO and branding from a senior team. No obligation.",
  metaKeywords: "contact digital agency, request a quote, web design proposal, hire web agency",
};

export function contactLayout() {
  return doc([
    section(
      [
        eyebrow("Contact"),
        h("Tell us what you're trying to build", "h1", { align: "center" }),
        p(
          "Send us a few details and we'll come back within one business day with honest feedback, a suggested approach and a ballpark budget — before you commit to anything.",
          { align: "center", fontSize: "1.12rem", maxWidth: "740px" }
        ),
      ],
      { backgroundImage: IMG.collab, overlay: "rgba(8,11,31,0.88)", padY: "120px", align: "center", style: { textAlign: "center" } }
    ),

    section(
      [
        cols(
          [
            n("Section", { layoutMode: "flex", direction: "column", gap: "18px", contentWidth: "full", background: "transparent" }, {
              children: [
                h("Send us a message", "h2"),
                p("The more context you can give us, the more useful our first reply will be."),
                n(
                  "Form",
                  {
                    formName: "Contact — Marwa Digital",
                    formId: "contact-page",
                    submitLabel: "Send message",
                    inputSize: "lg",
                    showLabel: true,
                    actions: ["collectSubmissions", "email"],
                    emailSubject: "New enquiry from marwadigital.com",
                    emailMessage: "{{all_fields}}",
                    fields: [
                      { id: "name", type: "text", label: "Your name", placeholder: "Jane Doe", required: true, columnWidth: "50" },
                      { id: "email", type: "email", label: "Work email", placeholder: "jane@company.com", required: true, columnWidth: "50" },
                      { id: "company", type: "text", label: "Company", placeholder: "Company name", required: false, columnWidth: "50" },
                      { id: "phone", type: "tel", label: "Phone", placeholder: "Optional", required: false, columnWidth: "50" },
                      { id: "budget", type: "text", label: "Approximate budget", placeholder: "e.g. $15k–$30k", required: false, columnWidth: "100" },
                      { id: "message", type: "textarea", label: "What are you trying to achieve?", placeholder: "Tell us about the project, your timeline, and what success looks like.", required: true, columnWidth: "100" },
                    ],
                  },
                  { timelines: reveal(0.05) }
                ),
              ],
            }),
            n("Section", { layoutMode: "flex", direction: "column", gap: "18px", contentWidth: "full", background: "transparent" }, {
              children: [
                card([iconBox("FaMail", "Email us", "hello@marwadigital.com — we answer every enquiry within one business day.")]),
                card([iconBox("FaPhone", "Call us", "Prefer to talk it through? Book a 30-minute call and we'll come prepared.", T.violet)]),
                card([iconBox("FaClock", "Office hours", "Monday to Friday, 9:00–18:00. Urgent support for retainer clients is 24/7.", "#22c55e")]),
                card([iconBox("FaCheck", "What happens next", "We review your brief, come back with questions or a proposal, then scope properly together. No pressure, no sales sequence.", "#f59e0b")]),
              ],
            }),
          ],
          { count: 2, ratio: "66-33", gap: "48px", align: "flex-start" }
        ),
      ],
      { padY: "96px" }
    ),

    section(
      [
        sectionIntro("Before you write", "Three things that make our first reply more useful"),
        cols(
          [
            card([h("What's the outcome?", "h3"), p("“More qualified leads” tells us more than “a new website”. Tell us the business result you're chasing and we can tell you whether a rebuild is even the right lever.")]),
            card([h("What's the timeline?", "h3"), p("A hard launch date changes what's realistic. If you have one — a funding round, a trade show, a product launch — say so up front.")], T.violet),
            card([h("What's the budget range?", "h3"), p("Not to spend it all. A range lets us propose something honest instead of guessing high and losing you, or guessing low and cutting corners.")], "#22c55e"),
          ],
          { count: 3 }
        ),
      ],
      { background: T.bgAlt }
    ),

    section(
      [
        sectionIntro("Common questions", "Answered before you ask"),
        n("Faq", {
          title: "",
          faqs: [
            { question: "How quickly will I hear back?", answer: "Within one business day, from a real person who has read your brief — not an automated acknowledgement. If your enquiry needs input from a specialist on the team, we'll say so and come back within two days." },
            { question: "Do you charge for the proposal?", answer: "No. Scoping conversations, our recommendation and a costed proposal are all free. We only charge once work starts — and paid discovery, where we do genuine research, is always quoted separately and agreed in advance." },
            { question: "Do you work with clients outside your timezone?", answer: "Yes — we currently work with clients across 14 countries. We hold a fixed weekly call in a window that works for you and keep everything else asynchronous and documented." },
            { question: "What if we already have a designer or developer?", answer: "That's common and completely fine. We regularly slot into existing teams to cover a specific gap, and we're happy to work alongside your in-house people rather than replacing them." },
            { question: "Is there a minimum project size?", answer: "Our smallest engagements start around $12,000. Below that we'd rather point you toward someone better suited than take work we can't staff properly." },
          ],
        }, { timelines: reveal(0.05) }),
      ],
      {}
    ),

    section(
      [
        h("Prefer to see the work first?", "h2", { align: "center" }),
        p("Have a look at what we've shipped and the numbers behind it — then decide whether it's worth a conversation.", { align: "center", fontSize: "1.06rem", maxWidth: "600px" }),
        spacer("8px"),
        n("Section", { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", justifyContent: "center", contentWidth: "full", background: "transparent" }, {
          children: [
            n("CTAButton", { label: "View case studies", href: "/case-studies", variant: "gold", borderRadius: "9999px", background: T.gradient, color: "#ffffff", borderStyle: "none", paddingTop: "16px", paddingBottom: "16px", paddingLeft: "34px", paddingRight: "34px", fontWeight: "600" }),
            n("CTAButton", { label: "Browse services", href: "/services", variant: "gold", borderRadius: "9999px", background: "transparent", color: "#ffffff", borderStyle: "solid", borderWidth: "1px", borderColor: "rgba(255,255,255,0.28)", paddingTop: "16px", paddingBottom: "16px", paddingLeft: "34px", paddingRight: "34px", fontWeight: "600" }),
          ],
          timelines: reveal(0.12),
        }),
      ],
      {
        align: "center",
        padY: "110px",
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
