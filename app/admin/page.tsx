import Link from "next/link";
import { Suspense } from "react";

import { ProductExtractor } from "@/components/product-extractor";
import { db } from "@/db";
import { validateAdminUser } from "@/lib/authentication";

export default function Page() {
  return (
    <Suspense fallback={<AdminFallback />}>
      <AdminPage />
    </Suspense>
  );
}

async function AdminPage() {
  await validateAdminUser();

  const shops = await db.query.shops.findMany();
  const categories = await db.query.productsCategories.findMany();

  return (
    <div className="container mx-auto flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel de administracion</h1>
        <p className="text-sm text-muted-foreground">
          Accesos rapidos a las herramientas de administracion.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
          >
            <div className="text-base font-semibold">{link.title}</div>
            <p className="text-sm text-muted-foreground">{link.description}</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Extractor de productos</h2>
        <p className="text-sm text-muted-foreground">
          Usa el extractor si necesitas registrar productos rapidamente.
        </p>
        <div className="mt-4">
          <ProductExtractor shops={shops} categories={categories} />
        </div>
      </div>
    </div>
  );
}

const adminLinks = [
  {
    href: "/admin/categories",
    title: "Categorias y subcategorias",
    description: "Crea, edita y asigna grupos a subcategorias.",
  },
  {
    href: "/admin/group-products",
    title: "Grupos de productos",
    description: "Asigna productos a grupos y revisa agrupaciones.",
  },
  {
    href: "/admin/merge-products",
    title: "Combinar productos",
    description: "Unifica productos duplicados en una sola ficha.",
  },
  {
    href: "/admin/merge-products/by-brand",
    title: "Combinar por marca",
    description: "Revisa duplicados sugeridos por marca.",
  },
  {
    href: "/admin/merge-products/v2",
    title: "Combinar productos V2",
    description: "Flujo alternativo de combinacion por lotes.",
  },
  {
    href: "/admin/best-value-products",
    title: "Best value",
    description: "Configura productos con mejor valor.",
  },
  {
    href: "/admin/possible-brands",
    title: "Marcas posibles",
    description: "Gestiona marcas sugeridas para productos.",
  },
  {
    href: "/admin/set-brand",
    title: "Asignar marca",
    description: "Asignacion rapida de marcas por categoria.",
  },
  {
    href: "/admin/delete-product",
    title: "Eliminar producto",
    description: "Marca productos como eliminados.",
  },
  {
    href: "/admin/refresh-phrases",
    title: "Refrescar frases",
    description: "Actualiza frases de busqueda.",
  },
  {
    href: "/admin/update-nacional-products",
    title: "Actualizar Nacional",
    description: "Refresca productos importados de Nacional.",
  },
];

function AdminFallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}
