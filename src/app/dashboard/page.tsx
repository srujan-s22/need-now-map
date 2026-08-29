"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useIncidents } from "@/hooks/useIncidents";
import { Incident } from "@/types/incident";
import { StatCard } from "@/components/shared/StatCard";
import { IncidentCard } from "@/components/shared/IncidentCard";
import { IncidentDetailPanel } from "@/components/shared/IncidentDetailPanel";
import { MapWrapper } from "@/components/shared/MapWrapper";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  AlertCircle,
  CheckCircle,
  Activity,
  Filter,
  ArrowDownWideNarrow,
  Map as MapIcon,
  List as ListIcon,
  Loader2,
  Clock,
  ShieldAlert,
  Users,
  BrainCircuit,
  Compass,
} from "lucide-react";

export default function DashboardPage() {
  const { incidentsSource, loadingDb } = useIncidents();

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  // Time Slider State
  const [sliderIndex, setSliderIndex] = useState(7); // 7 is Live

  const TIME_STEPS = useMemo(
    () => [
      { label: "24 hrs ago", value: 1440 },
      { label: "12 hrs ago", value: 720 },
      { label: "4 hrs ago", value: 240 },
      { label: "2 hrs ago", value: 120 },
      { label: "1 hr ago", value: 60 },
      { label: "30 min ago", value: 30 },
      { label: "15 min ago", value: 15 },
      { label: "Live System", value: 0 },
    ],
    []
  );

  const currentReplayStep = TIME_STEPS[sliderIndex];
  const replayMinutesAgo = currentReplayStep.value;
  const isReplayMode = replayMinutesAgo > 0;

  // Time Filtered Array (simulating history)
  const timeFilteredIncidents = useMemo(() => {
    if (replayMinutesAgo === 0) return incidentsSource;

    const snapshotTime = Date.now() - replayMinutesAgo * 60000;

    return incidentsSource
      .filter((i) => new Date(i.createdAt).getTime() <= snapshotTime)
      .map((i) => {
        const incidentSnapshot = { ...i };
        if (i.resolvedAt) {
          const resolvedTime = new Date(i.resolvedAt).getTime();
          if (resolvedTime > snapshotTime) {
            incidentSnapshot.status = "assigned";
            incidentSnapshot.resolvedAt = undefined;
          }
        } else if (i.status === "resolved") {
          const updatedTime = new Date(i.updatedAt).getTime();
          if (updatedTime > snapshotTime) {
            incidentSnapshot.status = "assigned";
          }
        }
        return incidentSnapshot;
      });
  }, [incidentsSource, replayMinutesAgo]);

  // Filters
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Sort
  const [sortBy, setSortBy] = useState<"severity" | "recent" | "oldest" | "confidence">("severity");

  // Summary Metrics Calculation
  const totalIncidents = timeFilteredIncidents.length;
  const redZoneCount = timeFilteredIncidents.filter((i) => i.zone === "red" && i.status !== "resolved").length;
  const activeCount = timeFilteredIncidents.filter((i) => i.status !== "resolved").length;
  const unassignedCount = timeFilteredIncidents.filter((i) => i.status === "new" || i.status === "reviewed").length;
  const totalImpacted = timeFilteredIncidents
    .filter((i) => i.status !== "resolved")
    .reduce((acc, curr) => acc + (curr.peopleAffected || 0), 0);
  const avgConfidence = Math.round(
    timeFilteredIncidents.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / (totalIncidents || 1)
  );

  // Applied Filters and Sorted array
  const filteredAndSortedIncidents = useMemo(() => {
    let result = [...timeFilteredIncidents];

    if (zoneFilter !== "all") result = result.filter((i) => i.zone === zoneFilter);

    if (statusFilter === "active") {
      result = result.filter((i) => i.status !== "resolved");
    } else if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }

    if (categoryFilter !== "all") result = result.filter((i) => i.category === categoryFilter);

    result.sort((a, b) => {
      switch (sortBy) {
        case "severity":
          if (b.severityScore === a.severityScore) {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          }
          return b.severityScore - a.severityScore;
        case "confidence":
          return (b.confidence || 0) - (a.confidence || 0);
        case "recent":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "oldest":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [zoneFilter, statusFilter, categoryFilter, sortBy, timeFilteredIncidents]);

  if (loadingDb) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold">Connecting to Crisis Command Center...</h2>
        <p className="text-muted-foreground text-sm mt-1">Establishing geospatial telemetry and live operations queue…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] relative overflow-hidden">
      {/* Top Situation Header & Command HUD */}
      <div className="shrink-0 space-y-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Compass className="w-6 h-6 text-primary animate-pulse" /> Crisis Command Center
              </h1>
              <p className="text-muted-foreground text-xs lg:text-sm">
                Real-time geospatial evidence, deterministic AI triage, and live operational queue.
              </p>
            </div>

            {isReplayMode ? (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-full text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Replay: {currentReplayStep.label}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-full text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
              </div>
            )}
          </div>

          {/* Mobile view toggle */}
          <div className="flex md:hidden border border-border rounded-lg p-1 bg-card">
            <button
              onClick={() => setMobileView("map")}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${
                mobileView === "map" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
            <button
              onClick={() => setMobileView("list")}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${
                mobileView === "list" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" /> Queue
            </button>
          </div>
        </div>

        {/* Situation Overview HUD Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <StatCard
            title="Active Operations"
            value={activeCount}
            icon={<Activity className="text-blue-500 w-4 h-4" />}
            className="p-3 bg-card/60"
          />
          <StatCard
            title="Critical Red Zone"
            value={redZoneCount}
            icon={<ShieldAlert className="text-destructive w-4 h-4 animate-pulse" />}
            className="p-3 bg-card/60 border-red-500/30"
          />
          <StatCard
            title="Total Impacted"
            value={totalImpacted}
            icon={<Users className="text-amber-400 w-4 h-4" />}
            className="p-3 bg-card/60"
          />
          <StatCard
            title="Unassigned Queue"
            value={unassignedCount}
            icon={<AlertCircle className="text-orange-400 w-4 h-4" />}
            className="p-3 bg-card/60 hidden lg:block"
          />
          <StatCard
            title="Avg AI Confidence"
            value={`${avgConfidence}%`}
            icon={<BrainCircuit className="text-primary w-4 h-4" />}
            className="p-3 bg-card/60 hidden lg:block"
          />
        </div>

        {/* Interactive Tactical Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 border border-border p-2 rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="bg-secondary/40 border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              >
                <option value="all">All Zones</option>
                <option value="red">Red (Critical Life Safety)</option>
                <option value="amber">Amber (Major Hazard)</option>
                <option value="green">Green (Minor / Stable)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-secondary/40 border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary capitalize text-xs"
              >
                <option value="active">Active Operations</option>
                <option value="all">All Records</option>
                <option value="new">New Reports</option>
                <option value="reviewed">Acknowledged</option>
                <option value="assigned">Units Dispatched</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs hidden sm:flex">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-secondary/40 border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              >
                <option value="all">All Domains</option>
                <option value="fire">Fire</option>
                <option value="electrical_hazard">Electrical Hazard</option>
                <option value="water_leak">Water Leak (Municipal)</option>
                <option value="flood">Flood / Swift Water</option>
                <option value="medical_emergency">Medical Emergency</option>
                <option value="road_blockage">Road Blockage</option>
                <option value="gas_leak">Gas Leak</option>
                <option value="structural_collapse">Structural Collapse</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs hidden sm:flex border-l border-border pl-2">
              <button
                onClick={() => setZoneFilter(zoneFilter === "red" ? "all" : "red")}
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  zoneFilter === "red"
                    ? "bg-red-500 text-white shadow-sm"
                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                }`}
              >
                Critical Red Only
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <ArrowDownWideNarrow className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-secondary/40 border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            >
              <option value="severity">Highest Severity</option>
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="confidence">Highest Confidence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main 60/40 Split View */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 pb-2">
        {/* Left View: Live Map (approx 60%) */}
        <div className={`flex-1 md:flex-[6] ${mobileView === "map" ? "flex" : "hidden md:flex"} flex-col relative`}>
          <MapWrapper
            incidents={filteredAndSortedIncidents}
            selectedIncident={selectedIncident}
            onSelectIncident={setSelectedIncident}
          />
        </div>

        {/* Right View: Priority Queue (approx 40%) */}
        <div
          className={`flex-1 md:flex-[4] ${
            mobileView === "list" ? "flex" : "hidden md:flex"
          } flex-col bg-card/40 border border-border rounded-xl overflow-hidden shadow-sm`}
        >
          <div className="p-3 border-b border-border bg-card shrink-0 flex items-center justify-between shadow-sm z-10">
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
              <Activity className="w-4 h-4 text-primary" /> Active Incident Queue
            </h2>
            <span className="text-[11px] font-mono font-semibold bg-secondary px-2 py-0.5 rounded text-muted-foreground">
              {filteredAndSortedIncidents.length} Records
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 relative">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  isSelected={selectedIncident?.id === incident.id}
                  onClick={setSelectedIncident}
                />
              ))}
            </AnimatePresence>

            {filteredAndSortedIncidents.length === 0 && (
              <div className="py-8">
                <EmptyState />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Incident Command Overlay Console */}
      <AnimatePresence>
        {selectedIncident && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/50 backdrop-blur-sm z-[999]"
              onClick={() => setSelectedIncident(null)}
            />
            <IncidentDetailPanel
              incident={incidentsSource.find((i) => i.id === selectedIncident.id) || selectedIncident}
              onClose={() => setSelectedIncident(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
