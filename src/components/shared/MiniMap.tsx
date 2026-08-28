"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import { TriageEvidence } from "@/types/investigation";
import "leaflet/dist/leaflet.css";

interface MiniMapProps {
  lat: number;
  lng: number;
  activeSearchRadiusKm?: number | null;
  activeSearchType?: string | null;
  evidenceItems?: TriageEvidence[];
  heightClassName?: string;
}

function MapViewController({
  lat,
  lng,
  evidenceItems,
  activeSearchRadiusKm,
}: {
  lat: number;
  lng: number;
  evidenceItems?: TriageEvidence[];
  activeSearchRadiusKm?: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (evidenceItems && evidenceItems.length > 0) {
      const validPoints = evidenceItems
        .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
        .map((e) => [e.lat!, e.lng!] as [number, number]);

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds([[lat, lng], ...validPoints]);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14, animate: true });
        return;
      }
    }

    if (activeSearchRadiusKm && activeSearchRadiusKm > 0) {
      const radiusMeters = activeSearchRadiusKm * 1000;
      const circleBounds = L.latLng(lat, lng).toBounds(radiusMeters * 2);
      map.fitBounds(circleBounds, { padding: [20, 20], maxZoom: 14, animate: true });
      return;
    }

    map.flyTo([lat, lng], 14, { duration: 1.2 });
  }, [lat, lng, evidenceItems, activeSearchRadiusKm, map]);

  return null;
}

export default function MiniMap({
  lat,
  lng,
  activeSearchRadiusKm,
  activeSearchType,
  evidenceItems = [],
  heightClassName = "h-56",
}: MiniMapProps) {
  const position: L.LatLngTuple = [lat, lng];

  // Primary Incident Marker
  const incidentIcon = L.divIcon({
    html: `
      <div class="relative w-full h-full flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-red-500/20 animate-ping"></div>
        <div class="w-4 h-4 rounded-full border-2 border-background ring-4 ring-red-500 bg-red-500 shadow-lg scale-125 z-50"></div>
      </div>
    `,
    className: "custom-leaflet-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Helper for evidence icons
  const createEvidenceIcon = (type: string, distanceKm?: number) => {
    let bg = "bg-amber-500/90";
    let symbol = "⚡";
    let ringColor = "ring-amber-400";

    if (type === "fire_station") {
      bg = "bg-orange-600/95";
      symbol = "🚒";
      ringColor = "ring-orange-400";
    } else if (type === "hospital") {
      bg = "bg-emerald-600/95";
      symbol = "🏥";
      ringColor = "ring-emerald-400";
    } else if (type === "police_station") {
      bg = "bg-blue-600/95";
      symbol = "🚔";
      ringColor = "ring-blue-400";
    }

    const distLabel = distanceKm !== undefined ? `${distanceKm} km` : "";

    const htmlString = `
      <div class="flex items-center gap-1 bg-card/90 backdrop-blur-md text-foreground px-1.5 py-0.5 rounded-full border border-border/80 shadow-md transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
        <div class="w-5 h-5 rounded-full ${bg} flex items-center justify-center text-[10px] text-white font-bold ring-1 ${ringColor}">
          ${symbol}
        </div>
        <span class="text-[10px] font-bold font-mono pr-1 text-muted-foreground">${distLabel}</span>
      </div>
    `;

    return L.divIcon({
      html: htmlString,
      className: "custom-evidence-marker",
      iconSize: [60, 24],
      iconAnchor: [30, 12],
    });
  };

  // Search radius color styling
  const radiusColor = activeSearchType === "fire_station"
    ? "#f97316"
    : activeSearchType === "hospital"
    ? "#10b981"
    : activeSearchType === "police_station"
    ? "#3b82f6"
    : "#eab308";

  return (
    <div className={`w-full ${heightClassName} rounded-xl overflow-hidden border border-border shadow-inner relative z-0`}>
      <MapContainer
        center={position}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapViewController
          lat={lat}
          lng={lng}
          evidenceItems={evidenceItems}
          activeSearchRadiusKm={activeSearchRadiusKm}
        />

        {/* Search Radius Circle Overlay */}
        {activeSearchRadiusKm && activeSearchRadiusKm > 0 && (
          <Circle
            center={position}
            radius={activeSearchRadiusKm * 1000}
            pathOptions={{
              color: radiusColor,
              fillColor: radiusColor,
              fillOpacity: 0.1,
              weight: 1.5,
              dashArray: "4, 6",
            }}
          />
        )}

        {/* Primary Incident Marker */}
        <Marker position={position} icon={incidentIcon}>
          <Popup className="dark-popup">
            <div className="text-xs p-1">
              <p className="font-bold text-foreground">Incident Origin</p>
              <p className="text-muted-foreground">{lat.toFixed(4)}, {lng.toFixed(4)}</p>
            </div>
          </Popup>
        </Marker>

        {/* Discovered Real Evidence Markers */}
        {evidenceItems.map((item) => {
          if (item.lat === undefined || item.lng === undefined) return null;
          return (
            <Marker
              key={item.id}
              position={[item.lat, item.lng]}
              icon={createEvidenceIcon(item.type, item.distanceKm)}
            >
              <Popup className="dark-popup">
                <div className="text-xs p-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground text-xs">{item.name}</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {item.distanceKm} km away
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Source: {item.source}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-mono">
                    {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
