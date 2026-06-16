import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tailwind v4 + Turbopack works out of the box; no aliasing needed here.
};

export default nextConfig;
