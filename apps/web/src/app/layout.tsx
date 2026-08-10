import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { GoogleTranslate } from "@/components/GoogleTranslate";
import { BackToTop } from "@/components/BackToTop";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { CustomCursor } from "@/components/CustomCursor";
import { CursorGlow } from "@/components/CursorGlow";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { ThemeProvider, NO_FLASH_THEME_SCRIPT } from "@/components/ThemeProvider";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { api } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Last-resort fallback only — used when the settings fetch itself fails
// (DB/API down), not a design default. Every field here normally comes from
// Admin → Settings → General (siteName/tagline/siteUrl) instead.
const FALLBACK_SITE_URL = "https://marwadigital.com";
const FALLBACK_SITE_TITLE = "Marwa Digital | Design, Build, Grow.";
const FALLBACK_SITE_DESCRIPTION = "A digital studio building websites, brands, and products.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await api.getSettings().catch(() => null);

  const siteUrl = settings?.siteUrl || FALLBACK_SITE_URL;
  const siteTitle = settings ? `${settings.siteName} | ${settings.tagline}` : FALLBACK_SITE_TITLE;
  const description = settings?.description || FALLBACK_SITE_DESCRIPTION;
  // /public/favicon.ico (NOT app/favicon.ico — Next's file-convention icon
  // there always wins over metadata.icons no matter what this returns, which
  // is exactly why an uploaded Site Icon never appeared) is the fallback when
  // no custom one is set. `v=` cache-busts on the settings row's own
  // updatedAt — stable between saves, still forces browsers to refetch a
  // favicon they'd otherwise cache near-permanently once one actually changes.
  const icon = settings?.siteIcon
    ? `${resolveImageUrl(settings.siteIcon)}?v=${encodeURIComponent(settings.updatedAt)}`
    : "/favicon.ico";

  return {
    metadataBase: new URL(siteUrl),
    title: { default: siteTitle, template: `%s | ${settings?.siteName || "Marwa Digital"}` },
    description,
    icons: { icon },
    // Reading Settings → "Discourage search engines from indexing this
    // site" — a page-level metadata.robots (e.g. tours/[slug]'s own
    // metaRobotsIndex/Follow) still overrides this at that page, same as
    // WordPress lets per-post SEO plugins override the sitewide toggle.
    robots: settings?.searchEngineNoindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: siteTitle,
      description,
      url: siteUrl,
      siteName: settings?.siteName || "Marwa Digital",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Same api.getSettings() call generateMetadata already makes above — Next
  // dedupes identical fetches within a single render pass, so this doesn't
  // cost a second round-trip.
  const settings = await api.getSettings().catch(() => null);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        {/* A plain <script>, NOT next/script: this layout is a Server
            Component, so the tag is only ever server-rendered and then
            hydrated, never *created* during a client render — which is the
            only thing React's "Scripts inside React components are never
            executed" warning fires on. See the doc comment on
            NO_FLASH_THEME_SCRIPT in ThemeProvider.tsx. */}
        <script id="no-flash-theme" dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
        <ThemeProvider>
          <AnalyticsTracker
            cookieDays={settings?.analyticsCookieDays ?? 30}
            excludeAdminTraffic={settings?.analyticsExcludeAdminTraffic ?? true}
            recordingEnabled={settings?.sessionRecordingEnabled ?? true}
          />
          <GoogleTranslate />
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
          <CustomCursor />
          <CursorGlow />
          <BackToTop />
          <FloatingWhatsApp />
        </ThemeProvider>
      </body>
    </html>
  );
}
