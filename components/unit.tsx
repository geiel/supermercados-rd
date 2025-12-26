import { Badge } from "./ui/badge";

export function Unit({
  unit,
  className,
  variant = "default"
}: {
  unit: string;
  className?: string;
  variant?: "default" | "small"
}) {
  if (unit === "PAQ") {
    return null;
  }

  if (variant === "small") {
    return (
      <Badge className={className}>
        <small>{unit}</small>
      </Badge>
    )
  }

  return <Badge className={className}>{unit}</Badge>;
}
