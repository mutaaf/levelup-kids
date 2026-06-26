import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    // Disable Next 15's client-side router cache for dynamic pages so a
    // Link nav always re-runs the server component instead of returning a
    // stale cached payload. Without this, an auth-state change (sign-in,
    // sign-out, household creation) isn't reflected on already-visited
    // routes — clicking "Back to family" can show the logged-out Landing
    // because the cache was populated while logged out.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },

  // Browsers ask /favicon.ico directly regardless of the <link rel="icon">
  // tag Next generates from src/app/icon.tsx — without a handler the
  // request 404s. Rewrite to the dynamic /icon route (same 32×32 brand
  // mark) so the request resolves to a real image.
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/icon" },
    ];
  },
};

export default nextConfig;
