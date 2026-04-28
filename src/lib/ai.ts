import { GoogleGenAI, Type } from "@google/genai";
import { IncidentCategory, SeverityZone, UrgencyLevel } from "@/types/incident";

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

const SYSTEM_PROMPT = `You are an expert emergency triage AI embedded in a civic crisis command center.
Analyze raw incident reports and return structured JSON triage data.

Rules:
- Prioritize life safety above all else.
- Infer conservatively when details are sparse.
- severityScore: 0–100. confidence: 0–100.
- zone: "red" (critical/life-threatening), "amber" (caution/hazard), "green" (stable/minor).
- urgency: "immediate", "high", "moderate", "low".
- category: exactly one of: flood, fire, road_blockage, injury, power_outage, supply_shortage, trapped_people, medical_emergency, hazard, other.
- summary: one clear sentence.
- bestNextAction: a direct, actionable recommendation.
- reasoning: brief explanation of zone and severity assignment.
- recommendedTeam: e.g. "Fire Dept", "Medical Unit Alpha".
- needs: list of resource needs.
- estimatedPeopleAffected: integer estimate.

Return ONLY valid JSON. No markdown, no commentary, no wrapping.`;

// Gemini structured output schema for reliable, predictable responses
const triageResponseSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: "Incident category",
      enum: [
        "flood", "fire", "road_blockage", "injury", "power_outage",
        "supply_shortage", "trapped_people", "medical_emergency", "hazard", "other",
      ],
    },
    severityScore: { type: Type.NUMBER, description: "Severity score 0-100" },
    zone: { type: Type.STRING, enum: ["red", "amber", "green"], description: "Severity zone" },
    urgency: { type: Type.STRING, enum: ["immediate", "high", "moderate", "low"], description: "Urgency level" },
    needs: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of required resources" },
    summary: { type: Type.STRING, description: "One-sentence summary of the incident" },
    bestNextAction: { type: Type.STRING, description: "Direct actionable recommendation" },
    confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
    reasoning: { type: Type.STRING, description: "Brief reasoning for the assigned severity and zone" },
    recommendedTeam: { type: Type.STRING, description: "Recommended response team" },
    estimatedPeopleAffected: { type: Type.NUMBER, description: "Estimated number of people affected" },
  },
  required: [
    "category", "severityScore", "zone", "urgency", "needs",
    "summary", "bestNextAction", "confidence", "reasoning",
    "recommendedTeam", "estimatedPeopleAffected",
  ],
};

function generateDeterministicFallback(payload: any): AITriageResponse {
  const text = payload.description?.toLowerCase() || '';
  
  let zone: SeverityZone = "green";
  let severityScore = 30;
  let urgency: UrgencyLevel = "low";
  let category: IncidentCategory = "other";
  
  if (text.includes('fire') || text.includes('trapped') || text.includes('critical')) {
    zone = "red";
    severityScore = 95;
    urgency = "immediate";
    category = text.includes('fire') ? "fire" : "trapped_people";
  } else if (text.includes('flood') || text.includes('gas') || text.includes('power')) {
    zone = "amber";
    severityScore = 65;
    urgency = "high";
    category = text.includes('flood') ? "flood" : text.includes('power') ? "power_outage" : "hazard";
  }

  return {
    category,
    severityScore,
    zone,
    urgency,
    needs: ["Dispatch Unit", "Secondary Evaluation"],
    summary: payload.title || "Unclassified Incident Report",
    bestNextAction: "Assign nearest available ground unit for visual confirmation.",
    confidence: 60,
    reasoning: "Deterministic fallback engaged. Assigned baseline confidence due to heuristic matching rather than Gemini inference.",
    recommendedTeam: "General Response Unit",
    estimatedPeopleAffected: parseInt(payload.peopleAffected) || 1,
  };
}

export async function triageIncident(incidentPayload: any): Promise<AITriageResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set. Using deterministic fallback.");
    return generateDeterministicFallback(incidentPayload);
  }

  const content = `Incident Title: ${incidentPayload.title}\nDescription: ${incidentPayload.description}\nReported Category: ${incidentPayload.category}\nEstimates: ${incidentPayload.peopleAffected} affected.`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `${SYSTEM_PROMPT}\n\nRAW INCIDENT REPORT:\n${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: triageResponseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return JSON.parse(text) as AITriageResponse;
  } catch (error) {
    console.warn("Gemini triage engine failed. Using deterministic fallback.", error);
    return generateDeterministicFallback(incidentPayload);
  }
}
