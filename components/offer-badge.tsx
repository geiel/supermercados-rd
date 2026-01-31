import { Badge } from "@/components/ui/badge";
import { cn, formatDropPercentage } from "@/lib/utils";

type OfferBadgeProps = {
  dropPercentage: string | number | null | undefined;
  className?: string;
};

export function OfferBadge({ dropPercentage, className }: OfferBadgeProps) {
  return (
    <Badge variant="destructive" className={cn("rounded-full", className)}>
      -{formatDropPercentage(dropPercentage)}%
    </Badge>
  );
}
