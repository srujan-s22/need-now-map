"use client";

import { Incident } from "@/types/incident";
import { X, MapPin, Users, Activity, Target, ShieldAlert, CheckCircle, Clock, BrainCircuit, Loader2, ArrowRight } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { toast } from "./Toaster";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";

interface IncidentDetailPanelProps {
  incident: Incident | null;
  onClose: () => void;
  isReadOnly?: boolean;
}

export function IncidentDetailPanel({ incident, onClose, isReadOnly = false }: IncidentDetailPanelProps) {
  const [updating, setUpdating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  if (!incident) return null;

  const handleUpdateIncident = async (updates: Partial<Incident>) => {
    setUpdating(true);
    try {
      await fetch(`/api/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-authority": typeof window !== "undefined" && sessionStorage.getItem("authority_unlocked") === "true" ? "unlocked" : "locked"
        },
        body: JSON.stringify(updates)
      });
      if (updates.status === "resolved") onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0.5 }}
      transition={{ type: "spring", damping: 25, stiffness: 220 }}
      className="absolute inset-y-0 right-0 w-full sm:w-[450px] border-l border-border bg-card shadow-2xl flex flex-col z-[1000]"
    >
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
        <h2 className="font-semibold tracking-tight text-lg flex items-center gap-2">
          {isReadOnly ? (
            <><Activity className="w-5 h-5 text-muted-foreground" /> Incident Details</>
          ) : (
            <><Activity className="w-5 h-5 text-primary" /> Incident Command</>
          )}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-0 flex flex-col">
        {/* Header Block */}
        <div className="p-6 pb-4 border-b border-border bg-gradient-to-b from-muted/30 to-card">
          <div className="flex items-center gap-2 mb-3">
            <SeverityBadge zone={incident.zone} />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {incident.category.replace('_', ' ')}
            </span>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase">
              {incident.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight mb-2">{incident.title}</h1>
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="block font-medium">{incident.location}</span>
          </div>
        </div>

        {/* AI Analysis Block */}
        <div className="p-6 border-b border-border space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
            <BrainCircuit className="w-4 h-4" /> AI Analysis Matrix
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 p-3 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><ShieldAlert className="w-3.5 h-3.5" /> Severity Score</span>
              <span className="font-semibold text-xl">{incident.severityScore}<span className="text-sm text-muted-foreground">/100</span></span>
            </div>
            <div className="bg-secondary/40 p-3 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><CheckCircle className="w-3.5 h-3.5" /> System Confidence</span>
              <span className="font-semibold text-xl">{incident.confidence}%</span>
            </div>
          </div>

          {incident.reasoning && (
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-lg relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-primary/40" />
              <p className="text-sm text-foreground/90 italic leading-relaxed">
                "{incident.reasoning}"
              </p>
            </div>
          )}
        </div>

        {/* Action Plan Block */}
        <div className="p-6 space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Target className="w-4 h-4" /> Recommended Action Plan
          </h3>

          <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-lg">
            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Immediate Directive</h4>
            <p className="text-sm text-indigo-100 font-medium flex items-start gap-2">
              <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" />
              {incident.bestNextAction}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deploy Team</h4>
              <div className="text-sm font-medium p-2 bg-secondary/50 rounded-md border border-border/50 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                {incident.recommendedTeam || incident.responseTeam || "Unassigned"}
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Affected</h4>
              <div className="text-sm font-medium p-2 bg-secondary/50 rounded-md border border-border/50 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                {incident.peopleAffected}
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch History Block */}
        {incident.assignmentHistory && incident.assignmentHistory.length > 0 && (
          <div className="p-6 border-t border-border space-y-4 bg-muted/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Assigned Teams
            </h3>
            <div className="space-y-3">
              {incident.assignmentHistory.map((assignment, idx) => {
                const isActive = idx === incident.assignmentHistory!.length - 1 && incident.status !== 'resolved';
                return (
                  <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-1.5 ${isActive ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/50 opacity-80'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{assignment.team}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${assignment.source === 'ai' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-muted text-muted-foreground'}`}>
                        {assignment.source === 'ai' ? 'AI Sourced' : 'Manual'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(assignment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isActive && (
                        <span className="ml-auto text-emerald-500 font-semibold tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Operational Actions */}
      {!isReadOnly && (
        <div className="p-4 border-t border-border bg-card shrink-0 flex flex-col gap-2">
          {updating && (
            <div className="flex items-center justify-center py-2 text-primary gap-2 text-sm font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" /> Committing to Global State...
            </div>
          )}

          {isAssigning && incident.status !== "resolved" ? (
            <div className="flex flex-col gap-2 p-3 bg-secondary/30 border border-border rounded-lg mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full"
              >
                <option value="">Select a team...</option>
                {incident.recommendedTeam && <option value={incident.recommendedTeam}>{incident.recommendedTeam} (AI Recommended)</option>}
                <option value="General Response Unit">General Response Unit</option>
                <option value="Fire Brigade">Fire Brigade</option>
                <option value="Medical Response Unit">Medical Response Unit</option>
                <option value="Rescue Team">Rescue Team</option>
                <option value="Utility Repair Team">Utility Repair Team</option>
              </select>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setIsAssigning(false)}
                  className="flex-1 bg-secondary text-secondary-foreground text-sm font-medium py-2 rounded-md hover:bg-secondary/80 transition-colors"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedTeam) return;

                    const isAiRecommended = selectedTeam === incident.recommendedTeam;
                    const source = isAiRecommended ? "ai" : "manual";

                    const historyEntry = {
                      team: selectedTeam,
                      source: source as "ai" | "manual",
                      timestamp: new Date().toISOString()
                    };

                    const updatedHistory = [...(incident.assignmentHistory || []), historyEntry];

                    handleUpdateIncident({
                      status: "assigned",
                      responseTeam: selectedTeam,
                      assignmentHistory: updatedHistory
                    });

                    toast.success(isAiRecommended
                      ? `AI assigned ${selectedTeam} to this incident.`
                      : `Manually assigned ${selectedTeam} to this incident.`
                    );
                    setIsAssigning(false);
                  }}
                  disabled={updating || !selectedTeam}
                  className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Confirm Dispatch
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setSelectedTeam(incident.recommendedTeam || "General Response Unit");
                setIsAssigning(true);
              }}
              disabled={updating || incident.status === "resolved"}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:shadow-none"
            >
              {incident.status === "assigned" ? "Re-Assign Response Team" : "Assign Response Team"}
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleUpdateIncident({ status: "reviewed" })}
              disabled={updating || incident.status === "reviewed" || incident.status === "resolved"}
              className="flex-1 bg-secondary text-secondary-foreground font-medium py-2.5 rounded-lg hover:bg-secondary/80 transition-colors shadow-sm disabled:opacity-50 disabled:shadow-none"
            >
              {incident.status === "reviewed" ? "Acknowledged" : "Acknowledge"}
            </button>
            <button
              onClick={() => {
                handleUpdateIncident({ status: "resolved" });
                toast.success("Incident resolved and removed from active queue.");
              }}
              disabled={updating || incident.status === "resolved"}
              className="flex-1 border border-emerald-500/50 text-emerald-500 bg-emerald-500/10 font-semibold py-2.5 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              Resolve
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
