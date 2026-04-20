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

const SYSTEM_PROMPT = `
You are an expert emergency triage AI designed to run within a civic crisis command center.
Your task is to analyze raw incident reports and convert them into structured JSON data.

Prioritize life safety, infer conservatively when details are sparse, and evaluate severity metrics (0-100).
Zones are: "red" (critical/life-threatening), "amber" (caution/hazard), "green" (stable/minor).
Urgency levels: "immediate", "high", "moderate", "low".
Categories must belong precisely to one of: flood, fire, road_blockage, injury, power_outage, supply_shortage, trapped_people, medical_emergency, hazard, other.

Return exactly and strictly ONLY valid JSON matching this schema mapping:
{
  "category": "string",
  "severityScore": number,
  "zone": "red" | "amber" | "green",
  "urgency": "immediate" | "high" | "moderate" | "low",
  "needs": ["string", "string"],
  "summary": "Short 1-sentence summary",
  "bestNextAction": "Direct, actionable recommendation",
  "confidence": number (0-100),
  "reasoning": "Brief explanation of why this zone and severity were chosen",
  "recommendedTeam": "e.g., Fire Dept, Medical Subunit A",
  "estimatedPeopleAffected": number
}

Do not include any chat formatting, markdown blocks, or text outside the JSON.
`;

// Helper to sanitize markdown block wrappers from LLM output if present
function parseAIPayload(rawText: string): AITriageResponse {
  try {
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
      if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    return JSON.parse(cleanText) as AITriageResponse;
  } catch (e) {
    throw new Error('Failed to parse AI JSON response.');
  }
}

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
    reasoning: "Fallback analyzer engaged. Assigned baseline confidence due to heuristic matching rather than native inference.",
    recommendedTeam: "General Response Unit",
    estimatedPeopleAffected: parseInt(payload.peopleAffected) || 1,
  };
}

export async function triageIncident(incidentPayload: any): Promise<AITriageResponse> {
  const OLLAMA_URL = process.env.OLLAMA_API_URL || "http://127.0.0.1:11434/api/generate";
  const content = `Incident Title: ${incidentPayload.title}\nDescription: ${incidentPayload.description}\nReported Category: ${incidentPayload.category}\nEstimates: ${incidentPayload.peopleAffected} affected.`;
  
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama3", // Easily adjustable wrapper
        prompt: `${SYSTEM_PROMPT}\n\nRAW INCIDENT REPORT:\n${content}`,
        stream: false,
        format: "json", // Instruct Ollama backend to strongly force JSON schema output
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      throw new Error('Local AI provider returned error status.');
    }

    const data = await res.json();
    return parseAIPayload(data.response);
  } catch (error) {
    console.warn("AI Triage engine failed. Utilizing deterministic fallback.", error);
    return generateDeterministicFallback(incidentPayload);
  }
}
