import { SeverityZone } from "@/types/incident";
import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  zone: SeverityZone;
  className?: string;
}

export function SeverityBadge({ zone, className }: SeverityBadgeProps) {
  const variants = {
    red: "bg-destructive/20 text-destructive-foreground border-destructive/50",
    amber: "bg-warning/20 text-warning-foreground border-warning/50",
    green: "bg-success/20 text-success-foreground border-success/50",
  };

  const labels = {
    red: "Critical",
    amber: "Caution",
    green: "Stable",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        variants[zone],
        className
      )}
    >
      {labels[zone]}
    </span>
  );
}
