// next.config.js or next.config.mjs or next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.dashhub.cc",   // 👈 ADD THIS
      },
    ],
  },
};

export default nextConfig;
