import { Badge } from "@/components/ui/badge";
import type { FeatureStatus } from "@/lib/features";

/** Small tag for non-live features; live renders nothing. */
export function StatusBadge({
  status,
  className,
}: {
  status: FeatureStatus;
  className?: string;
}) {
  if (status === "live") return null;
  return (
    <Badge
      size="sm"
      variant={status === "new" ? "default" : "secondary"}
      className={className}
    >
      {status === "new" ? "New" : "Soon"}
    </Badge>
  );
}
