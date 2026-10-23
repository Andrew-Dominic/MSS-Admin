import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server build (.next/standalone) so the VPS gets only
  // compiled output, never the source or a node_modules install.
  output: "standalone",
  devIndicators: false,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Dataset uploads go one source file at a time; the largest (central,
      // ~2.8 MB) fits, and Vercel caps request bodies at 4.5 MB anyway.
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  async redirects() {
    return [{ source: "/admin", destination: "/", permanent: true }];
  },
};

export default nextConfig;
