"use client";

import { Incident } from "@/types/incident";
import { SeverityBadge } from "./SeverityBadge";
import { MapPin, Clock, Users, Activity } from "lucide-react";
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick && onClick(incident)}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border bg-card p-5 transition-shadow text-left cursor-pointer relative overflow-hidden",
        isRed ? "border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-border hover:border-muted-foreground/30",
        isSelected && "ring-2 ring-primary border-primary",
        className
      )}
    >
      {isRed && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SeverityBadge zone={incident.zone} className="shrink-0" />
            <span className={cn("text-xs font-bold uppercase tracking-wider", isRed ? "text-red-400" : "text-muted-foreground")}>
              {incident.category.replace("_", " ")}
            </span>
          </div>
          <h3 className={cn("font-semibold text-lg leading-tight mt-1", isRed ? "text-red-50" : "text-foreground")}>
            {incident.title}
          </h3>
        </div>
      </div>
      
      <p className="text-sm text-foreground/80 line-clamp-2">{incident.summary}</p>
      
      <div className="mt-auto pt-4 flex flex-wrap items-center gap-y-2 justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium" title="People Affected">
            <Users className={cn("w-3.5 h-3.5", isRed ? "text-red-400" : "")} />
            <span className={isRed ? "text-red-100" : ""}>{incident.peopleAffected}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-orange-500" title="Urgency">
            <Activity className="w-3.5 h-3.5" />
            <span className="capitalize">{incident.urgency}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5" title="Location">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate max-w-[100px]">{incident.location}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Last Updated">
            <Clock className="w-3.5 h-3.5" />
            <span>{incident.lastUpdatedText}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
