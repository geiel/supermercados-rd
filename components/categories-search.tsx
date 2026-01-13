"use client";

import { useState } from "react";
import { CategoryBadge } from "./category-badge";
import { TypographyH3 } from "./typography-h3";
import { Button } from "./ui/button";

type GroupResult = { name: string; humanId: string; groupId: number };

export function CategorySearch({ groupResults }: { groupResults: Array<GroupResult> }) {
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
            <CategoryBadge
              key={group.humanId}
              groupId={group.groupId}
              groupName={group.name}
              groupHumanNameId={group.humanId}
            />
          ))}
        </div>
        <div className="space-y-2 py-3 md:hidden flex flex-col">
          {mobileGroups.map((group) => (
            <CategoryBadge
              key={group.humanId}
              groupId={group.groupId}
              groupName={group.name}
              groupHumanNameId={group.humanId}
            />
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
