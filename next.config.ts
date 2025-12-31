import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 2678400,
    remotePatterns: [
      new URL(
        "https://assets-sirenago.s3-us-west-1.amazonaws.com/product/original/**"
      ),
      new URL(
        "https://assets-sirenago.s3-us-west-1.amazonaws.com/product/large/**"
      ),
      new URL("https://jumbo.com.do/pub/media/catalog/**"),
      new URL("https://supermercadosnacional.com/media/catalog/**"),
      new URL("https://img.plazalama.com.do/**"),
      new URL("https://d31f1ehqijlcua.cloudfront.net/**"),
      new URL("https://ixfslclarqzcptjjuodm.supabase.co/storage/**"),
      {
        hostname: "bravova-resources.superbravo.com.do",
      },
    ],
  },
  cacheComponents: true
};

export default nextConfig;
