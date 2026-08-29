"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  BrainCircuit,
  Activity,
  RotateCw,
  X,
  ArrowRight,
  MapPin,
  Search,
  ShieldAlert,
  Users,
  Wrench,
  Check,
  Edit3,
  Flame,
  Radio,
  Zap,
  Tag,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  AlertTriangle,
  Building2,
  Ambulance,
  Compass,
} from "lucide-react";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { IncidentCategory, SeverityZone, UrgencyLevel } from "@/types/incident";
import {
  EvidenceBasedTriageResponse,
  InvestigationStep,
  InvestigationStreamEvent,
  TriageEvidence,
} from "@/types/investigation";
import dynamic from "next/dynamic";

const MiniMap = dynamic(() => import("@/components/shared/MiniMap"), {
  ssr: false,
  loading: () => <div className="w-full h-56 bg-muted/20 animate-pulse rounded-xl border border-border" />,
});

/* ─── Nominatim Geocoding Helpers ─── */

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

async function searchPlaces(query: string): Promise<NominatimResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`,
      {
        headers: {
          "User-Agent": "NeedNowMap/0.2.0 (Civic Emergency Command Platform; contact: emergency-triage@neednow.local)",
        },
      }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function geocodeText(text: string): Promise<NominatimResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=1`,
      {
        headers: {
          "User-Agent": "NeedNowMap/0.2.0 (Civic Emergency Command Platform; contact: emergency-triage@neednow.local)",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          "User-Agent": "NeedNowMap/0.2.0 (Civic Emergency Command Platform; contact: emergency-triage@neednow.local)",
        },
      }
    );
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/* ─── Category & Urgency Styles ─── */

const CATEGORY_LABELS: Record<string, string> = {
  flood: "Flood Emergency",
  fire: "Fire Incident",
  road_blockage: "Road Blockage",
  injury: "Injury / Casualty",
  power_outage: "Power Outage",
  supply_shortage: "Supply Shortage",
  trapped_people: "Trapped People",
  medical_emergency: "Medical Emergency",
  hazard: "Environmental Hazard",
  other: "Other Incident",
};

const URGENCY_STYLES: Record<UrgencyLevel, { bg: string; text: string; border: string }> = {
  immediate: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40" },
  moderate: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40" },
  low: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" },
};

/* ─── Main Component ─── */

export default function ReportPage() {
  const router = useRouter();

  /* --- Form State --- */
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    customCategory: "",
    urgency: "moderate" as UrgencyLevel,
    description: "",
    location: "",
    lat: null as number | null,
    lng: null as number | null,
    peopleAffected: "",
    locationSource: "none" as "none" | "suggestion" | "custom" | "browser",
  });

  const [formErrors, setFormErrors] = useState<{ title?: string; description?: string }>({});

  /* --- Location Geocoding State --- */
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [detectingLocation, setDetectingLocation] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  /* --- Live Investigation Telemetry State --- */
  const [aiState, setAiState] = useState<"idle" | "investigating" | "success" | "error" | "degraded">("idle");
  const [investigationSteps, setInvestigationSteps] = useState<InvestigationStep[]>([]);
  const [activeSearchRadiusKm, setActiveSearchRadiusKm] = useState<number | null>(null);
  const [activeSearchType, setActiveSearchType] = useState<string | null>(null);
  const [discoveredEvidence, setDiscoveredEvidence] = useState<TriageEvidence[]>([]);
  const [triageResult, setTriageResult] = useState<EvidenceBasedTriageResponse | null>(null);

  /* --- UI / Dispatcher Interaction State --- */
  const [isEditingTriage, setIsEditingTriage] = useState(false);
  const [showConfidenceWhy, setShowConfidenceWhy] = useState(false);
  const [showEvidenceDetails, setShowEvidenceDetails] = useState(false);
  const [newNeedInput, setNewNeedInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* --- Debounced Autocomplete Search --- */
  useEffect(() => {
    if (!locationQuery.trim() || locationQuery === selectedLabel) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(locationQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [locationQuery, selectedLabel]);

  /* --- Select Location Suggestion --- */
  const handleSelectSuggestion = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const label = result.display_name;

    setLocationQuery(label);
    setSelectedLabel(label);
    setSuggestions([]);
    setShowSuggestions(false);
    setGeocodeStatus("success");

    setFormData((prev) => ({
      ...prev,
      location: label,
      lat,
      lng,
      locationSource: "suggestion",
    }));
  }, []);

  /* --- Geocode Custom Text on Enter/Blur --- */
  const handleGeocode = useCallback(async () => {
    const text = locationQuery.trim();
    if (!text || text === selectedLabel) return;

    setGeocodeStatus("loading");
    const result = await geocodeText(text);

    if (result) {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      const label = result.display_name;

      setSelectedLabel(label);
      setLocationQuery(label);
      setGeocodeStatus("success");

      setFormData((prev) => ({
        ...prev,
        location: label,
        lat,
        lng,
        locationSource: "custom",
      }));
    } else {
      setGeocodeStatus("failed");
      setFormData((prev) => ({
        ...prev,
        location: text,
        lat: null,
        lng: null,
        locationSource: "none",
      }));
    }
  }, [locationQuery, selectedLabel]);

  const handleLocationInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationQuery(value);
    setGeocodeStatus("idle");

    if (!value.trim()) {
      setSelectedLabel("");
      setSuggestions([]);
      setShowSuggestions(false);
      setFormData((prev) => ({
        ...prev,
        location: "",
        lat: null,
        lng: null,
        locationSource: "none",
      }));
      return;
    }

    if (value !== selectedLabel) {
      setSelectedLabel("");
    }
  }, [selectedLabel]);

  const handleLocationKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setShowSuggestions(false);
      handleGeocode();
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }, [handleGeocode]);

  const handleLocationBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestions(false);
      if (locationQuery.trim() && locationQuery !== selectedLabel) {
        handleGeocode();
      }
    }, 250);
  }, [locationQuery, selectedLabel, handleGeocode]);

  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locText = await reverseGeocode(latitude, longitude);

        setLocationQuery(locText);
        setSelectedLabel(locText);
        setGeocodeStatus("success");

        setFormData((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          location: locText,
          locationSource: "browser",
        }));
        setDetectingLocation(false);
      },
      () => {
        setDetectingLocation(false);
      }
    );
  }, []);

  /* --- Form Validation --- */
  const validateForm = () => {
    const errors: { title?: string; description?: string } = {};
    if (!formData.title.trim()) {
      errors.title = "Incident title is required for triage investigation.";
    }
    if (!formData.description.trim()) {
      errors.description = "Detailed situational telemetry is required for triage investigation.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* --- Execute Live Investigation Pipeline via SSE Stream --- */
  const handleAnalyze = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!validateForm()) return;

    setAiState("investigating");
    setErrorMessage("");
    setIsEditingTriage(false);
    setInvestigationSteps([]);
    setDiscoveredEvidence([]);
    setActiveSearchRadiusKm(null);
    setActiveSearchType(null);
    setTriageResult(null);

    const payload = {
      ...formData,
      category: formData.category === "other" ? formData.customCategory : formData.category,
    };

    try {
      const res = await fetch("/api/triage/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to start investigation stream.`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const jsonString = trimmed.replace(/^data:\s*/, "");
          try {
            const eventData: InvestigationStreamEvent = JSON.parse(jsonString);

            if (eventData.event === "step_update") {
              setInvestigationSteps((prev) => {
                const idx = prev.findIndex((s) => s.id === eventData.step.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = eventData.step;
                  return updated;
                }
                return [...prev, eventData.step];
              });
            } else if (eventData.event === "search_started") {
              setActiveSearchRadiusKm(eventData.radiusKm);
              setActiveSearchType(eventData.searchType);
            } else if (eventData.event === "evidence_found") {
              setDiscoveredEvidence((prev) => {
                if (prev.some((e) => e.id === eventData.evidence.id)) return prev;
                return [...prev, eventData.evidence];
              });
            } else if (eventData.event === "search_completed") {
              setActiveSearchRadiusKm(null);
              setActiveSearchType(null);
            } else if (eventData.event === "triage_complete") {
              setTriageResult(eventData.result);
              setAiState(eventData.result.isDegradedMode ? "degraded" : "success");
            } else if (eventData.event === "investigation_error") {
              setErrorMessage(eventData.message);
              if (eventData.fallbackResult) {
                setTriageResult(eventData.fallbackResult);
                setAiState("degraded");
              } else {
                setAiState("error");
              }
            }
          } catch (jsonErr) {
            console.warn("Failed to parse SSE event JSON:", jsonErr, jsonString);
          }
        }
      }
    } catch (err: unknown) {
      console.error("Investigation stream failed, attempting standard REST fallback:", err);
      // Failover to non-streaming REST endpoint
      try {
        const fallbackRes = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (fallbackRes.ok) {
          const resultData: EvidenceBasedTriageResponse = await fallbackRes.json();
          setTriageResult(resultData);
          setDiscoveredEvidence(resultData.evidence || []);
          setAiState(resultData.isDegradedMode ? "degraded" : "success");
          return;
        }
      } catch (restErr) {
        console.error("REST fallback also failed:", restErr);
      }

      setErrorMessage(err instanceof Error ? err.message : "Investigation stream disconnected.");
      setAiState("error");
    }
  };

  /* --- Final Submit Incident --- */
  const handleSubmit = async () => {
    if (!triageResult) return;
    setIsSubmitting(true);

    try {
      const initialTimeline = [
        {
          timestamp: new Date().toISOString(),
          stage: "reported" as const,
          title: "Incident Ingested",
          description: `Report submitted via Citizen Intake Telemetry (Category: ${triageResult.category})`,
          actor: "citizen" as const,
        },
        {
          timestamp: new Date().toISOString(),
          stage: "investigated" as const,
          title: "Geospatial Investigation Completed",
          description: `Corroborated ${triageResult.evidence.length} OpenStreetMap assets across ${triageResult.capabilitiesEvaluated?.length || 0} capabilities`,
          actor: "ai_pipeline" as const,
        },
        {
          timestamp: new Date().toISOString(),
          stage: "corroborated" as const,
          title: "Deterministic Confidence Computed",
          description: `Confidence score established at ${triageResult.confidence}%`,
          actor: "ai_pipeline" as const,
        },
      ];

      const finalPayload = {
        title: formData.title,
        category: triageResult.category,
        urgency: triageResult.urgency,
        description: formData.description,
        location: formData.location || "Location Not Specified",
        lat: formData.lat || 0,
        lng: formData.lng || 0,
        peopleAffected: triageResult.estimatedPeopleAffected,
        reportedPeopleAffected: triageResult.reportedPeopleAffected,
        severityScore: triageResult.severityScore,
        zone: triageResult.zone,
        needs: triageResult.needs,
        summary: triageResult.summary,
        bestNextAction: triageResult.bestNextAction,
        confidence: triageResult.confidence,
        confidenceBreakdown: triageResult.confidenceBreakdown,
        evidenceCount: triageResult.evidence.length,
        missingEvidence: triageResult.missingEvidence,
        contradictions: triageResult.contradictions,
        recommendedTeam: triageResult.recommendedTeam,
        reasoning: triageResult.reasoning,
        isOverridden: isEditingTriage,
        resources: triageResult.rankedResources || [],
        capabilitiesEvaluated: triageResult.capabilitiesEvaluated || [],
        timeline: initialTimeline,
      };

      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (!res.ok) {
        throw new Error("Failed to dispatch incident to queue.");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1800);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to submit incident. Please check server logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --- Reset Form --- */
  const resetForm = () => {
    setAiState("idle");
    setTriageResult(null);
    setInvestigationSteps([]);
    setDiscoveredEvidence([]);
    setActiveSearchRadiusKm(null);
    setActiveSearchType(null);
    setIsEditingTriage(false);
    setShowConfidenceWhy(false);
    setShowEvidenceDetails(false);
    setFormErrors({});
    setLocationQuery("");
    setSelectedLabel("");
    setSuggestions([]);
    setShowSuggestions(false);
    setGeocodeStatus("idle");
    setFormData({
      title: "",
      category: "",
      customCategory: "",
      urgency: "moderate",
      description: "",
      location: "",
      lat: null,
      lng: null,
      peopleAffected: "",
      locationSource: "none",
    });
  };

  /* --- Needs Manipulation in Override Mode --- */
  const handleAddNeed = () => {
    if (!newNeedInput.trim() || !triageResult) return;
    setTriageResult({
      ...triageResult,
      needs: [...triageResult.needs, newNeedInput.trim()],
    });
    setNewNeedInput("");
  };

  const handleRemoveNeed = (index: number) => {
    if (!triageResult) return;
    setTriageResult({
      ...triageResult,
      needs: triageResult.needs.filter((_, i) => i !== index),
    });
  };

  const urgencyConfig = triageResult
    ? URGENCY_STYLES[triageResult.urgency] || URGENCY_STYLES.moderate
    : URGENCY_STYLES.moderate;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Radio className="w-7 h-7 text-primary animate-pulse" /> Incident Telemetry & Evidence-Based Triage
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ingest civilian reports, execute real-world geospatial infrastructure queries, and synthesize evidence-backed emergency response directives.
          </p>
        </div>

        {/* Live Status Header Badge */}
        <div className="flex items-center gap-2">
          {aiState === "idle" && (
            <div className="flex items-center gap-2 bg-secondary/80 text-muted-foreground px-3 py-1.5 rounded-full border border-border text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              SYSTEM READY
            </div>
          )}
          {aiState === "investigating" && (
            <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3.5 py-1.5 rounded-full border border-blue-500/30 text-xs font-semibold animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              LIVE INVESTIGATION IN PROGRESS
            </div>
          )}
          {aiState === "success" && (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              EVIDENCE-CORROBORATED TRIAGE
            </div>
          )}
          {aiState === "degraded" && (
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/30 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              DEGRADED INVESTIGATION (FAIL-SAFE)
            </div>
          )}
          {aiState === "error" && (
            <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full border border-red-500/30 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              INVESTIGATION HALTED
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Intake Telemetry Form & Map (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-card shadow-lg relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          <form className="p-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base flex items-center gap-2 text-foreground">
                  <AlertCircle className="w-4 h-4 text-primary" /> Situational Intake
                </h2>
                {(aiState === "success" || aiState === "degraded") && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" /> Clear Form
                  </button>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Incident Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (formErrors.title) setFormErrors({ ...formErrors, title: undefined });
                  }}
                  placeholder="e.g. Electrical fire on 3rd floor"
                  className={`w-full bg-input border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                    formErrors.title
                      ? "border-red-500 focus:ring-red-500/50"
                      : "border-border focus:ring-primary"
                  }`}
                />
                {formErrors.title && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.title}
                  </p>
                )}
              </div>

              {/* Category & People Affected */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Initial Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Auto-Detect (AI)</option>
                    <option value="flood">Flood</option>
                    <option value="fire">Fire</option>
                    <option value="trapped_people">Trapped People</option>
                    <option value="medical_emergency">Medical Emergency</option>
                    <option value="power_outage">Power Outage</option>
                    <option value="road_blockage">Road Blockage</option>
                    <option value="hazard">Hazard</option>
                    <option value="supply_shortage">Supply Shortage</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Est. Affected
                  </label>
                  <input
                    type="number"
                    value={formData.peopleAffected}
                    onChange={(e) => setFormData({ ...formData, peopleAffected: e.target.value })}
                    placeholder="Approx count"
                    min="1"
                    className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {formData.category === "other" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Custom Category Tag
                  </label>
                  <input
                    type="text"
                    value={formData.customCategory}
                    onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                    placeholder="e.g. Toxic spill, Sinkhole..."
                    className="w-full bg-input border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {/* Location Input & GPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Incident Location
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {detectingLocation ? <RotateCw className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                    {detectingLocation ? "Detecting GPS..." : "Use Current GPS"}
                  </button>
                </div>

                <div className="relative" style={{ zIndex: 50 }}>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={locationQuery}
                      onChange={handleLocationInputChange}
                      onKeyDown={handleLocationKeyDown}
                      onFocus={() => {
                        if (suggestions.length > 0 && locationQuery !== selectedLabel) {
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={handleLocationBlur}
                      placeholder="Search landmark, street, or city..."
                      className="w-full bg-input border border-border rounded-lg pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <div className="absolute right-3 top-3">
                      {isSearching || geocodeStatus === "loading" ? (
                        <RotateCw className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Search className="w-4 h-4 text-muted-foreground/40" />
                      )}
                    </div>
                  </div>

                  {/* Autocomplete Suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full left-0 w-full mt-1 bg-card border border-border rounded-lg shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto"
                    >
                      {suggestions.map((s, i) => (
                        <div
                          key={s.place_id || i}
                          className="px-3 py-2 text-xs hover:bg-secondary cursor-pointer border-b border-border/50 last:border-0 transition-colors flex items-start gap-2"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(s);
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{s.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location Quality Badge */}
                {formData.lat && formData.lng && geocodeStatus === "success" && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="truncate font-mono">
                      Coordinates: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                      {formData.locationSource === "browser" ? " (GPS Hardware)" : " (Geocoded)"}
                    </span>
                  </div>
                )}

                {/* Interactive Map Visualizer */}
                {formData.lat && formData.lng ? (
                  <div className="pt-1 space-y-1">
                    <MiniMap
                      lat={formData.lat}
                      lng={formData.lng}
                      activeSearchRadiusKm={activeSearchRadiusKm}
                      activeSearchType={activeSearchType}
                      evidenceItems={discoveredEvidence}
                      heightClassName="h-56"
                    />
                    {activeSearchRadiusKm && (
                      <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1.5 animate-pulse">
                        <Compass className="w-3 h-3 animate-spin" />
                        Scanning OpenStreetMap within {activeSearchRadiusKm} km radius...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-24 border border-dashed border-border rounded-lg bg-secondary/20 flex items-center justify-center text-xs text-muted-foreground p-3 text-center">
                    Enter an address or click &quot;Use Current GPS&quot; to preview and enable nearby emergency resource discovery.
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Field Telemetry & Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (formErrors.description) setFormErrors({ ...formErrors, description: undefined });
                  }}
                  placeholder="Detail exact conditions, hazard sources, visible casualties, urgent extrication needs..."
                  className={`w-full bg-input border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                    formErrors.description
                      ? "border-red-500 focus:ring-red-500/50"
                      : "border-border focus:ring-primary"
                  }`}
                />
                {formErrors.description && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.description}
                  </p>
                )}
              </div>
            </div>

            {/* Launch Investigation Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => handleAnalyze(e)}
                disabled={aiState === "investigating"}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-semibold rounded-lg shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiState === "investigating" ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Executing Live AI Investigation...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-4 h-4" />
                    {aiState === "success" || aiState === "degraded" ? "Re-Run Investigation" : "Launch Evidence-Based Investigation"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Triage Engine Output & Investigation HUD (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-border bg-card shadow-lg flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="bg-secondary/40 border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-tight text-foreground">Triage & Investigation Engine</h2>
                <p className="text-[11px] text-muted-foreground">Observable Reasoning & Corroborated Evidence</p>
              </div>
            </div>

            {(aiState === "success" || aiState === "degraded") && triageResult && (
              <button
                type="button"
                onClick={() => setIsEditingTriage(!isEditingTriage)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isEditingTriage
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                {isEditingTriage ? "Lock Override" : "Human Override"}
              </button>
            )}
          </div>

          <div className="p-6 flex-1 flex flex-col min-h-[500px]">
            {/* Idle State */}
            {aiState === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/80 flex items-center justify-center text-muted-foreground/60">
                  <BrainCircuit className="w-8 h-8" />
                </div>
                <div className="max-w-sm space-y-1.5">
                  <h3 className="font-semibold text-sm text-foreground">Awaiting Incident Telemetry</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Fill in the situational telemetry on the left and click <strong>&quot;Launch Evidence-Based Investigation&quot;</strong>. The engine will query real infrastructure and formulate verified tactical directives.
                  </p>
                </div>
              </div>
            )}

            {/* Live Investigation HUD (Active Telemetry Stream) */}
            {aiState === "investigating" && (
              <div className="flex-1 flex flex-col space-y-5 animate-in fade-in duration-200">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-3">
                  <RotateCw className="w-5 h-5 animate-spin text-blue-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-sm text-blue-300">Live Investigation Active</h3>
                    <p className="text-xs text-blue-400/80">Executing multi-stage geospatial discovery and Gemini evidence reasoning...</p>
                  </div>
                </div>

                {/* Step Activity Log */}
                <div className="space-y-2 font-mono text-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">AI Investigation Telemetry Feed</p>
                  <div className="space-y-2 bg-secondary/30 border border-border/80 rounded-lg p-3.5 max-h-72 overflow-y-auto">
                    {investigationSteps.map((step) => (
                      <div key={step.id} className="flex items-start gap-2.5 text-xs">
                        {step.status === "completed" ? (
                          <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                        ) : step.status === "degraded" ? (
                          <span className="text-amber-400 font-bold shrink-0 mt-0.5">⚠</span>
                        ) : step.status === "failed" ? (
                          <span className="text-red-400 font-bold shrink-0 mt-0.5">✗</span>
                        ) : (
                          <span className="text-blue-400 animate-pulse font-bold shrink-0 mt-0.5">◉</span>
                        )}
                        <div className="flex-1">
                          <p className={`font-semibold ${step.status === "running" ? "text-blue-300 animate-pulse" : "text-foreground"}`}>
                            {step.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{step.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discovered Real Evidence Stream */}
                {discoveredEvidence.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Verified Infrastructure Discovered ({discoveredEvidence.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {discoveredEvidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="px-2.5 py-1 rounded-md text-xs bg-secondary border border-border flex items-center gap-1.5 animate-in fade-in"
                        >
                          <span className="text-sm">
                            {ev.type === "fire_station" ? "🚒" : ev.type === "hospital" ? "🏥" : "🚔"}
                          </span>
                          <span className="font-semibold text-foreground">{ev.name}</span>
                          <span className="font-mono text-[10px] text-primary">({ev.distanceKm} km)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error State */}
            {aiState === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center">
                  <X className="w-7 h-7" />
                </div>
                <div className="max-w-xs space-y-1">
                  <h3 className="font-semibold text-sm text-red-400">Investigation Error</h3>
                  <p className="text-xs text-muted-foreground">
                    {errorMessage || "Failed to complete investigation pipeline. Please verify network and server logs."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleAnalyze(e)}
                  className="text-xs font-semibold px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg transition-colors cursor-pointer"
                >
                  Retry Investigation
                </button>
              </div>
            )}

            {/* Completed Triage Output */}
            {(aiState === "success" || aiState === "degraded") && triageResult && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Degraded mode warning banner if relevant */}
                {triageResult.isDegradedMode && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>Degraded Fail-Safe Mode:</strong> {triageResult.degradedReason || "External service access limited; deterministic emergency rule engine engaged."}
                    </span>
                  </div>
                )}

                {/* Contradiction Alert if Detected */}
                {triageResult.contradictions && triageResult.contradictions.length > 0 && (
                  <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4" /> Telemetry Data Discrepancy Detected
                    </div>
                    {triageResult.contradictions.map((c, i) => (
                      <p key={i} className="text-xs text-orange-200/90 leading-relaxed">
                        {c.explanation}
                      </p>
                    ))}
                  </div>
                )}

                {/* Executive Summary & Badges */}
                <div className="space-y-3 pb-4 border-b border-border/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge zone={triageResult.zone} className="px-3 py-1 text-xs uppercase font-bold" />

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${urgencyConfig.bg} ${urgencyConfig.text} ${urgencyConfig.border}`}>
                        {triageResult.urgency} Urgency
                      </span>

                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary text-foreground border border-border flex items-center gap-1">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        {CATEGORY_LABELS[triageResult.category] || triageResult.category}
                      </span>
                    </div>

                    {/* Overall Confidence Meter */}
                    <div className="text-right">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-2xl font-black text-foreground font-mono">{triageResult.confidence}%</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Confidence</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-foreground leading-snug">
                    {triageResult.summary}
                  </h3>
                </div>

                {/* Severity Score Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground uppercase tracking-wider">Assessed Crisis Severity Score</span>
                    <span className={`font-mono font-bold ${
                      triageResult.zone === "red" ? "text-red-400" : triageResult.zone === "amber" ? "text-yellow-400" : "text-emerald-400"
                    }`}>
                      {triageResult.severityScore} / 100
                    </span>
                  </div>
                  <div className="w-full bg-secondary/80 h-2.5 rounded-full overflow-hidden border border-border/40">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        triageResult.zone === "red"
                          ? "bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                          : triageResult.zone === "amber"
                          ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                          : "bg-gradient-to-r from-emerald-600 to-teal-400"
                      }`}
                      style={{ width: `${Math.max(5, triageResult.severityScore)}%` }}
                    />
                  </div>
                </div>

                {/* Multi-Dimensional Confidence Breakdown Accordion */}
                <div className="rounded-lg border border-border/80 bg-secondary/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowConfidenceWhy(!showConfidenceWhy)}
                    className="w-full p-3.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-primary" />
                      <span>Deterministic Confidence Breakdown ({triageResult.confidence}%)</span>
                    </div>
                    <div className="flex items-center gap-1 text-primary text-[11px] font-normal">
                      <span>{showConfidenceWhy ? "Hide Factors" : "Why this score?"}</span>
                      {showConfidenceWhy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  {showConfidenceWhy && triageResult.confidenceBreakdown && (
                    <div className="p-4 pt-0 space-y-4 border-t border-border/50 text-xs animate-in fade-in duration-200">
                      {/* 4 Dimension Bars */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
                        <div className="bg-input p-2.5 rounded-md border border-border/60">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Classification</p>
                          <p className="text-base font-mono font-bold text-foreground mt-0.5">{triageResult.confidenceBreakdown.classification}%</p>
                        </div>
                        <div className="bg-input p-2.5 rounded-md border border-border/60">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Severity Quality</p>
                          <p className="text-base font-mono font-bold text-foreground mt-0.5">{triageResult.confidenceBreakdown.severity}%</p>
                        </div>
                        <div className="bg-input p-2.5 rounded-md border border-border/60">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Evidence Coverage</p>
                          <p className="text-base font-mono font-bold text-foreground mt-0.5">{triageResult.confidenceBreakdown.evidence}%</p>
                        </div>
                        <div className="bg-input p-2.5 rounded-md border border-border/60">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Location Precision</p>
                          <p className="text-base font-mono font-bold text-foreground mt-0.5">{triageResult.confidenceBreakdown.location}%</p>
                        </div>
                      </div>

                      {/* Positive & Negative Factors */}
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Scoring Factor Contributors</p>
                        <div className="space-y-1.5">
                          {triageResult.confidenceBreakdown.factors.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              {f.impact === "positive" ? (
                                <span className="text-emerald-400 font-bold font-mono shrink-0">+</span>
                              ) : f.impact === "negative" ? (
                                <span className="text-red-400 font-bold font-mono shrink-0">−</span>
                              ) : (
                                <span className="text-muted-foreground font-bold font-mono shrink-0">•</span>
                              )}
                              <div className="flex-1">
                                <span className="font-semibold text-foreground">{f.label}:</span>{" "}
                                <span className="text-muted-foreground">{f.explanation}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Evidence Gathered Section */}
                <div className="rounded-lg border border-border/80 bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Verified Geospatial Evidence ({triageResult.evidence.length} Mapped)
                      </h4>
                    </div>
                    {triageResult.evidence.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowEvidenceDetails(!showEvidenceDetails)}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showEvidenceDetails ? "Collapse" : "View All"}
                        {showEvidenceDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {triageResult.evidence.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(showEvidenceDetails ? triageResult.evidence : triageResult.evidence.slice(0, 4)).map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-md bg-input border border-border/60 text-xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-foreground line-clamp-1 flex items-center gap-1">
                              {item.type === "fire_station" ? "🚒" : item.type === "hospital" ? "🏥" : "🚔"} {item.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-primary shrink-0">
                              {item.distanceKm} km away
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground flex items-center justify-between">
                            <span>Source: {item.source}</span>
                            {item.lat && item.lng && (
                              <span className="font-mono text-[9px]">{item.lat.toFixed(3)}, {item.lng.toFixed(3)}</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No external emergency facilities mapped within search radius in OpenStreetMap dataset.
                    </p>
                  )}
                </div>

                {/* AI Reasoning & Epistemic Distinctions */}
                <div className="rounded-lg bg-secondary/30 border border-border/60 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <BrainCircuit className="w-3.5 h-3.5 text-primary" /> AI Diagnostic Reasoning
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed italic">
                    &quot;{triageResult.reasoning}&quot;
                  </p>
                  {triageResult.unknownsAcknowledged && triageResult.unknownsAcknowledged.length > 0 && (
                    <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span><strong>Acknowledged Unknowns:</strong> {triageResult.unknownsAcknowledged.join("; ")}</span>
                    </div>
                  )}
                </div>

                {/* Tactical Dispatch Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-input border border-border/60 p-3.5 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recommended Unit</p>
                      <p className="text-sm font-semibold text-foreground">{triageResult.recommendedTeam}</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-input border border-border/60 p-3.5 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Considered Casualties / Scope</p>
                      <p className="text-sm font-semibold text-foreground">
                        {triageResult.estimatedPeopleAffected} Individuals
                        {triageResult.reportedPeopleAffected !== triageResult.estimatedPeopleAffected && (
                          <span className="text-[10px] text-muted-foreground font-normal block font-mono">
                            ({triageResult.reportedPeopleAffected} reported on form)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Required Resources */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-primary" /> Required Field Resources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {triageResult.needs && triageResult.needs.length > 0 ? (
                      triageResult.needs.map((need, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary/80 text-foreground border border-border flex items-center gap-1.5"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          {need}
                          {isEditingTriage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveNeed(idx)}
                              className="ml-1 text-muted-foreground hover:text-red-400 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Standard deployment kit</span>
                    )}
                  </div>

                  {/* Add need in edit mode */}
                  {isEditingTriage && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={newNeedInput}
                        onChange={(e) => setNewNeedInput(e.target.value)}
                        placeholder="Add required operational resource..."
                        className="bg-input border border-border rounded-md px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNeed();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddNeed}
                        className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-xs font-medium rounded-md border border-border cursor-pointer"
                      >
                        Add Need
                      </button>
                    </div>
                  )}
                </div>

                {/* Tactical Command Directive */}
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <CheckCircle className="w-4 h-4" /> Tactical Command Directive
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {triageResult.bestNextAction}
                  </p>
                </div>

                {/* Human Dispatcher Override Controls */}
                {isEditingTriage && (
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in duration-200">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" /> Human Dispatcher Override Active
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Modifications here override the AI recommendation for operational routing while preserving the original AI assessment in audit telemetry.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-muted-foreground block mb-1">Zone Priority</label>
                        <select
                          value={triageResult.zone}
                          onChange={(e) => setTriageResult({ ...triageResult, zone: e.target.value as SeverityZone })}
                          className="w-full bg-input border border-border rounded p-1.5 text-xs"
                        >
                          <option value="red">Red (Critical)</option>
                          <option value="amber">Amber (Hazard)</option>
                          <option value="green">Green (Stable)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-muted-foreground block mb-1">Urgency</label>
                        <select
                          value={triageResult.urgency}
                          onChange={(e) => setTriageResult({ ...triageResult, urgency: e.target.value as UrgencyLevel })}
                          className="w-full bg-input border border-border rounded p-1.5 text-xs"
                        >
                          <option value="immediate">Immediate</option>
                          <option value="high">High</option>
                          <option value="moderate">Moderate</option>
                          <option value="low">Low</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-muted-foreground block mb-1">Severity Score (0-100)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={triageResult.severityScore}
                          onChange={(e) => setTriageResult({ ...triageResult, severityScore: parseInt(e.target.value) || 0 })}
                          className="w-full bg-input border border-border rounded p-1.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Approve & Dispatch Button */}
                {!submitSuccess ? (
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          Dispatching Incident to Crisis Grid...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Approve & Dispatch Incident
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
                    <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-400">Incident Dispatched Successfully</p>
                      <p className="text-xs text-muted-foreground">Incident broadcast to command center and active live maps.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-emerald-400 animate-pulse" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
