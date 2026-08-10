import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Admin-uploaded Site Icon lives on the API at /uploads/** — same
// cross-origin reasoning as apps/web's resolveImageUrl (there's no
// equivalent shared helper in this app, so this is the one place it's needed).
function resolveUploadUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

interface PublicSiteSettings {
  siteName: string;
  siteIcon: string | null;
  updatedAt: string;
}

export async function generateMetadata(): Promise<Metadata> {
  // Plain fetch against the PUBLIC settings endpoint, not the authenticated
  // admin/api.ts client — generateMetadata runs server-side with no user JWT
  // available (the token lives in localStorage, browser-only).
  const settings = await fetch(`${API_URL}/api/settings`, { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<PublicSiteSettings>) : null))
    .catch(() => null);

  // /public/favicon.ico (NOT app/favicon.ico — Next's file-convention icon
  // there always wins over metadata.icons, which is why an uploaded Site
  // Icon never showed up here either) is the fallback when none is set.
  // `v=` cache-busts on the settings row's own updatedAt.
  const icon = settings?.siteIcon
    ? `${resolveUploadUrl(settings.siteIcon)}?v=${encodeURIComponent(settings.updatedAt)}`
    : "/favicon.ico";

  return {
    title: settings?.siteName ? `${settings.siteName} Admin` : "Marwa Digital Admin",
    description: "Dispatch and fleet management for Marwa Digital.",
    icons: { icon },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
