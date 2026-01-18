import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/lists/local/"],
      },
    ],
    sitemap: "https://www.supermercadosrd.com/sitemap.xml",
  };
}
