"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, CheckCircle, BrainCircuit, Activity, RotateCw, X, ArrowRight, MapPin, Search } from "lucide-react";
import { AITriageResponse } from "@/lib/ai";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import dynamic from "next/dynamic";

const MiniMap = dynamic(() => import("@/components/shared/MiniMap"), {
  ssr: false,
  loading: () => <div className="w-full h-48 bg-muted/20 animate-pulse rounded-xl border border-border" />
});

/* ─── Nominatim helpers ─── */

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

async function searchPlaces(query: string): Promise<NominatimResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`
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
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=1`
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
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/* ─── Component ─── */

export default function ReportPage() {
  const router = useRouter();

  /* --- Form state --- */
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    customCategory: "",
    urgency: "moderate",
    description: "",
    location: "",
    lat: null as number | null,
    lng: null as number | null,
    peopleAffected: "",
  });

  /* --- Location state (kept separately from formData for clarity) --- */
  const [locationQuery, setLocationQuery] = useState("");         // raw text in the input
  const [selectedLabel, setSelectedLabel] = useState("");          // label chosen from suggestion / geocode
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [locationSource, setLocationSource] = useState<"none" | "suggestion" | "custom" | "browser">("none");

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  /* --- Debounced autocomplete search --- */
  useEffect(() => {
    // Don't search if empty, or if the current query matches what we already selected
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

  /* --- Handle selecting a suggestion --- */
  const handleSelectSuggestion = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const label = result.display_name;

    setLocationQuery(label);
    setSelectedLabel(label);
    setSuggestions([]);
    setShowSuggestions(false);
    setLocationSource("suggestion");
    setGeocodeStatus("success");

    setFormData(prev => ({
      ...prev,
      location: label,
      lat,
      lng,
    }));
  }, []);

  /* --- Geocode custom text (on blur / Enter) --- */
  const handleGeocode = useCallback(async () => {
    const text = locationQuery.trim();

    // Don't re-geocode if we already resolved this exact text
    if (!text || text === selectedLabel) return;

    setGeocodeStatus("loading");
    const result = await geocodeText(text);

    if (result) {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      const label = result.display_name;

      setSelectedLabel(label);
      setLocationQuery(label);
      setLocationSource("custom");
      setGeocodeStatus("success");

      setFormData(prev => ({
        ...prev,
        location: label,
        lat,
        lng,
      }));
    } else {
      setGeocodeStatus("failed");
      // Keep the text but clear coords since we couldn't resolve
      setFormData(prev => ({
        ...prev,
        location: text,
        lat: null,
        lng: null,
      }));
    }
  }, [locationQuery, selectedLabel]);

  /* --- Handle typing in the location input --- */
  const handleLocationInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationQuery(value);
    setGeocodeStatus("idle");

    // If user clears the input, reset everything
    if (!value.trim()) {
      setSelectedLabel("");
      setSuggestions([]);
      setShowSuggestions(false);
      setLocationSource("none");
      setFormData(prev => ({
        ...prev,
        location: "",
        lat: null,
        lng: null,
      }));
      return;
    }

    // Clear the selected label so the debounce fires for autocomplete
    if (value !== selectedLabel) {
      setSelectedLabel("");
    }
  }, [selectedLabel]);

  /* --- Handle keyboard events on the input --- */
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

  /* --- Handle blur on the input --- */
  const handleLocationBlur = useCallback(() => {
    // Small delay so click on suggestion can fire first
    setTimeout(() => {
      setShowSuggestions(false);
      // Geocode on blur if we have unresolved text
      if (locationQuery.trim() && locationQuery !== selectedLabel) {
        handleGeocode();
      }
    }, 250);
  }, [locationQuery, selectedLabel, handleGeocode]);

  /* --- Detect current browser location --- */
  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locText = await reverseGeocode(latitude, longitude);

        setLocationQuery(locText);
        setSelectedLabel(locText);
        setLocationSource("browser");
        setGeocodeStatus("success");

        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          location: locText,
        }));
        setDetectingLocation(false);
      },
      () => {
        setDetectingLocation(false);
      }
    );
  }, []);

  /* --- AI Triage state --- */
  const [aiState, setAiState] = useState<"idle" | "analyzing" | "success" | "error">("idle");
  const [triageResult, setTriageResult] = useState<AITriageResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!triageResult) return;
    setIsSubmitting(true);
    try {
      const finalPayload = {
        title: formData.title,
        category: triageResult.category,
        urgency: triageResult.urgency,
        description: formData.description,
        location: formData.location || "Location Not Specified",
        lat: formData.lat,
        lng: formData.lng,
        peopleAffected: triageResult.estimatedPeopleAffected,
        severityScore: triageResult.severityScore,
        zone: triageResult.zone,
        needs: triageResult.needs,
        summary: triageResult.summary,
        bestNextAction: triageResult.bestNextAction,
        confidence: triageResult.confidence,
        reasoning: triageResult.reasoning,
        recommendedTeam: triageResult.recommendedTeam,
      };

      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (!res.ok) throw new Error("Failed to save to database");
      
      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!formData.title || !formData.description) return; // Simple validation block
    
    setAiState("analyzing");
    try {
      const aiCategory = formData.category === "other" ? formData.customCategory : formData.category;
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, category: aiCategory }),
      });

      if (!res.ok) throw new Error("Failed to analyze");
      const result = await res.json();
      setTriageResult(result);
      setAiState("success");
    } catch (e) {
      setAiState("error");
    }
  };

  const resetForm = () => {
    setAiState("idle");
    setTriageResult(null);
    setLocationQuery("");
    setSelectedLabel("");
    setSuggestions([]);
    setShowSuggestions(false);
    setGeocodeStatus("idle");
    setLocationSource("none");
    setFormData({
      title: "",
      category: "",
      customCategory: "",
      urgency: "moderate",
      description: "",
      location: "",
      lat: null as number | null,
      lng: null as number | null,
      peopleAffected: "",
    });
  };

  /* --- Location preview status message --- */
  const getLocationPreviewMessage = () => {
    if (geocodeStatus === "loading") return "Resolving location…";
    if (geocodeStatus === "failed") return "Could not resolve that location. Try a more specific address or pick from suggestions.";
    if (!locationQuery.trim()) return "Search for a location or use your current position to preview it on the map";
    if (!formData.lat || !formData.lng) return "Press Enter or pick a suggestion to resolve the location";
    return null; // coords exist, show the map
  };

  const previewMessage = getLocationPreviewMessage();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Report an Incident</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Submit crucial details to the command centre. Our system will analyze the payload for immediate triage routing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Form Definition */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm relative overflow-visible flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>

          <form className="space-y-6 flex-1" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" /> Core Information
              </h2>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Incident Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  disabled={aiState !== "idle"}
                  placeholder="e.g. Structural fire on main ave" 
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category Filter</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    disabled={aiState !== "idle"}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="" disabled>Select...</option>
                    <option value="flood">Flood</option>
                    <option value="fire">Fire</option>
                    <option value="hazard">Hazard</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Est. People Affected</label>
                  <input 
                    type="number"
                    value={formData.peopleAffected}
                    onChange={(e) => setFormData({...formData, peopleAffected: e.target.value})}
                    disabled={aiState !== "idle"}
                    placeholder="Approx count" 
                    className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                {formData.category === "other" && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Custom Category</label>
                    <input 
                      type="text"
                      value={formData.customCategory}
                      onChange={(e) => setFormData({...formData, customCategory: e.target.value})}
                      disabled={aiState !== "idle"}
                      placeholder="e.g. Chemical Leak, Road Accident..." 
                      className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Incident Location</label>
                  <button 
                    type="button" 
                    onClick={handleDetectLocation}
                    disabled={detectingLocation || aiState !== "idle"}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    {detectingLocation ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                    {detectingLocation ? "Detecting..." : "Use my current location"}
                  </button>
                </div>

                {/* Location input with autocomplete */}
                <div className="relative" style={{ zIndex: 100 }}>
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
                      disabled={aiState !== "idle"}
                      placeholder="Search specific address, facility, or intersection..." 
                      className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 pr-10"
                    />
                    <div className="absolute right-3 top-2.5">
                      {isSearching || geocodeStatus === "loading" ? (
                        <RotateCw className="w-5 h-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Search className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </div>

                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full left-0 w-full mt-1 bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
                      style={{ zIndex: 9999, maxHeight: "240px", overflowY: "auto" }}
                    >
                      {suggestions.map((s, i) => (
                        <div 
                          key={s.place_id || i}
                          className="px-3 py-2.5 text-sm hover:bg-secondary cursor-pointer border-b border-border/50 last:border-0 transition-colors flex items-start gap-2"
                          onMouseDown={(e) => {
                            // Use onMouseDown instead of onClick so it fires before onBlur
                            e.preventDefault();
                            handleSelectSuggestion(s);
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{s.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolved location badge */}
                {formData.lat && formData.lng && geocodeStatus === "success" && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 animate-in fade-in duration-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      Location resolved
                      {locationSource === "browser" && " (from browser)"}
                      {locationSource === "custom" && " (geocoded)"}
                      {locationSource === "suggestion" && " (selected)"}
                      {" · "}
                      {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                    </span>
                  </div>
                )}

                {/* Map preview or placeholder */}
                {formData.lat && formData.lng ? (
                  <div className="pt-1 animate-in fade-in zoom-in duration-300">
                    <MiniMap lat={formData.lat} lng={formData.lng} />
                  </div>
                ) : (
                  <div className="w-full h-24 border border-dashed border-border rounded-xl bg-card/30 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
                    {geocodeStatus === "loading" ? (
                      <span className="flex items-center gap-2">
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        Resolving location…
                      </span>
                    ) : geocodeStatus === "failed" ? (
                      <span className="text-destructive-foreground/70">
                        Could not resolve that location — try a more specific address
                      </span>
                    ) : (
                      previewMessage
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Detailed Description</label>
                <textarea 
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  disabled={aiState !== "idle"}
                  placeholder="Provide all relevant situational environment details..." 
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              {aiState === "idle" || aiState === "error" ? (
                <button 
                  onClick={handleAnalyze}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-md focus:outline-none"
                >
                  <BrainCircuit className="w-5 h-5" /> Analyze Payload
                </button>
              ) : (
                <button 
                  onClick={resetForm}
                  className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-all shadow-md focus:outline-none"
                >
                  <RotateCw className="w-5 h-5" /> New Report
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: AI Triage Output */}
        <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden text-sm">
          <div className="bg-muted/30 border-b border-border p-4 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" /> Triage Engine Output
            </h2>
            {aiState === "analyzing" && <RotateCw className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="p-6 flex-1 flex flex-col">
            {aiState === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-60">
                <BrainCircuit className="w-12 h-12 mb-3" />
                <p>Awaiting raw incident payload...</p>
              </div>
            )}

            {aiState === "analyzing" && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <RotateCw className="w-10 h-10 mb-4 animate-spin text-primary" />
                <p className="font-medium animate-pulse">Running Gemini Inference...</p>
                <p className="text-xs mt-2">Analyzing with Gemini AI triage engine</p>
              </div>
            )}

            {aiState === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center text-destructive">
                <X className="w-10 h-10 mb-3" />
                <p className="font-medium">Inference Architecture Unavailable</p>
                <p className="text-xs mt-1 text-muted-foreground">Check connection parameters and try again.</p>
              </div>
            )}

            {aiState === "success" && triageResult && (
              <div className="space-y-5 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{triageResult.summary}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <SeverityBadge zone={triageResult.zone} />
                      <span className="bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded text-xs font-semibold">
                        Score: {triageResult.severityScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-3xl font-bold text-primary">{triageResult.confidence}%</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Confidence</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Reasoning Engine</p>
                    <p className="text-sm bg-secondary/30 p-3 rounded-md border border-border/50 text-foreground/90 italic">
                      &quot;{triageResult.reasoning}&quot;
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-input rounded-md p-3">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Required Teams</p>
                      <p className="font-medium mt-1">{triageResult.recommendedTeam}</p>
                    </div>
                    <div className="bg-input rounded-md p-3">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Estimated Scope</p>
                      <p className="font-medium mt-1">{triageResult.estimatedPeopleAffected} individuals</p>
                    </div>
                  </div>
                  
                  <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Best Next Action</p>
                    <p className="font-medium text-primary-foreground">{triageResult.bestNextAction}</p>
                  </div>
                </div>

                {!submitSuccess ? (
                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? "Routing..." : "Approve & Route"}
                    </button>
                    <button className="px-4 border border-border rounded-lg hover:bg-secondary font-medium transition-colors">
                      Edit JSON
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 mt-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
                    <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-500">Payload successfully dispatched.</p>
                      <p className="text-xs text-muted-foreground mt-0.5">The incident has been broadcast to the global queue and map array.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-emerald-500 animate-[pulse_1s_ease-in-out_infinite]" />
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
