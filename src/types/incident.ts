import { ConfidenceBreakdown, ContradictionRecord, RankedOperationalResource } from "./investigation";

export type SeverityZone = "red" | "amber" | "green";
export type IncidentStatus = "new" | "reviewed" | "assigned" | "resolved";

export type IncidentCategory = 
  // Core Existing (100% Backward Compatible)
  | "flood" 
  | "fire" 
  | "road_blockage" 
  | "injury" 
  | "power_outage" 
  | "supply_shortage" 
  | "trapped_people" 
  | "medical_emergency" 
  | "hazard" 
  | "other"
  // Phase 2 Specialized Domains
  | "water_leak"           // Non-flood water infrastructure / pipe rupture
  | "water_rescue"         // Active water entrapment / swift water
  | "electrical_hazard"    // Power lines down / transformer fire / grid fault
  | "gas_leak"             // Gas main rupture / toxic vapor release
  | "structural_collapse"  // Building collapse / USAR heavy extrication
  | "industrial_hazard";   // Chemical spill / hazmat emergency

export type UrgencyLevel = "immediate" | "high" | "moderate" | "low";

export interface IncidentTimelineEvent {
  timestamp: string;
  stage: "reported" | "investigated" | "corroborated" | "assigned" | "overridden" | "resolved";
  title: string;
  description: string;
  actor: "citizen" | "ai_pipeline" | "dispatcher";
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  
  severityScore: number; // 0-100
  zone: SeverityZone;
  urgency: UrgencyLevel;
  
  needs: string[];
  summary: string;
  bestNextAction: string;
  confidence: number; // 0-100 deterministic overall confidence score
  
  status: IncidentStatus;
  
  location: string;
  lat: number;
  lng: number;
  
  reportedBy: string;
  photoURL?: string;
  
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  
  // Derived / Operational fields
  peopleAffected: number;
  reportedPeopleAffected?: number;
  responseTeam?: string;
  recommendedTeam?: string;
  assignmentHistory?: Array<{
    team: string;
    source: "ai" | "manual";
    timestamp: string;
  }>;
  reasoning?: string;
  lastUpdatedText?: string;

  // Investigation & Audit fields
  confidenceBreakdown?: ConfidenceBreakdown;
  evidenceCount?: number;
  missingEvidence?: string[];
  contradictions?: ContradictionRecord[];
  isOverridden?: boolean;
  originalAiAssessment?: {
    severityScore: number;
    zone: SeverityZone;
    urgency: UrgencyLevel;
    recommendedTeam?: string;
  };

  // Phase 2 Resource Intelligence & Timeline Snapshots
  resources?: RankedOperationalResource[];
  timeline?: IncidentTimelineEvent[];
  capabilitiesEvaluated?: string[];
}
