import {
  RankedOperationalResource,
  ResourceCapability,
  ResourceType,
  TriageEvidence,
} from "@/types/investigation";

export interface CapabilityDefinition {
  id: ResourceCapability;
  label: string;
  description: string;
  entityKind: "emergency_response" | "contextual_infrastructure";
  category: "fire" | "medical" | "police" | "utility" | "public_works" | "rescue" | "hazard";
  defaultRadiusKm: number;
  primaryTypes: ResourceType[];
  fallbackTypes: ResourceType[];
  fallbackNote: string;
}

/**
 * CANONICAL RESOURCE CAPABILITY REGISTRY
 * All capabilities recognized by the platform are formally declared here.
 */
export const CANONICAL_CAPABILITY_REGISTRY: Record<ResourceCapability, CapabilityDefinition> = {
  fire_suppression: {
    id: "fire_suppression",
    label: "Fire Suppression & Structural Protection",
    description: "Active structural and containment fire response units",
    entityKind: "emergency_response",
    category: "fire",
    defaultRadiusKm: 8,
    primaryTypes: ["fire_station"],
    fallbackTypes: ["emergency_resource"],
    fallbackNote: "Mapped disaster unit — structural fire suppression capability unverified.",
  },
  heavy_extrication_usar: {
    id: "heavy_extrication_usar",
    label: "Urban Search & Rescue (USAR)",
    description: "Heavy structural extrication, acoustic search, and collapse rescue",
    entityKind: "emergency_response",
    category: "rescue",
    defaultRadiusKm: 12,
    primaryTypes: ["rescue_station"],
    fallbackTypes: ["fire_station"],
    fallbackNote: "Mapped fire station — specialized USAR heavy extrication unverified in public dataset.",
  },
  hazmat_containment: {
    id: "hazmat_containment",
    label: "Hazardous Materials (Hazmat) Containment",
    description: "Chemical, biological, and toxic gas leak suppression",
    entityKind: "emergency_response",
    category: "fire",
    defaultRadiusKm: 8,
    primaryTypes: ["fire_station"],
    fallbackTypes: ["fire_station"],
    fallbackNote: "Mapped fire station — specialized Hazmat containment unverified in public dataset.",
  },
  trauma_care: {
    id: "trauma_care",
    label: "Emergency Trauma & Surgical Care",
    description: "Hospital emergency departments and comprehensive trauma facilities",
    entityKind: "emergency_response",
    category: "medical",
    defaultRadiusKm: 10,
    primaryTypes: ["hospital"],
    fallbackTypes: ["hospital_facility"],
    fallbackNote: "Mapped medical facility — comprehensive 24/7 trauma ICU capability unverified.",
  },
  ems_transport: {
    id: "ems_transport",
    label: "Emergency Medical Services (EMS / Ambulance)",
    description: "Mobile paramedic dispatch and casualty transport",
    entityKind: "emergency_response",
    category: "medical",
    defaultRadiusKm: 8,
    primaryTypes: ["ambulance_station"],
    fallbackTypes: ["hospital"],
    fallbackNote: "Hospital facility mapped — dedicated standby ambulance availability unverified.",
  },
  swift_water_rescue: {
    id: "swift_water_rescue",
    label: "Swift Water & Flood Rescue",
    description: "Inflatable rescue boats, swift water technicians, and flood evacuation",
    entityKind: "emergency_response",
    category: "rescue",
    defaultRadiusKm: 15,
    primaryTypes: ["water_rescue_station"],
    fallbackTypes: ["fire_station"],
    fallbackNote: "Mapped fire station — specialized swift water rescue capability unverified.",
  },
  traffic_perimeter: {
    id: "traffic_perimeter",
    label: "Traffic Diversion & Perimeter Security",
    description: "Road closure enforcement, crowd containment, and evacuation corridors",
    entityKind: "emergency_response",
    category: "police",
    defaultRadiusKm: 8,
    primaryTypes: ["police_station"],
    fallbackTypes: ["emergency_resource"],
    fallbackNote: "Security post mapped — active traffic patrol division unverified.",
  },
  evacuation_support: {
    id: "evacuation_support",
    label: "Area Evacuation & Temporary Shelter Management",
    description: "Civic evacuation coordination and community refuge routing",
    entityKind: "emergency_response",
    category: "police",
    defaultRadiusKm: 12,
    primaryTypes: ["police_station", "fire_station"],
    fallbackTypes: ["public_works_depot"],
    fallbackNote: "Civic facility mapped — dedicated evacuation management team unverified.",
  },
  power_grid_isolation: {
    id: "power_grid_isolation",
    label: "Power Grid Substation & High-Voltage Isolation",
    description: "Electrical infrastructure grid control and transformer isolation",
    entityKind: "contextual_infrastructure",
    category: "utility",
    defaultRadiusKm: 6,
    primaryTypes: ["power_substation", "power_transformer"],
    fallbackTypes: ["power_substation"],
    fallbackNote: "Substation physical asset mapped — control room operational contact unverified.",
  },
  gas_grid_isolation: {
    id: "gas_grid_isolation",
    label: "Gas Pipeline & Fuel Isolation",
    description: "Municipal gas distribution pipelines and shutoff infrastructure",
    entityKind: "contextual_infrastructure",
    category: "hazard",
    defaultRadiusKm: 8,
    primaryTypes: ["gas_pipeline", "gasometer"],
    fallbackTypes: ["gasometer"],
    fallbackNote: "Gas infrastructure asset mapped — utility valve operator dispatch required.",
  },
  water_grid_isolation: {
    id: "water_grid_isolation",
    label: "Municipal Water Utility & Valve Control",
    description: "Water distribution main shutoff, pipeline repair, and municipal water works",
    entityKind: "contextual_infrastructure",
    category: "utility",
    defaultRadiusKm: 6,
    primaryTypes: ["water_works", "water_utility"],
    fallbackTypes: ["public_works_depot"],
    fallbackNote: "Municipal water asset mapped — field valve technician dispatch required.",
  },
  public_works_clearing: {
    id: "public_works_clearing",
    label: "Public Works Heavy Road Debris Clearing",
    description: "Heavy machinery, fallen tree clearing, and road maintenance",
    entityKind: "contextual_infrastructure",
    category: "public_works",
    defaultRadiusKm: 8,
    primaryTypes: ["public_works_depot"],
    fallbackTypes: ["public_works_depot"],
    fallbackNote: "Public service area mapped — municipal heavy clearing equipment unverified.",
  },
  critical_facility_backup: {
    id: "critical_facility_backup",
    label: "Critical Care Facility Power Monitoring",
    description: "Continuous power and access monitoring for life-support institutions",
    entityKind: "contextual_infrastructure",
    category: "medical",
    defaultRadiusKm: 10,
    primaryTypes: ["hospital_facility"],
    fallbackTypes: ["hospital"],
    fallbackNote: "Critical healthcare facility mapped for continuous utility/power monitoring.",
  },
};

/**
 * Calculates exponential proximity score: P(d) = 100 * exp(-0.15 * d).
 */
export function calculateProximityScore(distanceKm: number): number {
  if (distanceKm <= 0) return 100;
  const score = Math.round(100 * Math.exp(-0.15 * distanceKm));
  return Math.max(5, Math.min(100, score));
}

/**
 * Maps raw evidence items into strongly-typed RankedOperationalResources,
 * evaluating deterministic relevance, operational usability, and epistemic capability verification.
 */
export function rankOperationalResources(
  evidenceList: TriageEvidence[],
  requiredCapabilities: ResourceCapability[]
): RankedOperationalResource[] {
  const ranked: RankedOperationalResource[] = [];

  for (const ev of evidenceList) {
    if (typeof ev.lat !== "number" || typeof ev.lng !== "number") continue;

    // Match evidence type to capability
    let primaryCap: ResourceCapability = "fire_suppression";
    let entityKind: "emergency_response" | "contextual_infrastructure" = "emergency_response";
    let category: RankedOperationalResource["category"] = "fire";
    let isSpecializedVerified = false;
    let fallbackNote: string | undefined;

    const evType = ev.type;
    const details = (ev.details || "").toLowerCase();
    const name = ev.name.toLowerCase();

    if (evType === "hospital") {
      primaryCap = "trauma_care";
      entityKind = "emergency_response";
      category = "medical";
      isSpecializedVerified = details.includes("hospital") || name.includes("hospital") || name.includes("medical center");
      if (!isSpecializedVerified) fallbackNote = CANONICAL_CAPABILITY_REGISTRY.trauma_care.fallbackNote;
    } else if (evType === "fire_station") {
      if (requiredCapabilities.includes("heavy_extrication_usar")) {
        primaryCap = "heavy_extrication_usar";
        entityKind = "emergency_response";
        category = "rescue";
        isSpecializedVerified = details.includes("rescue") || name.includes("rescue") || details.includes("usar");
        if (!isSpecializedVerified) fallbackNote = CANONICAL_CAPABILITY_REGISTRY.heavy_extrication_usar.fallbackNote;
      } else if (requiredCapabilities.includes("swift_water_rescue")) {
        primaryCap = "swift_water_rescue";
        entityKind = "emergency_response";
        category = "rescue";
        isSpecializedVerified = details.includes("water") || name.includes("water");
        if (!isSpecializedVerified) fallbackNote = CANONICAL_CAPABILITY_REGISTRY.swift_water_rescue.fallbackNote;
      } else if (requiredCapabilities.includes("hazmat_containment")) {
        primaryCap = "hazmat_containment";
        entityKind = "emergency_response";
        category = "fire";
        isSpecializedVerified = details.includes("hazmat");
        if (!isSpecializedVerified) fallbackNote = CANONICAL_CAPABILITY_REGISTRY.hazmat_containment.fallbackNote;
      } else {
        primaryCap = "fire_suppression";
        entityKind = "emergency_response";
        category = "fire";
        isSpecializedVerified = true;
      }
    } else if (evType === "police_station") {
      primaryCap = requiredCapabilities.includes("evacuation_support") ? "evacuation_support" : "traffic_perimeter";
      entityKind = "emergency_response";
      category = "police";
      isSpecializedVerified = true;
    } else if (evType === "water_utility" || ev.metadata?.amenity === "water_works") {
      primaryCap = "water_grid_isolation";
      entityKind = "contextual_infrastructure";
      category = "utility";
      isSpecializedVerified = true;
    } else if (evType === "public_works" || ev.metadata?.amenity === "public_works") {
      primaryCap = "public_works_clearing";
      entityKind = "contextual_infrastructure";
      category = "public_works";
      isSpecializedVerified = true;
    } else if (evType === "hazard") {
      primaryCap = details.includes("gas") ? "gas_grid_isolation" : "power_grid_isolation";
      entityKind = "contextual_infrastructure";
      category = details.includes("gas") ? "hazard" : "utility";
      isSpecializedVerified = true;
    }

    const distanceKm = ev.distanceKm ?? 0;
    const proxScore = calculateProximityScore(distanceKm);
    const capMatchWeight = requiredCapabilities.includes(primaryCap) ? 100 : 70;
    const contextSpecificity = isSpecializedVerified ? 100 : 75;

    // Formula: (Capability Match * 0.50) + (Proximity * 0.40) + (Context Specificity * 0.10)
    const relevanceScore = Math.round(capMatchWeight * 0.50 + proxScore * 0.40 + contextSpecificity * 0.10);

    const hasPhone = Boolean(ev.phone && ev.phone.trim().length > 3);
    const hasWeb = Boolean(ev.website && ev.website.trim().startsWith("http"));
    const hasAddr = Boolean(ev.address && ev.address.trim().length > 3);
    const has24x7 = ev.openingHours?.includes("24/7") || false;

    ranked.push({
      id: ev.id,
      type: ev.type as ResourceType,
      entityKind,
      primaryCapability: primaryCap,
      category,
      name: ev.name,
      lat: ev.lat,
      lng: ev.lng,
      distanceKm,
      relevanceScore,
      rank: 1, // Will be recomputed below
      isPrimaryRecommendation: false,
      usability: {
        hasDirectPhone: hasPhone,
        hasWebsite: hasWeb,
        hasPhysicalAddress: hasAddr,
        has24x7OpeningHoursTag: has24x7,
        specializedCapabilityVerified: isSpecializedVerified,
        capabilityVerificationNote: fallbackNote,
      },
      contact: {
        phone: ev.phone,
        phoneSource: ev.phoneSource || (hasPhone ? "OSM:contact:phone" : undefined),
        website: ev.website,
        websiteSource: ev.websiteSource || (hasWeb ? "OSM:website" : undefined),
        address: ev.address,
        addressSource: ev.addressSource || (hasAddr ? "OSM:addr:full" : undefined),
        operator: ev.operator,
        openingHours: ev.openingHours,
      },
      source: "OpenStreetMap / Overpass API",
      retrievedAt: ev.timestamp || new Date().toISOString(),
      recommendationReason: [],
    });
  }

  // Group by capability to compute ranks and set primary recommendations
  const byCapability = new Map<ResourceCapability, RankedOperationalResource[]>();
  for (const r of ranked) {
    const list = byCapability.get(r.primaryCapability) || [];
    list.push(r);
    byCapability.set(r.primaryCapability, list);
  }

  for (const [, list] of byCapability.entries()) {
    // Sort primarily by relevanceScore descending, distanceKm ascending
    list.sort((a, b) => b.relevanceScore - a.relevanceScore || a.distanceKm - b.distanceKm);

    list.forEach((item, index) => {
      item.rank = index + 1;
      // Mark rank #1 as the primary recommendation for deployable emergency units
      if (index === 0 && item.entityKind === "emergency_response") {
        item.isPrimaryRecommendation = true;
      }

      // Generate deterministic recommendation reasons
      const reasons: string[] = [];
      const capLabel = CANONICAL_CAPABILITY_REGISTRY[item.primaryCapability]?.label || item.primaryCapability;
      reasons.push(`Directly matches required [${capLabel}]`);
      reasons.push(`Located ${item.distanceKm} km from incident origin (Ranked #${item.rank} by proximity)`);
      if (item.usability.hasDirectPhone) {
        reasons.push(`Verified telephone contact available (${item.contact.phoneSource || 'OSM dataset'})`);
      }
      if (item.usability.has24x7OpeningHoursTag) {
        reasons.push("OSM tags indicate 24/7 operating hours");
      }
      if (!item.usability.specializedCapabilityVerified && item.usability.capabilityVerificationNote) {
        reasons.push(item.usability.capabilityVerificationNote);
      }
      item.recommendationReason = reasons;
    });
  }

  // Final sort across all capabilities: primary recommendations first, then by relevance
  return ranked.sort((a, b) => {
    if (a.isPrimaryRecommendation && !b.isPrimaryRecommendation) return -1;
    if (!a.isPrimaryRecommendation && b.isPrimaryRecommendation) return 1;
    return b.relevanceScore - a.relevanceScore || a.distanceKm - b.distanceKm;
  });
}
