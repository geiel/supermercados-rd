"use client";

import { useState } from "react";
import Link from "next/link";
import { TypographyH3 } from "./typography-h3";
import { Button } from "./ui/button";

export function CategorySearch({ groupResults }: { groupResults: Array<{ name: string, humanId: string }>}) {
    const [showAllMobile, setShowAllMobile] = useState(false);
    const mobileGroups = showAllMobile ? groupResults : groupResults.slice(0, 4);

    return (
        <div className="px-2 md:px-0">
        <div className="flex items-baseline gap-2">
          <TypographyH3>Categorías</TypographyH3>
          <span className="text-sm text-muted-foreground">
            ({groupResults.length})
          </span>
        </div>

        <div className="flex flex-wrap gap-3 py-3 max-md:hidden">
          {groupResults.map((group) => (
            <Link
              key={group.humanId}
              href={`/groups/${group.humanId}`}
              className="group inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:shadow"
            >
              <span className="whitespace-nowrap">{group.name}</span>
            </Link>
          ))}
        </div>
        <div className="space-y-3 py-3 md:hidden">
          {mobileGroups.map((group) => (
            <Link
              key={group.humanId}
              href={`/groups/${group.humanId}`}
              className="flex w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900"
            >
              <span className="whitespace-nowrap">{group.name}</span>
            </Link>
          ))}
          {!showAllMobile && groupResults.length > 4 ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setShowAllMobile(true)}
            >
              Mostrar más ({groupResults.length - 4})
            </Button>
          ) : null}
        </div>
      </div>
    )
}
