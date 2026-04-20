import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  text?: string;
  className?: string;
}

export function LoadingState({ text = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 min-h-[200px] text-muted-foreground", className)}>
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
