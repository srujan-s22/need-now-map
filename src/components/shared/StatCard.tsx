import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon, description, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground tracking-tight">{title}</h3>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2">
        <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
