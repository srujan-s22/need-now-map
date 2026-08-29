import { IncidentCategory, SeverityZone, UrgencyLevel } from "./incident";

export type LocationQuality = "exact_gps" | "resolved_address" | "approximate_city" | "unresolved";

export type ResourceCapability =
  | "fire_suppression"
  | "heavy_extrication_usar"
  | "hazmat_containment"
  | "trauma_care"
  | "ems_transport"
  | "swift_water_rescue"
  | "traffic_perimeter"
  | "evacuation_support"
  | "power_grid_isolation"
  | "gas_grid_isolation"
  | "water_grid_isolation"
  | "public_works_clearing"
  | "critical_facility_backup";

export type ResourceType =
  | "fire_station"
  | "hospital"
  | "ambulance_station"
  | "police_station"
  | "rescue_station"
  | "water_rescue_station"
  | "power_substation"
  | "power_transformer"
  | "gas_pipeline"
  | "gasometer"
  | "water_works"
  | "water_utility"
  | "public_works_depot"
  | "hospital_facility"
  | "emergency_resource";

export type InvestigationStepType =
  | "parsing"
  | "location"
  | "planning"
  | "fire_station_search"
  | "hospital_search"
  | "police_search"
  | "hazard_search"
  | "water_utility_search"
  | "public_works_search"
  | "emergency_resource_search"
  | "evidence_normalization"
  | "resource_ranking"
  | "quality_assessment"
  | "triage_reasoning"
  | "confidence_calculation"
  | "complete"
  | "error";

export interface InvestigationStep {
  id: string;
  type: InvestigationStepType;
  status: "pending" | "running" | "completed" | "failed" | "degraded";
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type TriageEvidenceType =
  | "fire_station"
  | "hospital"
  | "police_station"
  | "hazard"
  | "emergency_resource"
  | "water_utility"
  | "public_works"
  | "location"
  | "population";

export interface TriageEvidence {
  id: string;
  type: TriageEvidenceType;
  name: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  relevance: number; // 0.0 to 1.0
  source: string; // e.g. "OpenStreetMap / Overpass API", "GPS Hardware"
  queryStage: InvestigationStepType;
  timestamp: string;
  details?: string;
  phone?: string;
  phoneSource?: string;
  website?: string;
  websiteSource?: string;
  address?: string;
  addressSource?: string;
  openingHours?: string;
  operator?: string;
  metadata?: Record<string, unknown>;
}

export interface RankedOperationalResource {
  id: string;
  type: ResourceType;
  entityKind: "emergency_response" | "contextual_infrastructure";
  primaryCapability: ResourceCapability;
  category: "fire" | "medical" | "police" | "utility" | "public_works" | "rescue" | "hazard";
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  relevanceScore: number; // 0-100 calculated deterministically
  rank: number; // 1 = Top Recommended
  isPrimaryRecommendation: boolean;

  usability: {
    hasDirectPhone: boolean;
    hasWebsite: boolean;
    hasPhysicalAddress: boolean;
    has24x7OpeningHoursTag: boolean;
    specializedCapabilityVerified: boolean;
    capabilityVerificationNote?: string;
  };

  contact: {
    phone?: string;
    phoneSource?: string;
    website?: string;
    websiteSource?: string;
    address?: string;
    addressSource?: string;
    operator?: string;
    openingHours?: string;
  };

  source: "OpenStreetMap / Overpass API";
  retrievedAt: string; // ISO Timestamp
  recommendationReason: string[];
}

export interface ConfidenceFactor {
  label: string;
  impact: "positive" | "negative" | "neutral";
  weightScore: number;
  explanation: string;
}

export interface ConfidenceBreakdown {
  classification: number; // 0–100
  severity: number; // 0–100
  evidence: number; // 0–100
  location: number; // 0–100
  overall: number; // 0–100 (deterministic weighted result)
  formula: string;
  factors: ConfidenceFactor[];
}

export interface ContradictionRecord {
  field: string;
  reportedValue: string | number;
  narrativeIndicatedValue: string | number;
  operationallyConsideredValue: string | number;
  explanation: string;
}

export interface ConfidenceEngineInput {
  title: string;
  description: string;
  category: IncidentCategory;
  locationQuality: LocationQuality;
  requiredCapabilities: ResourceCapability[];
  capabilityCorroboration: Array<{
    capability: ResourceCapability;
    queryExecuted: boolean;
    resourcesFoundCount: number;
    nearestDistanceKm: number | null;
    corroborationStrength: "strong" | "moderate" | "weak" | "unavailable";
  }>;
  evidence: TriageEvidence[];
  rankedResources: RankedOperationalResource[];
  missingEvidence: string[];
  contradictions: ContradictionRecord[];
  isDegradedMode?: boolean;
}

export interface EvidenceBasedTriageResponse {
  category: IncidentCategory;
  severityScore: number; // 0–100
  zone: SeverityZone; // "red" | "amber" | "green"
  urgency: UrgencyLevel; // "immediate" | "high" | "moderate" | "low"
  needs: string[];
  summary: string;
  bestNextAction: string;

  // Confidence & Deterministic Math
  confidence: number; // Backward-compatible alias of confidenceBreakdown.overall
  confidenceBreakdown: ConfidenceBreakdown;

  // Structured Reasoning & Clear Epistemic Distinctions
  reasoning: string;
  factsIdentified: string[];
  inferencesMade: string[];
  unknownsAcknowledged: string[];

  recommendedTeam: string;
  estimatedPeopleAffected: number;
  reportedPeopleAffected: number;

  // Investigation Telemetry & Evidence Provenance
  evidence: TriageEvidence[];
  rankedResources: RankedOperationalResource[];
  capabilitiesEvaluated: ResourceCapability[];
  missingEvidence: string[];
  contradictions: ContradictionRecord[];
  investigationSteps: InvestigationStep[];
  locationQuality: LocationQuality;

  // Mode flag
  isDegradedMode: boolean;
  degradedReason?: string;
}

export type InvestigationStreamEvent =
  | {
      event: "step_update";
      step: InvestigationStep;
    }
  | {
      event: "search_started";
      searchType: string;
      capability?: ResourceCapability;
      center: { lat: number; lng: number };
      radiusKm: number;
      label: string;
    }
  | {
      event: "evidence_found";
      evidence: TriageEvidence;
    }
  | {
      event: "resource_found";
      resource: RankedOperationalResource;
    }
  | {
      event: "search_completed";
      searchType: string;
      capability?: ResourceCapability;
      itemsFound: number;
      nearestDistanceKm: number | null;
      source: string;
    }
  | {
      event: "resource_ranked";
      capability: ResourceCapability;
      topResourceId: string;
      topResourceName: string;
      nearestDistanceKm: number;
    }
  | {
      event: "quality_assessed";
      completenessScore: number;
      missingCount: number;
      contradictionCount: number;
    }
  | {
      event: "triage_complete";
      result: EvidenceBasedTriageResponse;
    }
  | {
      event: "investigation_error";
      message: string;
      fallbackResult?: EvidenceBasedTriageResponse;
    };
