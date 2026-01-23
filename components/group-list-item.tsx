import Link from "next/link";
import { ChevronRight } from "lucide-react";

type GroupListItemProps = {
  href: string;
  name: string;
};

export function GroupListItem({ href, name }: GroupListItemProps) {
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
