import { ProductExtractor } from "@/components/product-extractor";
import { TypographyH3 } from "@/components/typography-h3";
import { db } from "@/db";
import { validateAdminUser } from "@/lib/authentication";
import Link from "next/link";
import { Suspense } from "react";

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
    <div className="container mx-auto flex flex-1 flex-col gap-6 pb-4 pt-4">
      <div className="flex flex-1 flex-col gap-3">
        <TypographyH3>Panel de administración</TypographyH3>
        <p className="text-sm text-muted-foreground">
          Accede rápidamente a todas las herramientas de administración.
        </p>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <AdminNavLink href="/admin/groups" label="Administrar grupos" />
          <AdminNavLink
            href="/admin/categories"
            label="Categorías de grupos"
          />
          <AdminNavLink
            href="/admin/group-products"
            label="Asignar productos a grupos"
          />
          <AdminNavLink
            href="/admin/best-value-products"
            label="Mejores productos por valor"
          />
          <AdminNavLink
            href="/admin/merge-products"
            label="Unir productos duplicados"
          />
          <AdminNavLink
            href="/admin/merge-products/v2"
            label="Unir productos duplicados (v2)"
          />
          <AdminNavLink
            href="/admin/merge-products/by-brand"
            label="Unir productos por marca"
          />
          <AdminNavLink
            href="/admin/unverified-products"
            label="Aprobar productos no verificados"
          />
          <AdminNavLink
            href="/admin/possible-brands"
            label="Posibles marcas"
          />
          <AdminNavLink
            href="/admin/refresh-phrases"
            label="Actualizar frases de búsqueda"
          />
          <AdminNavLink href="/admin/set-brand" label="Asignar marca" />
          <AdminNavLink
            href="/admin/delete-product"
            label="Eliminar producto"
          />
          <AdminNavLink
            href="/admin/update-nacional-products"
            label="Actualizar productos Nacional"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <TypographyH3>Extractor de productos</TypographyH3>
        <ProductExtractor shops={shops} categories={categories} />
      </div>
    </div>
  );
}

function AdminNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{href}</span>
    </Link>
  );
}

function AdminFallback() {
  return (
    <div className="container mx-auto pt-2">
      <div className="text-sm text-muted-foreground">Cargando...</div>
    </div>
  );
}
