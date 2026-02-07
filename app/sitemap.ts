import { MetadataRoute } from "next";
import { db } from "@/db";
import { toSlug } from "@/lib/utils";

const BASE_URL = "https://supermercadosrd.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, groups, categories] = await Promise.all([
    // Fetch all products with prices (only products that are available)
    db.query.products.findMany({
      columns: {
        id: true,
        name: true,
      },
      where: (products, { gt, isNotNull, or }) =>
        or(gt(products.rank, "3"), isNotNull(products.relevance)),
      with: {
        shopCurrentPrices: {
          columns: { productId: true, updateAt: true },
          where: (scp, { isNull, eq, or }) =>
            or(isNull(scp.hidden), eq(scp.hidden, false)),
          orderBy: (scp, { desc }) => desc(scp.updateAt),
          limit: 1,
        },
      },
    }),
    // Fetch all groups
    db.query.groups.findMany({
      columns: {
        humanNameId: true,
      },
    }),
    // Fetch all public group categories (/categorias/[slug])
    db.query.categories.findMany({
      columns: {
        humanNameId: true,
      },
    }),
  ]);

  console.log(`Sitemap: Found ${products.length} products.`);

  // Filter products that have at least one active price
  const activeProducts = products.filter(
    (p) => p.shopCurrentPrices.length > 0
  );

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
    {
      url: `${BASE_URL}/categorias`,
      changeFrequency: "yearly",
      priority: 0.9,
    },
  ];

  // Product pages
  const productPages: MetadataRoute.Sitemap = activeProducts.map((product) => {
    const lastModified = product.shopCurrentPrices[0]?.updateAt;

    return {
      url: `${BASE_URL}/productos/${toSlug(product.name)}/${product.id}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "daily" as const,
      priority: 0.7,
    };
  });

  // Group pages
  const groupPages: MetadataRoute.Sitemap = groups.map((group) => ({
    url: `${BASE_URL}/grupos/${group.humanNameId}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Group category pages (/categorias/[slug])
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${BASE_URL}/categorias/${category.humanNameId}`,
    changeFrequency: "yearly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...groupPages, ...categoryPages, ...productPages];
}
