import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL(
        "https://assets-sirenago.s3-us-west-1.amazonaws.com/product/original/**"
      ),
    ],
  },
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
