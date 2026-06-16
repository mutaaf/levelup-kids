import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Public_Sans } from "next/font/google";
import "./globals.css";

// Display face — Fraunces variable, optical 9–144 (docs/DESIGN.md §3).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

// Body face — Söhne is licensed, so v1.0 ships the named open fallback
// (Public Sans, per docs/DESIGN.md §3). Inter is BANNED.
const body = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Mono — used only for XP pips, timestamps, and dev preview.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LevelUp Kids — raise the kind of adult you actually want to raise.",
  description:
    "A family operating system for raising curious, confident, capable, creative, faithful, healthy, kind, resilient kids. Eight pillars. Daily quests. Family Growth Score.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${body.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh bg-paper text-ink-primary antialiased">
        {children}
      </body>
    </html>
  );
}
