import { MetadataRoute } from "next";
import { db } from "@/db";
import { toSlug } from "@/lib/utils";

const BASE_URL = "https://supermercadosrd.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all products with prices (only products that are available)
  const products = await db.query.products.findMany({
    columns: {
      id: true,
      name: true,
    },
    where: (products, { gt, isNotNull, or }) =>
      or(gt(products.rank, "3"), isNotNull(products.relevance)),
    with: {
      shopCurrentPrices: {
        columns: { productId: true },
        where: (scp, { isNull, eq, or }) =>
          or(isNull(scp.hidden), eq(scp.hidden, false)),
        limit: 1,
      },
    },
  });

  // Filter products that have at least one active price
  const activeProducts = products.filter(
    (p) => p.shopCurrentPrices.length > 0
  );

  // Fetch all groups
  const groups = await db.query.groups.findMany({
    columns: {
      humanNameId: true,
    },
  });

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/ofertas`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Product pages
  const productPages: MetadataRoute.Sitemap = activeProducts.map((product) => ({
    url: `${BASE_URL}/productos/${toSlug(product.name)}/${product.id}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Group pages
  const groupPages: MetadataRoute.Sitemap = groups.map((group) => ({
    url: `${BASE_URL}/grupos/${group.humanNameId}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...groupPages, ...productPages];
}
