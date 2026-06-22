import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Quicksand } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/pwa/SwRegister";

// Display face — Quicksand (2026-06-22 rebrand). Rounded, friendly, modern.
// We expose it under both the `--font-display` token (the new name) AND
// the historical `--font-fraunces` token so existing inline-styled headings
// continue to render without per-file edits.
const displayFont = Quicksand({
  variable: "--font-fraunces", // backwards-compat alias
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Mono — for XP pips, timestamps, dev preview.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LevelUp Kids — raise the kind of adult you actually want to raise.",
  description:
    "A family operating system for raising curious, confident, capable, creative, faithful, healthy, kind, resilient kids. Eight pillars. Daily quests. Family Growth Score.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LevelUp Kids",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh bg-paper text-ink-primary antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
