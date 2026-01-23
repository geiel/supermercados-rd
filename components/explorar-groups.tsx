import { PackageSearch } from "lucide-react";

import { GroupCard } from "@/components/group-card";
import { GroupListItem } from "@/components/group-list-item";
import { TypographyH3 } from "@/components/typography-h3";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSubCategoryGroups } from "@/lib/subcategory-groups";

type ExplorarGroupsProps = {
  subCategoryId: number;
};

export async function ExplorarGroups({ subCategoryId }: ExplorarGroupsProps) {
  const result = await getSubCategoryGroups({ subCategoryId });

  if (!result || result.groups.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageSearch />
          </EmptyMedia>
          <EmptyTitle>No hay grupos</EmptyTitle>
          <EmptyDescription>
            No encontramos grupos para esta subcategoría en este momento.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2 px-2 md:px-0">
        <TypographyH3>{result.subCategory.name}</TypographyH3>
        <span className="text-sm text-muted-foreground">({result.total})</span>
      </div>
      <div className="md:hidden px-2 md:px-0">
        {result.groups.map((group) => (
          <GroupListItem
            key={group.id}
            href={`/groups/${group.humanId}`}
            name={group.name}
          />
        ))}
      </div>
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0">
        {result.groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}
