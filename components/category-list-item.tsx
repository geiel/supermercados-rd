import Link from "next/link";
import { ChevronRight } from "lucide-react";

type CategoryListItemProps = {
  href: string;
  name: string;
};

export function CategoryListItem({ href, name }: CategoryListItemProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex items-center justify-between border-b py-4 text-base font-medium"
    >
      <span>{name}</span>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  );
}
