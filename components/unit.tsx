import { Badge } from "./ui/badge";

export function Unit({
  unit,
  className,
}: {
  unit: string;
  className?: string;
}) {
  if (unit === "PAQ") {
    return null;
  }

  return <Badge className={className}>{unit}</Badge>;
}
