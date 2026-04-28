import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://3.34.192.109"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
