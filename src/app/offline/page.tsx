import type { Metadata } from "next";

// Static fallback for the service worker. Precached on install, served
// when the network can't be reached on an authenticated navigation.
// Keep it self-contained (no client JS, no Supabase) so it works in
// every offline scenario.

export const metadata: Metadata = {
  title: "Offline · LevelUp Kids",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";
export const revalidate = false;

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background:
          "radial-gradient(120% 60% at 50% -10%, color-mix(in srgb, var(--brand-500) 14%, var(--surface-paper)) 0%, var(--surface-paper) 55%)",
      }}
    >
      <section
        style={{
          maxWidth: 480,
          width: "100%",
          background: "var(--surface-card)",
          borderRadius: 28,
          padding: "2rem",
          boxShadow:
            "0 18px 40px -12px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.04)",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden
          style={{
            margin: "0 auto",
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#6366f1",
            color: "white",
            fontWeight: 800,
            fontSize: 28,
            borderRadius: 16,
          }}
        >
          L
        </div>
        <h1
          style={{
            marginTop: 18,
            marginBottom: 8,
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "2rem",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--ink-primary)",
          }}
        >
          You&apos;re offline.
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--ink-secondary)",
            fontSize: "1.05rem",
            lineHeight: 1.5,
          }}
        >
          The family dashboard needs a connection to load the latest scores
          and approvals. Once you&apos;re back online, refresh to pick up
          where you left off.
        </p>
        {/* Plain anchor — Next/Link doesn't help offline, and a hard nav
            kicks off a fresh request once the network is back. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: 20,
            padding: "0.75rem 1.5rem",
            borderRadius: 9999,
            background: "#6366f1",
            color: "white",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Try again
        </a>
      </section>
    </main>
  );
}
