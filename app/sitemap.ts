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

  // Fetch all shops
  const shops = await db.query.shops.findMany({
    columns: {
      id: true,
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
      url: `${BASE_URL}/deals`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Product pages
  const productPages: MetadataRoute.Sitemap = activeProducts.map((product) => ({
    url: `${BASE_URL}/product/${toSlug(product.name)}/${product.id}`,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Group pages
  const groupPages: MetadataRoute.Sitemap = groups.map((group) => ({
    url: `${BASE_URL}/groups/${group.humanNameId}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Deals by supermarket pages
  const shopDealsPages: MetadataRoute.Sitemap = shops.map((shop) => ({
    url: `${BASE_URL}/deals?shop_id=${shop.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  return [...staticPages, ...shopDealsPages, ...productPages, ...groupPages];
}
