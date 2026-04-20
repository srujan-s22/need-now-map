"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Incident } from "@/types/incident";
import "leaflet/dist/leaflet.css";

// This component isolates moving the map view when an incident is selected outside the map
function MapController({ selectedIncident }: { selectedIncident: Incident | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedIncident && selectedIncident.lat && selectedIncident.lng) {
      map.setView([selectedIncident.lat, selectedIncident.lng], 15, {
        animate: true,
        duration: 0.8
      });
    }
  }, [selectedIncident, map]);
  return null;
}

interface LiveMapProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
}

export default function LiveMap({ incidents, selectedIncident, onSelectIncident }: LiveMapProps) {
  // Default center — neutral global view, auto-fits to real incident data
  const defaultCenter: L.LatLngTuple = [20.5937, 78.9629]; // India center
  const defaultZoom = 5;

  // Custom DivIcon logic to render HTML directly inside leaflet markers
  const createCustomMarker = (incident: Incident, isSelected: boolean) => {
    const colors = {
      red: "bg-red-500 shadow-red-500/50",
      amber: "bg-amber-500 shadow-amber-500/50",
      green: "bg-emerald-500 shadow-emerald-500/50",
    };

    const pulseClass = incident.zone === "red" ? "animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_15px_rgba(239,68,68,0.8)] scale-110 z-40" : "shadow-md";
    const selectedClass = isSelected ? "ring-4 ring-primary border-primary shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-125 z-50" : "border-background";

    const htmlString = `
      <div class="relative w-full h-full flex items-center justify-center">
        <div class="w-4 h-4 rounded-full border-2 ${selectedClass} ${colors[incident.zone]} ${pulseClass} transition-all duration-300"></div>
      </div>
    `;

    return L.divIcon({
      html: htmlString,
      className: "custom-leaflet-marker", // removing default icon class overhead
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14],
    });
  };

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-border shadow-inner z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        scrollWheelZoom={true} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        {/* Dark Matter Base Map (Carto) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapController selectedIncident={selectedIncident} />

        {incidents.map((incident) => {
          if (!incident.lat || !incident.lng) return null;
          const isSelected = selectedIncident?.id === incident.id;

          return (
            <Marker 
              key={incident.id} 
              position={[incident.lat, incident.lng]} 
              icon={createCustomMarker(incident, isSelected)}
              eventHandlers={{
                click: () => onSelectIncident(incident),
              }}
            >
              <Popup className="dark-popup">
                <div className="p-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">{incident.category.replace("_", " ")}</span>
                    <span className="text-xs font-semibold px-2 rounded-sm bg-secondary/50">{incident.severityScore}/100</span>
                  </div>
                  <h4 className="font-bold text-[15px] leading-tight text-foreground">{incident.title}</h4>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-[200px] truncate">{incident.summary}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
