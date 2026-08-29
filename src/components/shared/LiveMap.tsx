"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import { Incident } from "@/types/incident";
import { RankedOperationalResource } from "@/types/investigation";
import { useMapConfig } from "@/hooks/useMapConfig";
import "leaflet/dist/leaflet.css";

interface LiveMapProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
  showLayerControls?: boolean;
}

function MapController({ selectedIncident }: { selectedIncident: Incident | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedIncident && selectedIncident.lat && selectedIncident.lng) {
      map.setView([selectedIncident.lat, selectedIncident.lng], 14, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedIncident, map]);
  return null;
}

export default function LiveMap({
  incidents,
  selectedIncident,
  onSelectIncident,
  showLayerControls = true,
}: LiveMapProps) {
  const defaultCenter: L.LatLngTuple = [20.5937, 78.9629]; // India center baseline
  const defaultZoom = 5;

  const { tileUrl } = useMapConfig();

  // Layer Visibility State
  const [layers, setLayers] = useState({
    incidents: true,
    fire: true,
    medical: true,
    police: true,
    utility: true,
    publicWorks: true,
  });

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Custom DivIcon for Incidents
  const createIncidentMarker = (incident: Incident, isSelected: boolean) => {
    const colors = {
      red: "bg-red-500 shadow-red-500/50",
      amber: "bg-amber-500 shadow-amber-500/50",
      green: "bg-emerald-500 shadow-emerald-500/50",
    };

    const pulseClass =
      incident.zone === "red"
        ? "animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_18px_rgba(239,68,68,0.8)] scale-110 z-40"
        : "shadow-md";
    const selectedClass = isSelected
      ? "ring-4 ring-primary border-primary shadow-[0_0_24px_rgba(59,130,246,0.7)] scale-125 z-50"
      : "border-background";

    const htmlString = `
      <div class="relative w-full h-full flex items-center justify-center">
        <div class="w-4 h-4 rounded-full border-2 ${selectedClass} ${colors[incident.zone]} ${pulseClass} transition-all duration-300"></div>
      </div>
    `;

    return L.divIcon({
      html: htmlString,
      className: "custom-leaflet-marker",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14],
    });
  };

  // Custom DivIcon for Resources
  const createResourceMarker = (resource: RankedOperationalResource) => {
    const isRecommended = resource.isPrimaryRecommendation;
    let bg = "bg-amber-500/90";
    let symbol = "⚡";
    let ringColor = "ring-amber-400";

    if (resource.category === "fire") {
      bg = "bg-orange-600/95";
      symbol = "🚒";
      ringColor = "ring-orange-400";
    } else if (resource.category === "medical") {
      bg = "bg-emerald-600/95";
      symbol = "🏥";
      ringColor = "ring-emerald-400";
    } else if (resource.category === "police") {
      bg = "bg-blue-600/95";
      symbol = "🚔";
      ringColor = "ring-blue-400";
    } else if (resource.category === "public_works") {
      bg = "bg-yellow-600/95";
      symbol = "🏗️";
      ringColor = "ring-yellow-400";
    }

    const starBadge = isRecommended
      ? `<span class="bg-primary text-white text-[8px] font-bold px-1 rounded-full">★ TOP</span>`
      : "";

    const htmlString = `
      <div class="flex items-center gap-1 bg-card/95 backdrop-blur-md text-foreground px-1.5 py-0.5 rounded-full border ${
        isRecommended ? "border-primary shadow-[0_0_12px_rgba(59,130,246,0.5)] scale-110 z-40" : "border-border/80 opacity-80"
      } shadow-md transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-115 transition-all">
        <div class="w-5 h-5 rounded-full ${bg} flex items-center justify-center text-[10px] text-white font-bold ring-1 ${ringColor}">
          ${symbol}
        </div>
        <span class="text-[10px] font-bold font-mono text-muted-foreground">${resource.distanceKm}km</span>
        ${starBadge}
      </div>
    `;

    return L.divIcon({
      html: htmlString,
      className: "custom-resource-marker",
      iconSize: [70, 24],
      iconAnchor: [35, 12],
    });
  };

  // Extract selected incident resources and primary recommendations
  const activeResources: RankedOperationalResource[] = selectedIncident?.resources || [];
  const primaryRecommendations = activeResources.filter((r) => r.isPrimaryRecommendation);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-border shadow-inner z-0 flex flex-col">
      {/* Floating Layer Controls */}
      {showLayerControls && (
        <div className="absolute top-3 right-3 z-[800] bg-card/90 backdrop-blur-md border border-border rounded-lg p-2 shadow-xl flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="text-[10px] uppercase font-bold text-muted-foreground px-1">Layers:</span>
          <button
            type="button"
            onClick={() => toggleLayer("incidents")}
            className={`px-2 py-1 rounded-md border text-[11px] transition-all cursor-pointer ${
              layers.incidents ? "bg-primary/20 text-primary border-primary/40" : "bg-muted/40 text-muted-foreground border-transparent"
            }`}
          >
            Incidents ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => toggleLayer("fire")}
            className={`px-2 py-1 rounded-md border text-[11px] transition-all cursor-pointer ${
              layers.fire ? "bg-orange-500/20 text-orange-400 border-orange-500/40" : "bg-muted/40 text-muted-foreground border-transparent"
            }`}
          >
            🚒 Fire
          </button>
          <button
            type="button"
            onClick={() => toggleLayer("medical")}
            className={`px-2 py-1 rounded-md border text-[11px] transition-all cursor-pointer ${
              layers.medical ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-muted/40 text-muted-foreground border-transparent"
            }`}
          >
            🏥 Medical
          </button>
          <button
            type="button"
            onClick={() => toggleLayer("utility")}
            className={`px-2 py-1 rounded-md border text-[11px] transition-all cursor-pointer ${
              layers.utility ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "bg-muted/40 text-muted-foreground border-transparent"
            }`}
          >
            ⚡ Utilities
          </button>
          <button
            type="button"
            onClick={() => toggleLayer("police")}
            className={`px-2 py-1 rounded-md border text-[11px] transition-all cursor-pointer ${
              layers.police ? "bg-blue-500/20 text-blue-400 border-blue-500/40" : "bg-muted/40 text-muted-foreground border-transparent"
            }`}
          >
            🚔 Police
          </button>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />

        <MapController selectedIncident={selectedIncident} />

        {/* Selected Incident Search Radius Circle */}
        {selectedIncident && selectedIncident.lat && selectedIncident.lng && (
          <Circle
            center={[selectedIncident.lat, selectedIncident.lng]}
            radius={8000} // 8km tactical perimeter
            pathOptions={{
              color: selectedIncident.zone === "red" ? "#ef4444" : "#f59e0b",
              fillColor: selectedIncident.zone === "red" ? "#ef4444" : "#f59e0b",
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: "4, 6",
            }}
          />
        )}

        {/* Single-Vector Tactical Relationship Lines (Connecting Incident to Top Recommendation per Capability) */}
        {selectedIncident &&
          selectedIncident.lat &&
          selectedIncident.lng &&
          primaryRecommendations.map((rec) => {
            if (!rec.lat || !rec.lng) return null;
            const lineColor = rec.category === "fire" ? "#f97316" : rec.category === "medical" ? "#10b981" : "#3b82f6";
            return (
              <Polyline
                key={`vector-${rec.id}`}
                positions={[
                  [selectedIncident.lat, selectedIncident.lng],
                  [rec.lat, rec.lng],
                ]}
                pathOptions={{
                  color: lineColor,
                  weight: 2,
                  dashArray: "6, 8",
                  opacity: 0.85,
                }}
              />
            );
          })}

        {/* Incident Markers */}
        {layers.incidents &&
          incidents.map((incident) => {
            if (!incident.lat || !incident.lng) return null;
            const isSelected = selectedIncident?.id === incident.id;

            return (
              <Marker
                key={incident.id}
                position={[incident.lat, incident.lng]}
                icon={createIncidentMarker(incident, isSelected)}
                eventHandlers={{
                  click: () => onSelectIncident(incident),
                }}
              >
                <Popup className="dark-popup">
                  <div className="p-1 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="uppercase font-bold tracking-wider text-muted-foreground text-[10px]">
                        {incident.category.replace("_", " ")}
                      </span>
                      <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-secondary">
                        {incident.severityScore}/100
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground leading-tight">{incident.title}</h4>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-[220px] line-clamp-2">
                      {incident.summary}
                    </p>
                    <div className="pt-1 border-t border-border flex items-center justify-between text-[10px]">
                      <span className="text-primary font-mono">{incident.confidence}% Confidence</span>
                      <span className="text-muted-foreground">{incident.peopleAffected} Impacted</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Active Discovered Resources for Selected Incident */}
        {selectedIncident &&
          activeResources.map((res) => {
            if (!res.lat || !res.lng) return null;

            // Check layer filter
            if (res.category === "fire" && !layers.fire) return null;
            if (res.category === "medical" && !layers.medical) return null;
            if (res.category === "police" && !layers.police) return null;
            if (res.category === "utility" && !layers.utility) return null;
            if (res.category === "public_works" && !layers.publicWorks) return null;

            return (
              <Marker key={`res-${res.id}`} position={[res.lat, res.lng]} icon={createResourceMarker(res)}>
                <Popup className="dark-popup">
                  <div className="p-1.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground">{res.name}</span>
                      <span className="font-mono text-[10px] text-primary font-bold">{res.distanceKm} km</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Source: {res.source}</p>
                    {res.contact.phone ? (
                      <a
                        href={`tel:${res.contact.phone}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline"
                      >
                        📞 Call {res.contact.phone}
                      </a>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">Contact unmapped</p>
                    )}
                    {res.contact.website && (
                      <a
                        href={res.contact.website}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[10px] text-primary hover:underline"
                      >
                        🌐 Open Portal
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
