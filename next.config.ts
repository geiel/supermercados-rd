import { withSentryConfig } from "@sentry/nextjs";
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
      new URL("https://t7bjp1cpifoghpav.public.blob.vercel-storage.com/**"),
      {
        hostname: "bravova-resources.superbravo.com.do",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/deals",
        destination: "/ofertas",
        permanent: true,
      },
      {
        source: "/explore",
        destination: "/explorar",
        permanent: true,
      },
      {
        source: "/explore/:value",
        destination: "/explorar/:value",
        permanent: true,
      },
      {
        source: "/shared/:slug",
        destination: "/compartido/:slug",
        permanent: true,
      },
      {
        source: "/groups/:group_human_id",
        destination: "/grupos/:group_human_id",
        permanent: true,
      },
      {
        source: "/product/:path*",
        destination: "/productos/:path*",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "supermercadosrd",

  project: "supermercadosrd-app",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
