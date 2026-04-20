"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Skip SSR to bypass 'window is not defined' internal exceptions in Leaflet
const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-card/50 border border-border rounded-xl">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Initializing Geospatial Network...</span>
      </div>
    </div>
  )
});

export function MapWrapper(props: any) {
  return <LiveMap {...props} />;
}
