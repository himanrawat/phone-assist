import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@phone-assistant/contracts"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
