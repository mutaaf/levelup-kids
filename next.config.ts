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
};

export default nextConfig;
