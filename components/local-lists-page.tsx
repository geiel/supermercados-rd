"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useListItems } from "@/hooks/use-list-items";

export function LocalListsPage() {
  const { products, groups } = useListItems({});

  const totalCount = products.length + groups.length;
  const summary = totalCount === 0 ? "Lista vacía" : `${totalCount} artículos`;

  return (
    <div className="container mx-auto max-w-4xl px-2 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-2xl font-bold">Listas</div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link href="/lists/local" className="block">
          <Card className="transition hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Lista de compras</CardTitle>
              <CardDescription>{summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {products.length} productos · {groups.length} categorías
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
