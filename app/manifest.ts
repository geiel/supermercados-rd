import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SupermercadosRD - Comparador de precios",
    short_name: "SupermercadosRD",
    description:
      "Compara precios de supermercados en República Dominicana. Encuentra las mejores ofertas.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4A2169",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
