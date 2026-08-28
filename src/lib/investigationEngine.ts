import { GoogleGenAI, Type } from "@google/genai";
import {
  ContradictionRecord,
  EvidenceBasedTriageResponse,
  InvestigationStep,
  InvestigationStreamEvent,
  LocationQuality,
  TriageEvidence,
  TriageEvidenceType,
} from "@/types/investigation";
import { searchNearbyInfrastructure } from "./geospatial";
import { calculateDeterministicConfidence } from "./confidenceCalculator";
import { IncidentCategory, SeverityZone, UrgencyLevel } from "@/types/incident";

export interface IncidentInputPayload {
  title?: string;
  description?: string;
  category?: string;
  customCategory?: string;
  peopleAffected?: string | number;
  location?: string;
  lat?: number | null;
  lng?: number | null;
  locationSource?: "none" | "suggestion" | "custom" | "browser";
}

/**
 * Determine location precision quality based on available telemetry.
 */
function evaluateLocationQuality(payload: IncidentInputPayload): LocationQuality {
  if (payload.locationSource === "browser" && payload.lat && payload.lng) {
    return "exact_gps";
  }
  if (payload.lat && payload.lng && payload.locationSource === "suggestion") {
    return "resolved_address";
  }
  if (payload.lat && payload.lng) {
    return "approximate_city";
  }
  return "unresolved";
}

/**
 * Identify potential contradictions between structured input fields and the narrative text.
 */
function detectContradictions(payload: IncidentInputPayload): ContradictionRecord[] {
  const contradictions: ContradictionRecord[] = [];
  const text = (payload.description || "").toLowerCase();

  // Check reported people affected vs explicit numbers in text
  const reportedCount = parseInt(String(payload.peopleAffected || "0"), 10);
  const trappedMatch = text.match(/(\d+)\s*(?:people|workers|victims|residents|families|children)?\s*(?:trapped|injured|dead|casualties|stuck)/i);

  if (trappedMatch && trappedMatch[1]) {
    const textCount = parseInt(trappedMatch[1], 10);
    if (!isNaN(textCount) && reportedCount > 0 && Math.abs(textCount - reportedCount) >= 3) {
      const operationalCount = Math.max(reportedCount, textCount);
      contradictions.push({
        field: "peopleAffected",
        reportedValue: reportedCount,
        narrativeIndicatedValue: textCount,
        operationallyConsideredValue: operationalCount,
        explanation: `Form reports ${reportedCount} affected, but narrative specifies ${textCount} people directly impacted/trapped. Using conservative figure (${operationalCount}) for life safety.`,
      });
    }
  }

  return contradictions;
}

/**
 * Select relevance-driven infrastructure searches based on incident context.
 */
function planInvestigationSearches(payload: IncidentInputPayload): Array<{
  type: TriageEvidenceType;
  radiusKm: number;
  label: string;
}> {
  const text = `${payload.title || ""} ${payload.description || ""} ${payload.category || ""}`.toLowerCase();
  const searches: Array<{ type: TriageEvidenceType; radiusKm: number; label: string }> = [];

  if (text.includes("fire") || text.includes("smoke") || text.includes("explosion") || text.includes("burn")) {
    searches.push({ type: "fire_station", radiusKm: 8, label: "Nearby Fire & Rescue Stations" });
    searches.push({ type: "hospital", radiusKm: 10, label: "Nearby Emergency Medical Facilities" });
    if (text.includes("electric") || text.includes("wire") || text.includes("gas")) {
      searches.push({ type: "hazard", radiusKm: 5, label: "Utility & Power Substation Infrastructure" });
    }
  } else if (text.includes("flood") || text.includes("water") || text.includes("drown") || text.includes("submerged")) {
    searches.push({ type: "fire_station", radiusKm: 12, label: "Swift Water & Disaster Response Stations" });
    searches.push({ type: "hospital", radiusKm: 12, label: "Trauma Centers & Hospitals" });
  } else if (text.includes("medical") || text.includes("injury") || text.includes("unconscious") || text.includes("cardiac") || text.includes("bleed")) {
    searches.push({ type: "hospital", radiusKm: 8, label: "Emergency Trauma Centers & Hospitals" });
    searches.push({ type: "emergency_resource", radiusKm: 8, label: "Ambulance Bases & Paramedic Stations" });
  } else if (text.includes("power") || text.includes("outage") || text.includes("blackout")) {
    searches.push({ type: "hazard", radiusKm: 6, label: "Grid Substations & Electrical Infrastructure" });
    searches.push({ type: "hospital", radiusKm: 10, label: "Critical Care Hospitals in Affected Sector" });
  } else if (text.includes("road") || text.includes("block") || text.includes("tree") || text.includes("landslide")) {
    searches.push({ type: "emergency_resource", radiusKm: 8, label: "Public Works & Traffic Response Depots" });
    if (text.includes("crash") || text.includes("injur")) {
      searches.push({ type: "hospital", radiusKm: 8, label: "Nearby Emergency Care Facilities" });
    }
  } else {
    // General emergency baseline
    searches.push({ type: "fire_station", radiusKm: 10, label: "Primary Fire & Emergency Services" });
    searches.push({ type: "hospital", radiusKm: 10, label: "Regional Medical Facilities" });
  }

  return searches;
}

const REASONING_SYSTEM_PROMPT = `You are an expert civic emergency triage intelligence reasoner in a municipal crisis command center.
Your task is to analyze an incident report alongside FACTUAL, REAL-WORLD GEOSPATIAL EVIDENCE gathered by the system.

CRITICAL RULES:
1. Distinguish between:
   - FACT: Directly reported details and verified mapped infrastructure in the input.
   - INFERENCE: Tactical deductions based on facts.
   - UNKNOWN: Information not in the report (e.g. exact live availability, interior building layout).
2. DO NOT fabricate emergency units or response times.
3. DO NOT confuse physical distance with confirmed dispatch availability. State: "[Facility] is mapped X km away; active readiness unverified."
4. Proximity to emergency services DOES NOT increase incident severity. Severity is governed solely by life safety risks, structural hazards, and casualty potential.
5. category must be exactly one of: flood, fire, road_blockage, injury, power_outage, supply_shortage, trapped_people, medical_emergency, hazard, other.
6. zone must be: "red" (Score 80-100, critical life hazard), "amber" (Score 45-79, major hazard/damage), "green" (Score 0-44, stable/minor).
7. urgency must be: "immediate", "high", "moderate", "low".
8. Return strictly valid JSON adhering to schema.`;

const triageReasoningSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: [
        "flood", "fire", "road_blockage", "injury", "power_outage",
        "supply_shortage", "trapped_people", "medical_emergency", "hazard", "other",
      ],
    },
    severityScore: { type: Type.NUMBER, description: "Severity score 0-100" },
    zone: { type: Type.STRING, enum: ["red", "amber", "green"] },
    urgency: { type: Type.STRING, enum: ["immediate", "high", "moderate", "low"] },
    needs: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING },
    bestNextAction: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    factsIdentified: { type: Type.ARRAY, items: { type: Type.STRING } },
    inferencesMade: { type: Type.ARRAY, items: { type: Type.STRING } },
    unknownsAcknowledged: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendedTeam: { type: Type.STRING },
  },
  required: [
    "category", "severityScore", "zone", "urgency", "needs",
    "summary", "bestNextAction", "reasoning", "factsIdentified",
    "inferencesMade", "unknownsAcknowledged", "recommendedTeam",
  ],
};

/**
 * Executes the complete multi-stage Evidence-Based Investigation Pipeline.
 */
export async function runInvestigationPipeline(
  payload: IncidentInputPayload,
  emitEvent?: (event: InvestigationStreamEvent) => void
): Promise<EvidenceBasedTriageResponse> {
  const steps: InvestigationStep[] = [];
  const emit = (event: InvestigationStreamEvent) => {
    if (emitEvent) emitEvent(event);
  };

  const addStep = (type: InvestigationStep["type"], title: string, message: string, status: InvestigationStep["status"] = "running"): InvestigationStep => {
    const step: InvestigationStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      status,
      title,
      message,
      timestamp: new Date().toISOString(),
    };
    steps.push(step);
    emit({ event: "step_update", step });
    return step;
  };

  const updateStepStatus = (step: InvestigationStep, status: InvestigationStep["status"], message?: string) => {
    step.status = status;
    if (message) step.message = message;
    emit({ event: "step_update", step });
  };

  // --- STAGE 1: Incident Parsing & Telemetry Evaluation ---
  const parseStep = addStep("parsing", "Analyzing Incident Telemetry", "Parsing report description, reported category, and casualty parameters...");
  const locationQuality = evaluateLocationQuality(payload);
  const contradictions = detectContradictions(payload);

  const reportedPeople = parseInt(String(payload.peopleAffected || "1"), 10) || 1;
  const operationalPeople = contradictions.length > 0
    ? Number(contradictions[0].operationallyConsideredValue)
    : reportedPeople;

  updateStepStatus(parseStep, "completed", `Parsed telemetry: "${payload.title || 'Untitled'}" · Location quality: ${locationQuality}`);

  // --- STAGE 2: Investigation Planning ---
  const planStep = addStep("planning", "Investigation Planning", "Determining necessary evidence and required infrastructure parameters...");
  const plannedSearches = planInvestigationSearches(payload);
  updateStepStatus(
    planStep,
    "completed",
    `Planned ${plannedSearches.length} verified infrastructure search(es): ${plannedSearches.map((s) => s.label).join(", ")}`
  );

  // --- STAGE 3: Controlled Geospatial Tool Execution ---
  const allEvidence: TriageEvidence[] = [];
  let geospatialSearchSuccess = true;

  if (payload.lat && payload.lng) {
    // Execute all planned searches concurrently for maximum performance
    await Promise.all(
      plannedSearches.map(async (search) => {
        emit({
          event: "search_started",
          searchType: search.type as any,
          center: { lat: payload.lat!, lng: payload.lng! },
          radiusKm: search.radiusKm,
          label: search.label,
        });

        const searchStep = addStep(
          search.type === "fire_station"
            ? "fire_station_search"
            : search.type === "hospital"
            ? "hospital_search"
            : "hazard_search",
          `Querying ${search.label}`,
          `Executing OpenStreetMap Overpass search within ${search.radiusKm} km radius...`
        );

        const searchResult = await searchNearbyInfrastructure(
          payload.lat!,
          payload.lng!,
          [search.type],
          search.radiusKm
        );

        if (searchResult.success) {
          for (const item of searchResult.evidence) {
            allEvidence.push(item);
            emit({ event: "evidence_found", evidence: item });
          }

          const nearest = searchResult.evidence.length > 0 ? searchResult.evidence[0].distanceKm : null;
          emit({
            event: "search_completed",
            searchType: search.type,
            itemsFound: searchResult.evidence.length,
            nearestDistanceKm: nearest ?? null,
            source: "OpenStreetMap / Overpass API",
          });

          updateStepStatus(
            searchStep,
            "completed",
            `Found ${searchResult.evidence.length} verified ${search.type.replace('_', ' ')} asset(s). ${
              nearest ? `Nearest: ${nearest} km away.` : "No mapped units in immediate radius."
            }`
          );
        } else {
          geospatialSearchSuccess = false;
          emit({
            event: "search_completed",
            searchType: search.type,
            itemsFound: 0,
            nearestDistanceKm: null,
            source: "OpenStreetMap / Overpass API (Unavailable)",
          });

          updateStepStatus(
            searchStep,
            "degraded",
            `Geospatial query for ${search.label} was unavailable. Continuing with degraded evidence model.`
          );
        }
      })
    );
  } else {
    geospatialSearchSuccess = false;
    addStep("location", "Location Unverified", "Cannot perform precise nearby infrastructure query without valid geographic coordinates.", "degraded");
  }

  // --- STAGE 4: Evidence Quality Assessment ---
  const qualityStep = addStep("quality_assessment", "Evidence Quality Assessment", "Assessing evidence completeness, source provenance, and telemetry corroboration...");
  const missingEvidence: string[] = [];

  if (allEvidence.length === 0 && payload.lat && payload.lng) {
    missingEvidence.push("No mapped emergency facilities returned by OpenStreetMap within current search radius");
  }
  if (locationQuality === "approximate_city" || locationQuality === "unresolved") {
    missingEvidence.push("Exact street-level coordinates unverified");
  }
  missingEvidence.push("Live real-time unit readiness and staffing load unavailable");

  emit({
    event: "quality_assessed",
    completenessScore: allEvidence.length > 0 ? 88 : 45,
    missingCount: missingEvidence.length,
    contradictionCount: contradictions.length,
  });
  updateStepStatus(qualityStep, "completed", `Quality assessment complete · ${allEvidence.length} evidence point(s) verified`);

  // --- STAGE 5: Gemini Evidence Reasoner (or Deterministic Fallback) ---
  const reasonStep = addStep("triage_reasoning", "Evidence-Based AI Reasoning", "Synthesizing verified factual evidence and determining tactical triage recommendation...");

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let isDegradedMode = false;
  let degradedReason: string | undefined;

  let reasonedCategory: IncidentCategory = (payload.category as IncidentCategory) || "other";
  let reasonedSeverity = 50;
  let reasonedZone: SeverityZone = "amber";
  let reasonedUrgency: UrgencyLevel = "moderate";
  let reasonedNeeds: string[] = ["Situation Assessment Unit", "Standard Field Kit"];
  let reasonedSummary = payload.title ? `${payload.title} under tactical assessment.` : "Civic incident awaiting operational triage.";
  let reasonedAction = "Dispatch nearest field scout for visual confirmation and perimeter verification.";
  let reasonedExplanation = "Triage synthesized from verified report telemetry and geospatial context.";
  let factsIdentified: string[] = [];
  let inferencesMade: string[] = [];
  let unknownsAcknowledged: string[] = [];
  let recommendedTeam = "Municipal Rapid Response";

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const evidenceSummary = allEvidence.length > 0
        ? allEvidence
            .slice(0, 8)
            .map((e) => `- [${e.type.toUpperCase()}] ${e.name} — Located ${e.distanceKm} km away (Source: ${e.source})`)
            .join("\n")
        : "No external facilities verified in current query.";

      const promptContent = `
INCIDENT TELEMETRY:
- Title: ${payload.title || "Untitled"}
- Reported Category: ${payload.category || "Unclassified"}
- Location Label: ${payload.location || "Unspecified"} (${payload.lat ?? 'N/A'}, ${payload.lng ?? 'N/A'}) - Location Quality: ${locationQuality}
- People Affected: ${reportedPeople} reported (${operationalPeople} considered for safety)
- Description: ${payload.description || "No description provided."}

VERIFIED GEOSPATIAL EVIDENCE (OpenStreetMap):
${evidenceSummary}

CONTRADICTIONS IDENTIFIED:
${contradictions.length > 0 ? contradictions.map((c) => `- ${c.explanation}`).join("\n") : "None."}

MISSING TELEMETRY:
${missingEvidence.map((m) => `- ${m}`).join("\n")}
`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: `${REASONING_SYSTEM_PROMPT}\n\n${promptContent}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: triageReasoningSchema,
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty AI response body");

      let cleaned = responseText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      }
      const parsed = JSON.parse(cleaned);

      reasonedCategory = parsed.category;
      reasonedSeverity = Math.min(100, Math.max(0, Math.round(parsed.severityScore)));
      reasonedZone = parsed.zone;
      reasonedUrgency = parsed.urgency;
      reasonedNeeds = parsed.needs || reasonedNeeds;
      reasonedSummary = parsed.summary || reasonedSummary;
      reasonedAction = parsed.bestNextAction || reasonedAction;
      reasonedExplanation = parsed.reasoning || reasonedExplanation;
      factsIdentified = parsed.factsIdentified || [];
      inferencesMade = parsed.inferencesMade || [];
      unknownsAcknowledged = parsed.unknownsAcknowledged || [];
      recommendedTeam = parsed.recommendedTeam || recommendedTeam;

      updateStepStatus(reasonStep, "completed", "Evidence-based AI reasoning successfully formulated.");
    } catch (aiErr: unknown) {
      console.warn("Gemini reasoning failed; engaging deterministic fallback reasoner:", aiErr);
      isDegradedMode = true;
      degradedReason = "Gemini AI unavailable; deterministic emergency rule engine engaged.";
      updateStepStatus(reasonStep, "degraded", "Gemini unavailable. Engaged fail-safe deterministic triage rule engine.");
    }
  } else {
    isDegradedMode = true;
    degradedReason = "GEMINI_API_KEY unconfigured; deterministic rule engine engaged.";
    updateStepStatus(reasonStep, "degraded", "Deterministic fail-safe triage rule engine engaged.");
  }

  // Fallback Rule Engine if AI was degraded
  if (isDegradedMode) {
    const text = `${payload.title || ""} ${payload.description || ""}`.toLowerCase();
    if (text.includes("fire") || text.includes("smoke") || text.includes("explosion")) {
      reasonedCategory = "fire";
      reasonedSeverity = 92;
      reasonedZone = "red";
      reasonedUrgency = "immediate";
      recommendedTeam = "Fire & Rescue Task Force";
      reasonedNeeds = ["Fire Suppression Engine", "Water Tender", "Paramedic Unit"];
      reasonedAction = "Establish 200m safety perimeter and deploy primary structural fire suppression.";
      factsIdentified = ["Fire/smoke telemetry reported in narrative"];
      inferencesMade = ["Imminent structural and life-safety danger"];
    } else if (text.includes("trapped") || text.includes("collapse")) {
      reasonedCategory = "trapped_people";
      reasonedSeverity = 95;
      reasonedZone = "red";
      reasonedUrgency = "immediate";
      recommendedTeam = "Urban Search & Rescue (USAR)";
      reasonedNeeds = ["Heavy Extrication Tools", "Search K-9 Unit", "Advanced Life Support Unit"];
      reasonedAction = "Initiate acoustic search and structural stabilization protocols.";
    } else if (text.includes("flood") || text.includes("water")) {
      reasonedCategory = "flood";
      reasonedSeverity = 84;
      reasonedZone = "red";
      reasonedUrgency = "immediate";
      recommendedTeam = "Swift Water Rescue Division";
      reasonedNeeds = ["Inflatable Rescue Boats", "Life Vests", "Mobile Water Pumps"];
      reasonedAction = "Deploy swift-water rescue assets and establish high-ground collection point.";
    }
    unknownsAcknowledged = ["Real-time responder availability unavailable", "Detailed structural blueprints unavailable"];
  }

  // --- STAGE 6: Deterministic Confidence Calculation ---
  const confStep = addStep("confidence_calculation", "Calculating Evidence-Based Confidence", "Executing server-side deterministic mathematical confidence engine...");

  const confidenceBreakdown = calculateDeterministicConfidence({
    title: payload.title || "",
    description: payload.description || "",
    category: reasonedCategory,
    locationQuality,
    evidence: allEvidence,
    missingEvidence,
    contradictions,
    searchSuccess: geospatialSearchSuccess,
    searchesAttempted: plannedSearches.length,
    isDegradedMode,
  });

  updateStepStatus(confStep, "completed", `Calculated overall confidence: ${confidenceBreakdown.overall}% (${confidenceBreakdown.formula})`);

  // --- STAGE 7: Final Result Assembly ---
  const finalResult: EvidenceBasedTriageResponse = {
    category: reasonedCategory,
    severityScore: reasonedSeverity,
    zone: reasonedZone,
    urgency: reasonedUrgency,
    needs: reasonedNeeds,
    summary: reasonedSummary,
    bestNextAction: reasonedAction,
    confidence: confidenceBreakdown.overall,
    confidenceBreakdown,
    reasoning: reasonedExplanation,
    factsIdentified,
    inferencesMade,
    unknownsAcknowledged,
    recommendedTeam,
    estimatedPeopleAffected: operationalPeople,
    reportedPeopleAffected: reportedPeople,
    evidence: allEvidence,
    missingEvidence,
    contradictions,
    investigationSteps: steps,
    locationQuality,
    isDegradedMode,
    degradedReason,
  };

  emit({ event: "triage_complete", result: finalResult });
  return finalResult;
}
