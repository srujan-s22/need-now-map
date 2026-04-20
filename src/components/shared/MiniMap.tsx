"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

export default function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const position: L.LatLngTuple = [lat, lng];

  const markerIcon = L.divIcon({
    html: `
      <div class="relative w-full h-full flex items-center justify-center">
        <div class="w-4 h-4 rounded-full border-2 border-background ring-4 ring-primary bg-primary shadow-lg scale-125 z-50 animate-pulse transition-all duration-300"></div>
      </div>
    `,
    className: "custom-leaflet-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div className="w-full h-48 rounded-xl overflow-hidden border border-border shadow-inner z-0">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapController lat={lat} lng={lng} />
        <Marker position={position} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}
