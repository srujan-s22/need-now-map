import { SearchX } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({ 
  title = "No active incidents", 
  description = "There are no operational telemetry points matching your current filter schema." 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-card/10 border border-dashed border-border rounded-xl animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4 text-muted-foreground">
        <SearchX className="w-8 h-8 opacity-50" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[250px] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
