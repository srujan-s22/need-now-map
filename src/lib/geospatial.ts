import { ResourceCapability, TriageEvidence, TriageEvidenceType } from "@/types/investigation";

const USER_AGENT = "NeedNowMap/0.2.0 (Civic Emergency Command Platform; contact: emergency-triage@neednow.local)";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

// In-Memory 5-minute Spatial Cache for high-performance repeat queries
interface CacheEntry {
  timestamp: number;
  evidence: TriageEvidence[];
}
const geospatialCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

function buildCapabilityOverpassQuery(
  lat: number,
  lng: number,
  capabilities: ResourceCapability[],
  radiusMeters: number
): string {
  const clauses: string[] = [];
  const handled = new Set<string>();

  for (const cap of capabilities) {
    if (cap === "fire_suppression" || cap === "heavy_extrication_usar" || cap === "hazmat_containment") {
      if (!handled.has("fire")) {
        handled.add("fire");
        clauses.push(`node["amenity"="fire_station"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`way["amenity"="fire_station"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`node["emergency"="rescue_station"](around:${radiusMeters}, ${lat}, ${lng});`);
      }
    } else if (cap === "trauma_care" || cap === "ems_transport" || cap === "critical_facility_backup") {
      if (!handled.has("medical")) {
        handled.add("medical");
        clauses.push(`node["amenity"="hospital"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`way["amenity"="hospital"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`node["emergency"="ambulance_station"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`node["amenity"="clinic"](around:${radiusMeters}, ${lat}, ${lng});`);
      }
    } else if (cap === "swift_water_rescue") {
      if (!handled.has("water_rescue")) {
        handled.add("water_rescue");
        clauses.push(`node["emergency"="water_rescue"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`node["amenity"="fire_station"](around:${radiusMeters}, ${lat}, ${lng});`);
      }
    } else if (cap === "traffic_perimeter" || cap === "evacuation_support") {
      if (!handled.has("police")) {
        handled.add("police");
        clauses.push(`node["amenity"="police"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`way["amenity"="police"](around:${radiusMeters}, ${lat}, ${lng});`);
      }
    } else if (cap === "power_grid_isolation") {
      if (!handled.has("power")) {
        handled.add("power");
        clauses.push(`node["power"="substation"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`way["power"="substation"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`node["power"="transformer"](around:${radiusMeters}, ${lat}, ${lng});`);
      }
    } else if (cap === "gas_grid_isolation") {
      if (!handled.has("gas")) {
        handled.add("gas");
        clauses.push(`node["man_made"="gasometer"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`node["pipeline"="gas"](around:${radiusMeters}, ${lat}, ${lng});`);
      }
    } else if (cap === "water_grid_isolation") {
      if (!handled.has("water_grid")) {
        handled.add("water_grid");
        clauses.push(`node["office"="water_utility"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`node["man_made"="water_works"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`node["utility"="water"](around:${radiusMeters}, ${lat}, ${lng});`);
      }
    } else if (cap === "public_works_clearing") {
      if (!handled.has("public_works")) {
        handled.add("public_works");
        clauses.push(`node["government"="public_works"](around:${radiusMeters}, ${lat}, ${lng});`);
        clauses.push(`node["landuse"="depot"](around:${radiusMeters}, ${lat}, ${lng});`);
      }
    }
  }

  // If clauses empty, default to general emergency
  if (clauses.length === 0) {
    clauses.push(`node["amenity"="fire_station"](around:${radiusMeters}, ${lat}, ${lng});`);
    clauses.push(`node["amenity"="hospital"](around:${radiusMeters}, ${lat}, ${lng});`);
  }

  return `
    [out:json][timeout:12];
    (
      ${clauses.join("\n      ")}
    );
    out center 25;
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
    const amenity = tags.amenity || tags.emergency || tags.power || tags.office || tags.government || tags.man_made || "facility";

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
    } else if (amenity === "substation" || amenity === "transformer") {
      type = "hazard";
      defaultPrefix = "Power Grid Substation";
    } else if (amenity === "gasometer" || tags.pipeline === "gas") {
      type = "hazard";
      defaultPrefix = "Gas Infrastructure Facility";
    } else if (amenity === "water_utility" || amenity === "water_works" || tags.utility === "water") {
      type = "water_utility";
      defaultPrefix = "Municipal Water Utility Depot";
    } else if (amenity === "public_works" || tags.landuse === "depot") {
      type = "public_works";
      defaultPrefix = "Public Works Response Depot";
    }

    const name =
      tags.name ||
      tags["name:en"] ||
      tags.operator ||
      tags["addr:street"]
        ? `${defaultPrefix} (${tags["addr:street"] || tags.name})`
        : `${defaultPrefix} #${el.id}`;

    const distanceKm = calculateHaversineDistanceKm(originLat, originLng, lat, lng);

    // Extract Contact Telemetry with exact field provenance
    const phone = tags["contact:phone"] || tags.phone || tags["contact:mobile"];
    const phoneSource = tags["contact:phone"] ? "OSM:contact:phone" : tags.phone ? "OSM:phone" : tags["contact:mobile"] ? "OSM:contact:mobile" : undefined;

    const website = tags["contact:website"] || tags.website || tags.url;
    const websiteSource = tags["contact:website"] ? "OSM:contact:website" : tags.website ? "OSM:website" : tags.url ? "OSM:url" : undefined;

    const address = tags["addr:full"] || [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(", ");
    const addressSource = tags["addr:full"] ? "OSM:addr:full" : tags["addr:street"] ? "OSM:addr:street" : undefined;

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
      details: tags["addr:full"] || tags["addr:street"] || tags.operator || "Mapped civic asset",
      phone,
      phoneSource,
      website,
      websiteSource,
      address,
      addressSource,
      openingHours: tags.opening_hours,
      operator: tags.operator,
      metadata: {
        osmId: el.id,
        osmType: el.type,
        amenity,
      },
    });
  }

  return results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
}

/**
 * Execute real Overpass API search for required capabilities around incident coordinates.
 */
export async function searchNearbyCapabilities(
  lat: number,
  lng: number,
  capabilities: ResourceCapability[],
  radiusKm: number = 10
): Promise<{ evidence: TriageEvidence[]; success: boolean; error?: string }> {
  const boundedRadiusKm = Math.min(20, Math.max(2, radiusKm));
  const radiusMeters = boundedRadiusKm * 1000;
  const queryTimestamp = new Date().toISOString();

  if (capabilities.length === 0) {
    return { evidence: [], success: true };
  }

  // Check 5-minute spatial cache (4 decimals ~ 11m precision)
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${boundedRadiusKm},${capabilities.sort().join(";")}`;
  const cached = geospatialCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { evidence: cached.evidence, success: true };
  }

  const query = buildCapabilityOverpassQuery(lat, lng, capabilities, radiusMeters);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8.0s resilient timeout

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
        // Cache result
        geospatialCache.set(cacheKey, { timestamp: Date.now(), evidence });
        return { evidence, success: true };
      }
    } catch (err: unknown) {
      // Failover to next mirror
    }
  }

  return {
    evidence: [],
    success: false,
    error: "No matching resources were returned by the queried OSM tags within search radius.",
  };
}

/**
 * Backward-compatible wrapper for legacy callers.
 */
export async function searchNearbyInfrastructure(
  lat: number,
  lng: number,
  searchTypes: TriageEvidenceType[],
  radiusKm: number = 10
): Promise<{ evidence: TriageEvidence[]; success: boolean; error?: string }> {
  // Map searchTypes to capabilities
  const caps: ResourceCapability[] = [];
  for (const t of searchTypes) {
    if (t === "fire_station") caps.push("fire_suppression");
    else if (t === "hospital") caps.push("trauma_care");
    else if (t === "police_station") caps.push("traffic_perimeter");
    else if (t === "hazard") caps.push("power_grid_isolation");
    else if (t === "water_utility") caps.push("water_grid_isolation");
    else if (t === "public_works") caps.push("public_works_clearing");
    else caps.push("fire_suppression");
  }
  return searchNearbyCapabilities(lat, lng, caps, radiusKm);
}
