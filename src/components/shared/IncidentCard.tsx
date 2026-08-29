"use client";

import { Incident } from "@/types/incident";
import { SeverityBadge } from "./SeverityBadge";
import { MapPin, Clock, Users, Activity, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface IncidentCardProps {
  incident: Incident;
  onClick?: (incident: Incident) => void;
  isSelected?: boolean;
  className?: string;
}

export function IncidentCard({ incident, onClick, isSelected, className }: IncidentCardProps) {
  const isRed = incident.zone === "red";

  // Calculate resource capability counts from attached snapshot
  const resources = incident.resources || [];
  const fireCount = resources.filter((r) => r.category === "fire").length;
  const medCount = resources.filter((r) => r.category === "medical").length;
  const utilCount = resources.filter((r) => r.category === "utility" || r.category === "hazard").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick && onClick(incident)}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-all text-left cursor-pointer relative overflow-hidden shadow-sm",
        isRed ? "border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-border hover:border-muted-foreground/30",
        isSelected && "ring-2 ring-primary border-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]",
        className
      )}
    >
      {isRed && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
      )}

      {/* Header: Zone, Category & Confidence */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <SeverityBadge zone={incident.zone} className="shrink-0 text-[10px] uppercase font-bold" />
          <span className={cn("text-xs font-bold uppercase tracking-wider", isRed ? "text-red-400" : "text-muted-foreground")}>
            {incident.category.replace(/_/g, " ")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
            <BrainCircuit className="w-3 h-3" />
            {incident.confidence}% Conf.
          </span>
        </div>
      </div>

      {/* Title & Summary */}
      <div>
        <h3 className={cn("font-bold text-base leading-tight", isRed ? "text-red-50" : "text-foreground")}>
          {incident.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
          {incident.summary}
        </p>
      </div>

      {/* Resource Intelligence Summary Pill Bar */}
      {resources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-muted-foreground">
          {fireCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
              🚒 {fireCount} Fire
            </span>
          )}
          {medCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              🏥 {medCount} Med
            </span>
          )}
          {utilCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              ⚡ {utilCount} Util
            </span>
          )}
          {incident.recommendedTeam && (
            <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-sans truncate max-w-[130px]" title={incident.recommendedTeam}>
              👉 {incident.recommendedTeam}
            </span>
          )}
        </div>
      )}

      {/* Footer Metrics */}
      <div className="mt-auto pt-2 border-t border-border/40 flex flex-wrap items-center gap-y-1.5 justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-medium" title="Impacted Casualties">
            <Users className={cn("w-3.5 h-3.5", isRed ? "text-red-400" : "")} />
            <span className={isRed ? "text-red-100 font-bold" : ""}>{incident.peopleAffected}</span>
          </div>
          <div className="flex items-center gap-1 font-medium text-orange-400" title="Urgency">
            <Activity className="w-3.5 h-3.5" />
            <span className="capitalize">{incident.urgency}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          <div className="flex items-center gap-1 truncate max-w-[120px]" title={incident.location}>
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate">{incident.location}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px]" title="Last Updated">
            <Clock className="w-3 h-3" />
            <span>{incident.lastUpdatedText || "Just now"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
