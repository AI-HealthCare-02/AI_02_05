import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "k.kakaocdn.net" },
      { protocol: "https", hostname: "img1.kakaocdn.net" },
      { protocol: "https", hostname: "t1.kakaocdn.net" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: `${process.env.NEXT_PUBLIC_S3_BUCKET ?? "clinicalcare-prescriptions"}.s3.ap-northeast-2.amazonaws.com` },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
