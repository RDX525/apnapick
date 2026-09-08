import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/storage/v1/**",
      },
    ],
    qualities: [75, 80, 85],
    minimumCacheTTL: 60 * 60 * 24,
  },
  experimental: {
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
