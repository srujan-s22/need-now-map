"use client";

import { useState } from "react";
import { useIncidents } from "@/hooks/useIncidents";
import { Incident } from "@/types/incident";
import { MapWrapper } from "@/components/shared/MapWrapper";
import { IncidentDetailPanel } from "@/components/shared/IncidentDetailPanel";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, AlertTriangle } from "lucide-react";

export default function LiveMapPage() {
  const { incidentsSource, loadingDb } = useIncidents();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  if (loadingDb) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold">Connecting to Live Geospatial Frame...</h2>
        <p className="text-muted-foreground text-sm mt-1">Establishing global telemetry uplink</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] relative overflow-hidden bg-card/10 rounded-xl border border-border shadow-inner">
      {/* Floating Header */}
      <div className="absolute top-4 left-4 z-[900] bg-background/80 backdrop-blur-md border border-border px-4 py-2 rounded-lg flex items-center gap-3 shadow-lg pointer-events-none">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-500">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-bold text-sm tracking-tight text-foreground uppercase">Global Tracking Array</h2>
          <p className="text-xs text-muted-foreground font-mono font-medium">
            {incidentsSource.length} TARGETS IN QUEUE
          </p>
        </div>
      </div>

      {/* Fullscreen Map Grid */}
      <div className="flex-1 w-full relative z-0">
        <MapWrapper
          incidents={incidentsSource.filter(i => i.status !== 'resolved')}
          selectedIncident={selectedIncident}
          onSelectIncident={setSelectedIncident}
        />
      </div>

      {/* Incident Overlay Drawer */}
      <AnimatePresence>
        {selectedIncident && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-[999]"
              onClick={() => setSelectedIncident(null)}
            />
            <IncidentDetailPanel
              incident={incidentsSource.find(i => i.id === selectedIncident.id) || selectedIncident}
              onClose={() => setSelectedIncident(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
