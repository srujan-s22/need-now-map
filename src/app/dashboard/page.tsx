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
import { AlertCircle, CheckCircle, Activity, Filter, ArrowDownWideNarrow, Map as MapIcon, List as ListIcon, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { incidentsSource, loadingDb } = useIncidents();

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map"); // Toggle for mobile users

  // Filters
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Sort
  const [sortBy, setSortBy] = useState<"severity" | "recent" | "oldest" | "confidence">("severity");

  // Summary Metrics Calculation
  const totalIncidents = incidentsSource.length;
  const redZoneCount = incidentsSource.filter(i => i.zone === 'red').length;
  const activeCount = incidentsSource.filter(i => i.status !== 'resolved').length;
  const resolvedCount = incidentsSource.filter(i => i.status === 'resolved').length;
  const avgConfidence = Math.round(incidentsSource.reduce((acc, curr) => acc + curr.confidence, 0) / (totalIncidents || 1));

  // Applied Filters and Sorted array
  const filteredAndSortedIncidents = useMemo(() => {
    let result = [...incidentsSource];

    // Filter
    if (zoneFilter !== "all") result = result.filter(i => i.zone === zoneFilter);

    if (statusFilter === "active") {
      result = result.filter(i => i.status !== 'resolved');
    } else if (statusFilter !== "all") {
      result = result.filter(i => i.status === statusFilter);
    }

    if (categoryFilter !== "all") result = result.filter(i => i.category === categoryFilter);

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "severity":
          return b.severityScore - a.severityScore;
        case "confidence":
          return b.confidence - a.confidence;
        case "recent":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "oldest":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [zoneFilter, statusFilter, categoryFilter, sortBy, incidentsSource]);

  if (loadingDb) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold">Connecting to Geospatial Frame...</h2>
        <p className="text-muted-foreground text-sm mt-1">Establishing secure telemetry uplink via Firebase</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] relative overflow-hidden">

      {/* Top Header & Stats (Scrollable independently if needed, but we keep it fixed at top ideally) */}
      <div className="shrink-0 space-y-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1 text-sm">Real-time geospatial telemetry and live operations queue.</p>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live System
            </div>
          </div>

          {/* Mobile view toggle */}
          <div className="flex md:hidden border border-border rounded-lg p-1 bg-card">
            <button
              onClick={() => setMobileView("map")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${mobileView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <MapIcon className="w-4 h-4" /> Map
            </button>
            <button
              onClick={() => setMobileView("list")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${mobileView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <ListIcon className="w-4 h-4" /> List
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard title="Total Reports" value={totalIncidents} className="p-4" />
          <StatCard title="Active Operations" value={activeCount} icon={<Activity className="text-blue-500 w-5 h-5" />} className="p-4" />
          <StatCard title="Red Zone" value={redZoneCount} icon={<AlertCircle className="text-destructive w-5 h-5" />} className="p-4" />
          <StatCard title="Avg AI Confidence" value={`${avgConfidence}%`} className="p-4 hidden lg:block" />
          <StatCard title="Resolved" value={resolvedCount} icon={<CheckCircle className="text-success w-5 h-5" />} className="p-4 hidden lg:block" />
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-2.5 rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={zoneFilter}
                onChange={e => setZoneFilter(e.target.value)}
                className="bg-transparent border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Zones</option>
                <option value="red">Red (Critical)</option>
                <option value="amber">Amber (Caution)</option>
                <option value="green">Green (Stable)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="active">Active (Not Resolved)</option>
                <option value="all">All History</option>
                <option value="new">New</option>
                <option value="reviewed">Acknowledged</option>
                <option value="assigned">Assigned</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm hidden sm:flex">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-transparent border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                <option value="flood">Flood</option>
                <option value="fire">Fire</option>
                <option value="hazard">Hazard</option>
                <option value="road_blockage">Road Blockage</option>
                <option value="medical_emergency">Medical Emergency</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm hidden sm:flex border-l border-border pl-2 ml-1">
              <button
                onClick={() => setZoneFilter(zoneFilter === 'red' ? 'all' : 'red')}
                className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${zoneFilter === 'red' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
              >
                Critical Only
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <ArrowDownWideNarrow className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="severity">Highest Severity</option>
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="confidence">Highest Confidence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main 60/40 Split View (Responsive) */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 pb-4">

        {/* Left View: Live Map (approx 60%) */}
        <div className={`flex-1 md:flex-[6] ${mobileView === "map" ? "flex" : "hidden md:flex"} flex-col`}>
          <MapWrapper
            incidents={filteredAndSortedIncidents}
            selectedIncident={selectedIncident}
            onSelectIncident={setSelectedIncident}
          />
        </div>

        {/* Right View: Priority Queue (approx 40%) */}
        <div className={`flex-1 md:flex-[4] ${mobileView === "list" ? "flex" : "hidden md:flex"} flex-col bg-card/30 border border-border rounded-xl overflow-hidden`}>
          <div className="p-4 border-b border-border bg-card shrink-0 flex items-center justify-between shadow-sm z-10">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Active Queue
            </h2>
            <span className="text-xs font-medium bg-muted px-2 py-1 rounded text-muted-foreground">
              {filteredAndSortedIncidents.length} Records
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedIncidents.map(incident => (
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

      {/* Incident Overlay Drawer */}
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
              incident={incidentsSource.find(i => i.id === selectedIncident.id) || selectedIncident}
              onClose={() => setSelectedIncident(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
