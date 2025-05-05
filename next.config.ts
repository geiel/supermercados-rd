import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL(
        "https://assets-sirenago.s3-us-west-1.amazonaws.com/product/original/**"
      ),
      new URL("https://jumbo.com.do/pub/media/catalog/**"),
      new URL("https://supermercadosnacional.com/media/catalog/**"),
      new URL("https://img.plazalama.com.do/**"),
    ],
  },
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
