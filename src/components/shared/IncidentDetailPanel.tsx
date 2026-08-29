"use client";

import { Incident } from "@/types/incident";
import {
  X,
  MapPin,
  Users,
  Activity,
  Target,
  ShieldAlert,
  CheckCircle,
  Clock,
  BrainCircuit,
  Loader2,
  ArrowRight,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  History,
} from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { toast } from "./Toaster";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RankedOperationalResource } from "@/types/investigation";

interface IncidentDetailPanelProps {
  incident: Incident | null;
  onClose: () => void;
  isReadOnly?: boolean;
}

export function IncidentDetailPanel({
  incident,
  onClose,
  isReadOnly = false,
}: IncidentDetailPanelProps) {
  const [updating, setUpdating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [showConfidenceDrawer, setShowConfidenceDrawer] = useState(false);
  const [activeCapabilityTab, setActiveCapabilityTab] = useState<string>("all");

  if (!incident) return null;

  const handleUpdateIncident = async (updates: Partial<Incident>) => {
    setUpdating(true);
    try {
      await fetch(`/api/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (updates.status === "resolved") onClose();
    } catch (err) {
      console.error("Failed to update incident:", err);
      toast.error("Failed to update incident state.");
    } finally {
      setUpdating(false);
    }
  };

  const resources: RankedOperationalResource[] = incident.resources || [];
  const primaryRecommendations = resources.filter((r) => r.isPrimaryRecommendation);

  // Filter resources by capability tab
  const filteredResources = activeCapabilityTab === "all"
    ? resources
    : resources.filter((r) => r.category === activeCapabilityTab || r.primaryCapability === activeCapabilityTab);

  // Available categories in attached resources
  const availableCategories = Array.from(new Set(resources.map((r) => r.category)));

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0.5 }}
      transition={{ type: "spring", damping: 25, stiffness: 220 }}
      className="absolute inset-y-0 right-0 w-full sm:w-[500px] border-l border-border bg-card shadow-2xl flex flex-col z-[1000] overflow-hidden"
    >
      {/* Top Console Bar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
          <h2 className="font-bold tracking-tight text-base text-foreground">
            {isReadOnly ? "Incident Telemetry" : "Incident Command Console"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Scrollable Command Surface */}
      <div className="flex-1 overflow-y-auto p-0 flex flex-col space-y-4">
        {/* BLOCK 1: Incident Situation & Telemetry */}
        <div className="p-5 pb-4 border-b border-border bg-gradient-to-b from-muted/20 to-card space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge zone={incident.zone} className="text-xs uppercase font-bold" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {incident.category.replace(/_/g, " ")}
            </span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase ml-auto">
              {incident.status}
            </span>
          </div>

          <h1 className="text-xl font-bold leading-tight text-foreground">{incident.title}</h1>

          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span className="font-medium text-foreground">{incident.location}</span>
            {incident.lat && incident.lng && (
              <span className="font-mono text-[10px] text-muted-foreground ml-auto">
                ({incident.lat.toFixed(4)}, {incident.lng.toFixed(4)})
              </span>
            )}
          </div>

          <p className="text-xs text-foreground/90 leading-relaxed pt-1">{incident.description}</p>
        </div>

        {/* BLOCK 2: AI Assessment & Epistemic Matrix */}
        <div className="px-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-primary" /> AI Assessment & Evidence Matrix
            </h3>
            {incident.confidenceBreakdown && (
              <button
                type="button"
                onClick={() => setShowConfidenceDrawer(!showConfidenceDrawer)}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Why this score? {showConfidenceDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-secondary/40 p-3 rounded-lg border border-border/50">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-1 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 text-orange-400" /> Crisis Severity
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-xl font-mono">{incident.severityScore}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>

            <div className="bg-secondary/40 p-3 rounded-lg border border-border/50">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-1 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> AI Confidence
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-xl font-mono text-primary">{incident.confidence}%</span>
              </div>
            </div>
          </div>

          {/* Expandable Confidence Factors Drawer */}
          <AnimatePresence>
            {showConfidenceDrawer && incident.confidenceBreakdown && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-secondary/30 p-3 rounded-lg border border-border space-y-2 text-xs"
              >
                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px] pb-2 border-b border-border/50">
                  <div>
                    <span className="text-muted-foreground block text-[9px]">Class.</span>
                    <span className="font-bold">{incident.confidenceBreakdown.classification}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px]">Sever.</span>
                    <span className="font-bold">{incident.confidenceBreakdown.severity}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px]">Evid.</span>
                    <span className="font-bold">{incident.confidenceBreakdown.evidence}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px]">Loc.</span>
                    <span className="font-bold">{incident.confidenceBreakdown.location}%</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  {incident.confidenceBreakdown.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                      <span className={factor.impact === "positive" ? "text-emerald-400" : factor.impact === "negative" ? "text-amber-400" : "text-muted-foreground"}>
                        {factor.impact === "positive" ? "✓" : factor.impact === "negative" ? "−" : "•"}
                      </span>
                      <div>
                        <span className="font-semibold text-foreground">{factor.label}</span>:{" "}
                        <span className="text-muted-foreground">{factor.explanation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Structured Reasoning Quotation */}
          {incident.reasoning && (
            <div className="bg-primary/5 border border-primary/15 p-3 rounded-lg text-xs leading-relaxed text-foreground/90 relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-primary/50" />
              <p className="italic">&quot;{incident.reasoning}&quot;</p>
            </div>
          )}
        </div>

        {/* BLOCK 3: Response Intelligence & Ranked Operational Resources */}
        <div className="px-5 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" /> Response Intelligence ({resources.length} Mapped)
            </h3>
            {resources.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">
                OSM Snapshot: {resources[0].retrievedAt ? new Date(resources[0].retrievedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Live"}
              </span>
            )}
          </div>

          {/* Capability Filter Tabs */}
          {availableCategories.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveCapabilityTab("all")}
                className={`px-2 py-0.5 rounded-md border cursor-pointer font-semibold ${
                  activeCapabilityTab === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border"
                }`}
              >
                All ({resources.length})
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCapabilityTab(cat)}
                  className={`px-2 py-0.5 rounded-md border cursor-pointer font-semibold capitalize ${
                    activeCapabilityTab === cat ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border"
                  }`}
                >
                  {cat} ({resources.filter((r) => r.category === cat).length})
                </button>
              ))}
            </div>
          )}

          {/* Ranked Resource Cards */}
          {filteredResources.length > 0 ? (
            <div className="space-y-2.5">
              {filteredResources.map((res) => {
                const isTop = res.isPrimaryRecommendation;
                return (
                  <div
                    key={res.id}
                    className={`p-3 rounded-lg border flex flex-col gap-2 transition-all ${
                      isTop
                        ? "bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/20"
                        : "bg-secondary/20 border-border/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isTop && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                              ★ Recommended
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {res.primaryCapability.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground mt-1">{res.name}</h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-primary block">{res.distanceKm} km</span>
                        <span className="text-[9px] text-muted-foreground">Score: {res.relevanceScore}/100</span>
                      </div>
                    </div>

                    {/* Recommendation Reasons */}
                    {res.recommendationReason && res.recommendationReason.length > 0 && (
                      <div className="space-y-0.5 text-[11px] text-muted-foreground bg-card/40 p-2 rounded border border-border/40">
                        {res.recommendationReason.map((reason, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-1">
                            <span className="text-primary text-[10px]">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Direct Dispatcher Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30 text-xs">
                      {res.contact.phone ? (
                        <a
                          href={`tel:${res.contact.phone}`}
                          className="inline-flex items-center gap-1.5 text-emerald-400 font-bold hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call {res.contact.phone}
                        </a>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Contact unmapped in dataset</span>
                      )}

                      {res.contact.website && (
                        <a
                          href={res.contact.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline ml-auto"
                        >
                          <ExternalLink className="w-3 h-3" /> Portal
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-secondary/20 border border-border text-center text-xs text-muted-foreground">
              No matching resources returned by queried OpenStreetMap tags.
            </div>
          )}
        </div>

        {/* BLOCK 4: Operational Action Plan & Directives */}
        <div className="px-5 space-y-3 border-t border-border pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Target className="w-4 h-4 text-indigo-400" /> Immediate Tactical Directive
          </h3>

          <div className="bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg text-xs">
            <p className="text-indigo-100 font-medium flex items-start gap-2 leading-relaxed">
              <ArrowRight className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              {incident.bestNextAction}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-secondary/40 rounded-lg border border-border/50">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Assigned Unit</span>
              <span className="font-bold text-foreground mt-0.5 block truncate">
                {incident.responseTeam || incident.recommendedTeam || "Unassigned"}
              </span>
            </div>
            <div className="p-2.5 bg-secondary/40 rounded-lg border border-border/50">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Casualties / Impact</span>
              <span className="font-bold text-foreground mt-0.5 block">{incident.peopleAffected}</span>
            </div>
          </div>
        </div>

        {/* BLOCK 5: Operational Timeline & Dispatch History */}
        {incident.assignmentHistory && incident.assignmentHistory.length > 0 && (
          <div className="px-5 border-t border-border pt-4 pb-4 space-y-2 bg-muted/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="w-4 h-4" /> Operational Timeline
            </h3>
            <div className="space-y-2 text-xs">
              {incident.assignmentHistory.map((assignment, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-card border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      assignment.source === "ai" ? "bg-indigo-500/20 text-indigo-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {assignment.source === "ai" ? "AI Assigned" : "Manual Dispatch"}
                    </span>
                    <span className="font-semibold text-foreground">{assignment.team}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(assignment.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BLOCK 6: Human Command Actions */}
      {!isReadOnly && (
        <div className="p-4 border-t border-border bg-card shrink-0 flex flex-col gap-2 shadow-lg">
          {updating && (
            <div className="flex items-center justify-center py-1.5 text-primary gap-2 text-xs font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" /> Committing to Global State...
            </div>
          )}

          {isAssigning && incident.status !== "resolved" ? (
            <div className="flex flex-col gap-2 p-3 bg-secondary/40 border border-border rounded-lg mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Select Response Unit
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full text-foreground"
              >
                <option value="">Select a response unit...</option>
                {incident.recommendedTeam && (
                  <option value={incident.recommendedTeam}>{incident.recommendedTeam} (AI Recommended)</option>
                )}
                {primaryRecommendations.map((rec) => (
                  <option key={rec.id} value={`${rec.name} (${rec.distanceKm} km)`}>
                    {rec.name} — {rec.distanceKm} km ({rec.primaryCapability})
                  </option>
                ))}
                <option value="Fire Brigade Task Force">Fire Brigade Task Force</option>
                <option value="Advanced Trauma Medical Unit">Advanced Trauma Medical Unit</option>
                <option value="Urban Search & Rescue Team">Urban Search & Rescue Team</option>
                <option value="Municipal Water Works Repair Crew">Municipal Water Works Repair Crew</option>
                <option value="Public Works Heavy Equipment Team">Public Works Heavy Equipment Team</option>
              </select>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setIsAssigning(false)}
                  className="flex-1 bg-secondary text-secondary-foreground text-xs font-medium py-2 rounded-md hover:bg-secondary/80 transition-colors cursor-pointer"
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
                      timestamp: new Date().toISOString(),
                    };

                    const updatedHistory = [...(incident.assignmentHistory || []), historyEntry];

                    handleUpdateIncident({
                      status: "assigned",
                      responseTeam: selectedTeam,
                      assignmentHistory: updatedHistory,
                    });

                    toast.success(
                      isAiRecommended
                        ? `AI assigned ${selectedTeam} to this incident.`
                        : `Manually assigned ${selectedTeam} to this incident.`
                    );
                    setIsAssigning(false);
                  }}
                  disabled={updating || !selectedTeam}
                  className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Confirm Dispatch
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setSelectedTeam(incident.recommendedTeam || "Fire Brigade Task Force");
                setIsAssigning(true);
              }}
              disabled={updating || incident.status === "resolved"}
              className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 text-xs cursor-pointer"
            >
              {incident.status === "assigned" ? "Re-Assign Response Team" : "Assign Response Team"}
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleUpdateIncident({ status: "reviewed" })}
              disabled={updating || incident.status === "reviewed" || incident.status === "resolved"}
              className="flex-1 bg-secondary text-secondary-foreground font-medium py-2 rounded-lg hover:bg-secondary/80 transition-colors shadow-sm disabled:opacity-50 text-xs cursor-pointer"
            >
              {incident.status === "reviewed" ? "Acknowledged" : "Acknowledge"}
            </button>
            <button
              onClick={() => {
                handleUpdateIncident({ status: "resolved", resolvedAt: new Date().toISOString() });
                toast.success("Incident resolved and archived.");
              }}
              disabled={updating || incident.status === "resolved"}
              className="flex-1 border border-emerald-500/50 text-emerald-500 bg-emerald-500/10 font-semibold py-2 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 text-xs cursor-pointer"
            >
              Resolve
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
