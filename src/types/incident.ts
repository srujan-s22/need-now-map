export type SeverityZone = "red" | "amber" | "green";
export type IncidentStatus = "new" | "reviewed" | "assigned" | "resolved";
export type IncidentCategory = 
  | "flood" 
  | "fire" 
  | "road_blockage" 
  | "injury" 
  | "power_outage" 
  | "supply_shortage" 
  | "trapped_people" 
  | "medical_emergency" 
  | "hazard" 
  | "other";

export type UrgencyLevel = "immediate" | "high" | "moderate" | "low";

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
  confidenceBreakdown?: {
    classification: number;
    severity: number;
    evidence: number;
    location: number;
    overall: number;
    formula?: string;
    factors?: Array<{
      label: string;
      impact: "positive" | "negative" | "neutral";
      explanation: string;
    }>;
  };
  evidenceCount?: number;
  missingEvidence?: string[];
  contradictions?: Array<{
    field: string;
    reportedValue: string | number;
    narrativeIndicatedValue: string | number;
    operationallyConsideredValue: string | number;
    explanation: string;
  }>;
  isOverridden?: boolean;
  originalAiAssessment?: {
    severityScore: number;
    zone: SeverityZone;
    urgency: UrgencyLevel;
    recommendedTeam?: string;
  };
}
