import { IncidentCategory, SeverityZone, UrgencyLevel } from "@/types/incident";
import { runInvestigationPipeline, IncidentInputPayload } from "./investigationEngine";
import { EvidenceBasedTriageResponse } from "@/types/investigation";

export interface AITriageResponse {
  category: IncidentCategory;
  severityScore: number;
  zone: SeverityZone;
  urgency: UrgencyLevel;
  needs: string[];
  summary: string;
  bestNextAction: string;
  confidence: number;
  reasoning: string;
  recommendedTeam: string;
  estimatedPeopleAffected: number;
}

/**
 * Backward-compatible triageIncident function that routes to the new Evidence-Based Investigation Engine.
 */
export async function triageIncident(incidentPayload: IncidentInputPayload): Promise<EvidenceBasedTriageResponse> {
  return runInvestigationPipeline(incidentPayload);
}
