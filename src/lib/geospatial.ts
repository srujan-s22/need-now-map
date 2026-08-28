import { TriageEvidence, TriageEvidenceType } from "@/types/investigation";

const USER_AGENT = "NeedNowMap/0.2.0 (Civic Emergency Command Platform; contact: emergency-triage@neednow.local)";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

/**
 * High-precision Haversine formula to calculate great-circle distance between two points in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildOverpassQuery(
  lat: number,
  lng: number,
  searchTypes: TriageEvidenceType[],
  radiusMeters: number
): string {
  const clauses: string[] = [];

  for (const type of searchTypes) {
    if (type === "fire_station") {
      clauses.push(`node["amenity"="fire_station"](around:${radiusMeters}, ${lat}, ${lng});`);
      clauses.push(`way["amenity"="fire_station"](around:${radiusMeters}, ${lat}, ${lng});`);
    } else if (type === "hospital") {
      clauses.push(`node["amenity"="hospital"](around:${radiusMeters}, ${lat}, ${lng});`);
      clauses.push(`way["amenity"="hospital"](around:${radiusMeters}, ${lat}, ${lng});`);
      clauses.push(`node["emergency"="ambulance_station"](around:${radiusMeters}, ${lat}, ${lng});`);
    } else if (type === "police_station") {
      clauses.push(`node["amenity"="police"](around:${radiusMeters}, ${lat}, ${lng});`);
      clauses.push(`way["amenity"="police"](around:${radiusMeters}, ${lat}, ${lng});`);
    } else if (type === "hazard") {
      clauses.push(`node["power"="substation"](around:${radiusMeters}, ${lat}, ${lng});`);
      clauses.push(`way["power"="substation"](around:${radiusMeters}, ${lat}, ${lng});`);
    } else if (type === "emergency_resource") {
      clauses.push(`node["emergency"="ambulance_station"](around:${radiusMeters}, ${lat}, ${lng});`);
      clauses.push(`node["amenity"="fire_station"](around:${radiusMeters}, ${lat}, ${lng});`);
    }
  }

  return `
    [out:json][timeout:6];
    (
      ${clauses.join("\n      ")}
    );
    out center 15;
  `;
}

function normalizeOverpassElements(
  elements: OverpassElement[],
  originLat: number,
  originLng: number,
  queryTimestamp: string
): TriageEvidence[] {
  const results: TriageEvidence[] = [];
  const seenCoordinates = new Set<string>();

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat === undefined || lng === undefined) continue;

    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seenCoordinates.has(coordKey)) continue;
    seenCoordinates.add(coordKey);

    const tags = el.tags || {};
    const amenity = tags.amenity || tags.emergency || tags.power || "facility";

    let type: TriageEvidenceType = "emergency_resource";
    let defaultPrefix = "Emergency Facility";

    if (amenity === "fire_station") {
      type = "fire_station";
      defaultPrefix = "Fire & Rescue Station";
    } else if (amenity === "hospital" || amenity === "ambulance_station" || amenity === "clinic") {
      type = "hospital";
      defaultPrefix = tags.emergency === "ambulance_station" ? "Ambulance Base" : "Hospital / Medical Center";
    } else if (amenity === "police") {
      type = "police_station";
      defaultPrefix = "Police Station";
    } else if (amenity === "substation") {
      type = "hazard";
      defaultPrefix = "Power Grid Substation";
    }

    const name =
      tags.name ||
      tags["name:en"] ||
      tags.operator ||
      tags["addr:street"]
        ? `${defaultPrefix} (${tags["addr:street"] || tags.name})`
        : `${defaultPrefix} #${el.id}`;

    const distanceKm = calculateHaversineDistanceKm(originLat, originLng, lat, lng);

    results.push({
      id: `ev-osm-${el.id}`,
      type,
      name,
      lat,
      lng,
      distanceKm,
      relevance: type === "fire_station" || type === "hospital" ? 0.9 : 0.75,
      source: "OpenStreetMap / Overpass API",
      queryStage: type === "fire_station" ? "fire_station_search" : type === "hospital" ? "hospital_search" : "emergency_resource_search",
      timestamp: queryTimestamp,
      details: tags["addr:full"] || tags["addr:street"] || tags.operator || "Mapped civic emergency asset",
      metadata: {
        osmId: el.id,
        osmType: el.type,
        amenity,
      },
    });
  }

  return results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
}

export async function searchNearbyInfrastructure(
  lat: number,
  lng: number,
  searchTypes: TriageEvidenceType[],
  radiusKm: number = 10
): Promise<{ evidence: TriageEvidence[]; success: boolean; error?: string }> {
  const boundedRadiusKm = Math.min(20, Math.max(2, radiusKm));
  const radiusMeters = boundedRadiusKm * 1000;
  const queryTimestamp = new Date().toISOString();

  if (searchTypes.length === 0) {
    return { evidence: [], success: true };
  }

  const query = buildOverpassQuery(lat, lng, searchTypes, radiusMeters);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s fast timeout

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: "data=" + encodeURIComponent(query),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawElements: OverpassElement[] = data.elements || [];
        const evidence = normalizeOverpassElements(rawElements, lat, lng, queryTimestamp);
        return { evidence, success: true };
      }
    } catch (err: unknown) {
      // Continue to next mirror endpoint
    }
  }

  return {
    evidence: [],
    success: false,
    error: "Overpass API servers were unreachable or timed out.",
  };
}
