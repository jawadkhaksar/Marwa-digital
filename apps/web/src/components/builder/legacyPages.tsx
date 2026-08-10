import Image from "next/image";
import { api } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import { ContactForm } from "@/components/ContactForm";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

/**
 * The exact content of `/contact` (apps/web/src/app/contact/page.tsx), minus
 * <SiteFooter/> — SiteFooter is its own registrable block so a converted
 * builder page can reposition/remove it independently. Kept as a single
 * component (rather than decomposed into finer blocks) so "Convert to
 * Builder" is non-destructive: the page looks identical immediately after
 * conversion, and can be broken into smaller blocks incrementally later.
 */
export async function ContactPageContent() {
  const settings = await api.getSettings().catch(() => null);
  const faqs = await api.getFaqs().catch(() => []);
  const phone = settings?.contactPhone ?? "";
  const contactEmail = settings?.contactEmail ?? "hello@marwadigital.com";
  const address = settings?.contactAddress ?? "";
  const telHref = `tel:${phone.replace(/[^+\d]/g, "")}`;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings?.siteName ?? "Marwa Digital",
    url: settings?.siteUrl ?? "https://marwadigital.com",
    description: settings?.description ?? "A digital studio building websites, brands, and products.",
    ...(phone ? { telephone: phone.replace(/\s+/g, "") } : {}),
    email: contactEmail,
    ...(address ? { address: { "@type": "PostalAddress", streetAddress: address } } : {}),
  };

  return (
    <main className="bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {settings?.contactHeroImage && (
          <div className="absolute inset-0">
            <Image src={resolveImageUrl(settings.contactHeroImage)} alt="" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        )}

        <SiteHeader context={{ kind: "contact" }} />

        <div className="relative z-10 px-6 pb-16 pt-40 md:px-12 md:pb-24 md:pt-48">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
              {settings?.contactEyebrow ?? "Let's Work Together"}
            </p>
            <h1 className="mt-4 text-3xl font-extrabold uppercase leading-tight text-white md:text-5xl">
              {settings?.contactHeading ?? "Get In Touch"}
            </h1>
            <div className="mt-5 h-1 w-40 rounded-full bg-gold" />
            <p className="mt-6 max-w-xl text-white/80">
              {settings?.contactParagraph ??
                "Tell us about your project and we'll get back to you within one business day."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact-form"
                className="inline-block rounded-full bg-gold px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-gold-dark"
              >
                {settings?.contactCtaPrimaryLabel ?? "Start a Project"}
              </a>
              <a
                href="#contact-form"
                className="inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90"
              >
                {settings?.contactCtaSecondaryLabel ?? "Request a Quote"}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area - Dark Background */}
      <div className="bg-[#1c1c1c] pb-16 pt-8 md:pt-12">
        {/* Contact form + contact details */}
        <section className="px-4 md:px-8 mb-16 md:mb-20">
          <div className="mx-auto grid max-w-[1400px] gap-8 rounded-[2rem] bg-white py-10 px-5 md:py-[40px] md:px-[80px] lg:grid-cols-[1.1fr_1fr] xl:gap-12 shadow-2xl">
            <ContactForm />

            <div className="flex flex-col justify-center px-4 py-8 md:px-8 md:py-10">
              <p className="text-[16px] font-extrabold uppercase tracking-[1em] text-[#2563ff] text-center leading-none font-['Outfit']">
                {settings?.contactInfoEyebrow ?? "Contact"}
              </p>
              <h2 className="mt-4 text-[44px] font-black uppercase tracking-tight text-black leading-[1.1] text-center lg:text-left">
                {settings?.contactInfoTitle ?? "Talk To Us"}
              </h2>

              <div className="mt-8">
                <dl className="flex flex-col gap-4 bg-[#F8F8F8] py-[40px] px-[20px] rounded-[25px]">
                  <InfoRow label="General Enquiries" value={contactEmail} href={`mailto:${contactEmail}`} />
                  {phone && <InfoRow label="Phone" value={phone} href={telHref} />}
                  <InfoRow label="Business Hours" value={settings?.contactBusinessHours ?? "Mon–Fri, 9:00–18:00"} />
                  {address && <InfoRow label="Address" value={address} />}
                </dl>
              </div>

              {address && (
                <div className="mt-8 flex-grow min-h-[200px] overflow-hidden rounded-xl shadow-sm">
                  <iframe
                    title={`${settings?.siteName ?? "Marwa Digital"} office location`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                    className="h-full min-h-[200px] w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQs */}
        {faqs.length > 0 && (
          <section className="px-4 py-16 text-black md:px-8 md:py-20">
            <div className="mx-auto max-w-[1400px] rounded-[2.5rem] bg-white p-8 md:p-14 relative overflow-hidden shadow-2xl">
              <h2 className="mb-10 text-center text-3xl font-black uppercase md:text-4xl">
                {settings?.contactFaqHeading ?? "Frequently Asked Questions"}
              </h2>
              <div className="flex flex-col gap-4 relative z-10 max-w-5xl mx-auto">
                {faqs.map((faq) => (
                  <details key={faq.id} className="group cursor-pointer rounded-xl bg-[#f9f9f9] px-6 py-4 md:py-5">
                    <summary className="list-none text-xs font-extrabold uppercase tracking-wide text-black focus:outline-none md:text-sm">
                      {faq.question}
                    </summary>
                    <p className="pt-3 text-sm leading-relaxed text-black/70">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="text-xs md:text-sm leading-snug">
      <span className="font-extrabold uppercase tracking-wide text-black mr-2">{label}:</span>
      <span className="font-medium text-black/80">
        {href ? (
          <a href={href} className="transition-colors hover:text-[#2563ff]">
            {value}
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  );
}
