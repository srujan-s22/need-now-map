import { IncidentCategory, SeverityZone, UrgencyLevel } from "./incident";

export type LocationQuality = "exact_gps" | "resolved_address" | "approximate_city" | "unresolved";

export type InvestigationStepType =
  | "parsing"
  | "location"
  | "planning"
  | "fire_station_search"
  | "hospital_search"
  | "police_search"
  | "hazard_search"
  | "emergency_resource_search"
  | "evidence_normalization"
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
  metadata?: Record<string, unknown>;
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
      searchType: "fire_station" | "hospital" | "police_station" | "hazard" | "emergency_resource";
      center: { lat: number; lng: number };
      radiusKm: number;
      label: string;
    }
  | {
      event: "evidence_found";
      evidence: TriageEvidence;
    }
  | {
      event: "search_completed";
      searchType: string;
      itemsFound: number;
      nearestDistanceKm: number | null;
      source: string;
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
