import Link from "next/link";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";

/** Shared by all 3 single-post templates — the admin's Theme Builder "Blog Post — CTA Banner" slot if one is active, else this generic placeholder banner. */
export function CtaSlot({ ctaLayout }: { ctaLayout?: unknown }) {
  if (ctaLayout != null) {
    return <LayoutRenderer blocks={ctaLayout} showAddSectionBanner={false} />;
  }

  return (
    <section className="border-t border-ink-border bg-ink-panel px-6 py-14 text-center md:px-12">
      <h2 className="text-2xl font-extrabold md:text-3xl">Have a project in mind?</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/60">
        Tell us what you&apos;re building and we&apos;ll get back to you within one business day.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/contact" className="rounded-full bg-gold px-7 py-3 text-xs font-normal text-white hover:bg-gold-dark">
          Get In Touch
        </Link>
        <Link href="/blog" className="rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-foreground/80 hover:text-foreground">
          More Articles
        </Link>
      </div>
    </section>
  );
}
