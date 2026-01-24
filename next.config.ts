import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    product: {
      stale: 86400, // 24 hours - serve stale while revalidating
      revalidate: 86400, // 24 hours - background revalidation
      expire: 604800, // 7 days - hard expiration
    },
  },
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
};

export default nextConfig;
