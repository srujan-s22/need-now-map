import { GoogleGenAI, Type } from "@google/genai";
import {
  ContradictionRecord,
  EvidenceBasedTriageResponse,
  InvestigationStep,
  InvestigationStreamEvent,
  LocationQuality,
  RankedOperationalResource,
  ResourceCapability,
  TriageEvidence,
} from "@/types/investigation";
import { searchNearbyCapabilities } from "./geospatial";
import { calculateDeterministicConfidence } from "./confidenceCalculator";
import { CANONICAL_CAPABILITY_REGISTRY, rankOperationalResources } from "./resourceRanker";
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
  if (payload.lat && payload.lng && (payload.locationSource === "suggestion" || payload.location || payload.locationSource === "custom")) {
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
 * Incident-Aware Capability Planner with strict positive and negative scoping rules.
 */
function planRequiredCapabilities(payload: IncidentInputPayload): ResourceCapability[] {
  const text = `${payload.title || ""} ${payload.description || ""} ${payload.category || ""}`.toLowerCase();
  const category = (payload.category || "").toLowerCase();
  const caps: ResourceCapability[] = [];

  const isExplicitlyNoInjuries =
    text.includes("no one trapped") ||
    text.includes("no people injured") ||
    text.includes("no casualties") ||
    text.includes("no injuries") ||
    text.includes("no one injured") ||
    text.includes("no vehicles crushed") ||
    text.includes("or people injured") ||
    (Number(payload.peopleAffected || 0) === 0 && !text.includes("trapped"));

  const hasCasualtiesOrTrapped =
    !isExplicitlyNoInjuries &&
    (text.includes("trapped") ||
      text.includes("injur") ||
      text.includes("casualt") ||
      text.includes("victim") ||
      text.includes("bleeding") ||
      text.includes("unconscious") ||
      Number(payload.peopleAffected || 0) > 1);

  // 1. Structural Collapse & Heavy Extrication (High Priority Life Safety)
  const isStructuralCollapse =
    category === "structural_collapse" ||
    category === "trapped_people" ||
    text.includes("structural collapse") ||
    text.includes("building collapse") ||
    text.includes("slab collapse") ||
    text.includes("roof collapse") ||
    text.includes("under debris") ||
    text.includes("under rubble") ||
    text.includes("trapped under") ||
    text.includes("crushed under");

  if (isStructuralCollapse) {
    caps.push("heavy_extrication_usar");
    caps.push("trauma_care");
    caps.push("traffic_perimeter");
    return Array.from(new Set(caps));
  }

  // 2. Water Leak (Municipal / Pipe) — STRICT: Never search swift water rescue boats unless drowning/trapped
  if (category === "water_leak" || (text.includes("water leak") || text.includes("pipe rupture") || text.includes("pipeline burst") || text.includes("main burst"))) {
    caps.push("water_grid_isolation");
    caps.push("public_works_clearing");
    if (hasCasualtiesOrTrapped && (text.includes("trapped") || text.includes("basement flooded"))) {
      caps.push("fire_suppression");
    }
    return Array.from(new Set(caps));
  }

  // 3. Structural Fire & Electrical Hazard
  if (category === "fire" || category === "electrical_hazard" || text.includes("fire") || text.includes("flame") || text.includes("smoke") || text.includes("explosion")) {
    caps.push("fire_suppression");
    if (text.includes("electric") || text.includes("substation") || text.includes("transformer") || text.includes("wire") || category === "electrical_hazard") {
      caps.push("power_grid_isolation");
    }
    if (hasCasualtiesOrTrapped) {
      caps.push("trauma_care");
    }
    if (text.includes("road") || text.includes("traffic") || text.includes("highway") || text.includes("avenue")) {
      caps.push("traffic_perimeter");
    }
    return Array.from(new Set(caps));
  }

  // 4. Flood & Swift Water
  if (category === "flood" || category === "water_rescue" || text.includes("flood") || text.includes("river overflow") || text.includes("drowning") || text.includes("submerged")) {
    caps.push("swift_water_rescue");
    caps.push("fire_suppression");
    if (hasCasualtiesOrTrapped) {
      caps.push("trauma_care");
    }
    caps.push("evacuation_support");
    return Array.from(new Set(caps));
  }

  // 5. Medical Emergency & Injury
  if (category === "medical_emergency" || category === "injury" || text.includes("cardiac") || text.includes("unconscious") || text.includes("overdose") || text.includes("asthma") || text.includes("stroke") || text.includes("passenger collapsed") || text.includes("chest pain")) {
    caps.push("trauma_care");
    caps.push("ems_transport");
    return Array.from(new Set(caps));
  }

  // 6. Gas Leak & Industrial Hazmat
  if (category === "gas_leak" || category === "industrial_hazard" || text.includes("gas leak") || text.includes("chemical spill") || text.includes("toxic") || text.includes("fumes")) {
    caps.push("hazmat_containment");
    caps.push("gas_grid_isolation");
    caps.push("evacuation_support");
    if (hasCasualtiesOrTrapped) {
      caps.push("trauma_care");
    }
    return Array.from(new Set(caps));
  }

  // 7. Power Grid Outage
  if (category === "power_outage" || text.includes("blackout") || text.includes("power outage")) {
    caps.push("power_grid_isolation");
    const hasCriticalCareNeed =
      (text.includes("hospital") || text.includes("patient") || text.includes("oxygen") || text.includes("nursing home") || text.includes("ventilator")) &&
      !text.includes("no hospital") &&
      !text.includes("no care facilities");
    if (hasCriticalCareNeed) {
      caps.push("critical_facility_backup");
    }
    return Array.from(new Set(caps));
  }

  // 8. Road Blockage & Debris Clearing
  if (category === "road_blockage" || text.includes("fallen tree") || text.includes("debris") || text.includes("landslide") || text.includes("sinkhole")) {
    caps.push("public_works_clearing");
    caps.push("traffic_perimeter");
    if (hasCasualtiesOrTrapped && (text.includes("crash") || text.includes("injur") || text.includes("collision"))) {
      caps.push("trauma_care");
    }
    return Array.from(new Set(caps));
  }

  // General Baseline fallback
  caps.push("fire_suppression");
  if (hasCasualtiesOrTrapped) caps.push("trauma_care");

  return Array.from(new Set(caps));
}

const REASONING_SYSTEM_PROMPT = `You are an expert civic emergency triage intelligence reasoner in a municipal crisis command operations center.
Your task is to analyze an incident report alongside FACTUAL, REAL-WORLD GEOSPATIAL EVIDENCE gathered by the system.

CRITICAL RULES:
1. Distinguish between:
   - FACT: Directly reported details and verified mapped infrastructure in the input.
   - INFERENCE: Tactical deductions based on facts.
   - UNKNOWN: Information not in the report (e.g. exact live unit availability, interior building layout).
2. DO NOT fabricate emergency units or response times.
3. DO NOT confuse physical distance with confirmed dispatch availability. State: "[Facility] is mapped X km away; active readiness unverified."
4. Proximity to emergency services DOES NOT increase incident severity. Severity is governed solely by life safety risks, structural hazards, and casualty potential.
5. category must be exactly one of: flood, fire, road_blockage, injury, power_outage, supply_shortage, trapped_people, medical_emergency, hazard, other, water_leak, water_rescue, electrical_hazard, gas_leak, structural_collapse, industrial_hazard.
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
        "water_leak", "water_rescue", "electrical_hazard", "gas_leak", "structural_collapse", "industrial_hazard"
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

  // --- STAGE 2: Investigation Planning (Capability Profiling) ---
  const planStep = addStep("planning", "Investigation Planning", "Determining required operational capabilities based on situational profile...");
  const plannedCapabilities = planRequiredCapabilities(payload);
  updateStepStatus(
    planStep,
    "completed",
    `Identified ${plannedCapabilities.length} required capability(ies): ${plannedCapabilities.map((c) => CANONICAL_CAPABILITY_REGISTRY[c]?.label || c).join(", ")}`
  );

  // --- STAGE 3: Controlled Geospatial Capability Execution ---
  const allEvidence: TriageEvidence[] = [];
  const capabilityCorroboration: Array<{
    capability: ResourceCapability;
    queryExecuted: boolean;
    resourcesFoundCount: number;
    nearestDistanceKm: number | null;
    corroborationStrength: "strong" | "moderate" | "weak" | "unavailable";
  }> = [];

  if (payload.lat && payload.lng && plannedCapabilities.length > 0) {
    const maxRadiusKm = Math.max(...plannedCapabilities.map((c) => CANONICAL_CAPABILITY_REGISTRY[c]?.defaultRadiusKm || 10));

    // Emit search started for all planned capabilities
    for (const cap of plannedCapabilities) {
      const capDef = CANONICAL_CAPABILITY_REGISTRY[cap];
      const radiusKm = capDef?.defaultRadiusKm || 10;
      const label = capDef?.label || cap;

      emit({
        event: "search_started",
        searchType: cap,
        capability: cap,
        center: { lat: payload.lat!, lng: payload.lng! },
        radiusKm,
        label,
      });
    }

    const searchStep = addStep(
      "emergency_resource_search",
      `Querying Verified Civic & Emergency Infrastructure`,
      `Executing unified OpenStreetMap Overpass search within ${maxRadiusKm} km radius across ${plannedCapabilities.length} capabilities...`
    );

    // Single unified Overpass query
    const searchResult = await searchNearbyCapabilities(
      payload.lat!,
      payload.lng!,
      plannedCapabilities,
      maxRadiusKm
    );

    if (searchResult.success) {
      const seenIds = new Set<string>();
      for (const item of searchResult.evidence) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allEvidence.push(item);
          emit({ event: "evidence_found", evidence: item });
        }
      }

      // Correlate results per planned capability
      for (const cap of plannedCapabilities) {
        const capDef = CANONICAL_CAPABILITY_REGISTRY[cap];
        const capRadius = capDef?.defaultRadiusKm || 10;
        const matchingEvidence = searchResult.evidence.filter((e) => {
          if (cap === "fire_suppression" || cap === "heavy_extrication_usar" || cap === "hazmat_containment") {
            return e.type === "fire_station";
          }
          if (cap === "trauma_care" || cap === "ems_transport" || cap === "critical_facility_backup") {
            return e.type === "hospital";
          }
          if (cap === "power_grid_isolation") {
            return e.type === "hazard" || e.name.toLowerCase().includes("substation") || e.name.toLowerCase().includes("power");
          }
          if (cap === "gas_grid_isolation") {
            return e.type === "hazard" || e.name.toLowerCase().includes("gas");
          }
          if (cap === "water_grid_isolation") {
            return e.type === "water_utility" || e.name.toLowerCase().includes("water");
          }
          if (cap === "public_works_clearing") {
            return e.type === "public_works" || e.name.toLowerCase().includes("depot");
          }
          return true;
        }).filter((e) => (e.distanceKm || 0) <= capRadius);

        const nearest = matchingEvidence.length > 0 ? matchingEvidence[0].distanceKm : null;

        emit({
          event: "search_completed",
          searchType: cap,
          capability: cap,
          itemsFound: matchingEvidence.length,
          nearestDistanceKm: nearest ?? null,
          source: "OpenStreetMap / Overpass API",
        });

        capabilityCorroboration.push({
          capability: cap,
          queryExecuted: true,
          resourcesFoundCount: matchingEvidence.length,
          nearestDistanceKm: nearest ?? null,
          corroborationStrength: matchingEvidence.length > 0 ? "strong" : "moderate",
        });
      }

      updateStepStatus(
        searchStep,
        "completed",
        `Discovered ${allEvidence.length} verified asset(s) across ${plannedCapabilities.length} capabilities from OpenStreetMap.`
      );
    } else {
      for (const cap of plannedCapabilities) {
        capabilityCorroboration.push({
          capability: cap,
          queryExecuted: false,
          resourcesFoundCount: 0,
          nearestDistanceKm: null,
          corroborationStrength: "unavailable",
        });
      }

      updateStepStatus(
        searchStep,
        "failed",
        `Overpass dataset query limited: ${searchResult.error || "Network unreachable"}. Operating in safe degraded fallback.`
      );
    }
  } else {
    addStep("location", "Location Unverified", "Cannot perform precise nearby infrastructure query without valid geographic coordinates.", "degraded");
  }

  // --- STAGE 4: Deterministic Resource Ranking ---
  const rankingStep = addStep("resource_ranking", "Deterministic Resource Ranking", "Evaluating capability relevance, proximity vectors, and verified contact telemetry...");
  const rankedResources: RankedOperationalResource[] = rankOperationalResources(allEvidence, plannedCapabilities);

  // Emit ranked events
  for (const cap of plannedCapabilities) {
    const topForCap = rankedResources.find((r) => r.primaryCapability === cap && r.isPrimaryRecommendation);
    if (topForCap) {
      emit({
        event: "resource_ranked",
        capability: cap,
        topResourceId: topForCap.id,
        topResourceName: topForCap.name,
        nearestDistanceKm: topForCap.distanceKm,
      });
    }
  }

  updateStepStatus(rankingStep, "completed", `Ranked ${rankedResources.length} mapped resource(s) across ${plannedCapabilities.length} required capability(ies).`);

  // --- STAGE 5: Evidence Quality Assessment ---
  const qualityStep = addStep("quality_assessment", "Evidence Quality Assessment", "Assessing evidence completeness, source provenance, and telemetry corroboration...");
  const missingEvidence: string[] = [];

  if (rankedResources.length === 0 && payload.lat && payload.lng) {
    missingEvidence.push("No matching resources returned by queried OpenStreetMap tags within search perimeter");
  }
  if (locationQuality === "approximate_city" || locationQuality === "unresolved") {
    missingEvidence.push("Exact street-level coordinates unverified");
  }
  missingEvidence.push("Live real-time unit readiness, staffing, and active call load unmonitored in public dataset");

  emit({
    event: "quality_assessed",
    completenessScore: rankedResources.length > 0 ? 90 : 45,
    missingCount: missingEvidence.length,
    contradictionCount: contradictions.length,
  });
  updateStepStatus(qualityStep, "completed", `Quality assessment complete · ${rankedResources.length} operational asset(s) corroborated`);

  // --- STAGE 6: Gemini Evidence Reasoner (or Deterministic Fallback) ---
  const reasonStep = addStep("triage_reasoning", "Evidence-Based AI Reasoning", "Synthesizing verified factual evidence and formulating tactical command directives...");

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

      const evidenceSummary = rankedResources.length > 0
        ? rankedResources
            .slice(0, 8)
            .map((e) => `- [${e.primaryCapability.toUpperCase()}] ${e.name} — Located ${e.distanceKm} km away (Source: ${e.source}${e.contact.phone ? `, Phone: ${e.contact.phone}` : ''})`)
            .join("\n")
        : "No external facilities verified in current query.";

      const promptContent = `
INCIDENT TELEMETRY:
- Title: ${payload.title || "Untitled"}
- Reported Category: ${payload.category || "Unclassified"}
- Location Label: ${payload.location || "Unspecified"} (${payload.lat ?? 'N/A'}, ${payload.lng ?? 'N/A'}) - Location Quality: ${locationQuality}
- People Affected: ${reportedPeople} reported (${operationalPeople} considered for safety)
- Description: ${payload.description || "No description provided."}
- Required Capabilities Identified: ${plannedCapabilities.join(", ")}

VERIFIED GEOSPATIAL EVIDENCE (OpenStreetMap):
${evidenceSummary}

CONTRADICTIONS IDENTIFIED:
${contradictions.length > 0 ? contradictions.map((c) => `- ${c.explanation}`).join("\n") : "None."}

MISSING TELEMETRY & LIMITATIONS:
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
    if (text.includes("water leak") || text.includes("pipe") || payload.category === "water_leak") {
      reasonedCategory = "water_leak";
      reasonedSeverity = 52;
      reasonedZone = "amber";
      reasonedUrgency = "moderate";
      recommendedTeam = "Municipal Water Works Repair Crew";
      reasonedNeeds = ["Main Line Valve Key", "Submersible Sump Pump", "Pipe Replacement Clamp"];
      reasonedAction = "Dispatch water utility crew to isolate municipal valve zone and assess roadway damage.";
      factsIdentified = ["Water pipe rupture/leak reported in narrative"];
      inferencesMade = ["Localized water disruption; swift water rescue boats not required"];
    } else if (text.includes("fire") || text.includes("smoke") || text.includes("explosion") || payload.category === "fire") {
      reasonedCategory = "fire";
      reasonedSeverity = 92;
      reasonedZone = "red";
      reasonedUrgency = "immediate";
      recommendedTeam = "Fire & Rescue Task Force";
      reasonedNeeds = ["Fire Suppression Engine", "Water Tender", "Paramedic Unit"];
      reasonedAction = "Establish 200m safety perimeter and deploy primary structural fire suppression.";
      factsIdentified = ["Active fire telemetry reported in narrative"];
      inferencesMade = ["Imminent structural and life-safety danger"];
    } else if (text.includes("collapse") || text.includes("trapped") || payload.category === "structural_collapse") {
      reasonedCategory = "structural_collapse";
      reasonedSeverity = 96;
      reasonedZone = "red";
      reasonedUrgency = "immediate";
      recommendedTeam = "Urban Search & Rescue (USAR)";
      reasonedNeeds = ["Hydraulic Extrication Spreader", "Acoustic Search K-9 Unit", "Advanced Life Support Unit"];
      reasonedAction = "Initiate acoustic search grid and structural shoring protocols.";
      factsIdentified = ["Structural collapse/trapped victims reported"];
      inferencesMade = ["High casualty risk requiring heavy extrication"];
    } else if (text.includes("flood") || payload.category === "flood") {
      reasonedCategory = "flood";
      reasonedSeverity = 84;
      reasonedZone = "red";
      reasonedUrgency = "immediate";
      recommendedTeam = "Swift Water Rescue Division";
      reasonedNeeds = ["Inflatable Rescue Boats", "Life Vests", "Mobile Water Pumps"];
      reasonedAction = "Deploy swift-water rescue assets and establish high-ground collection point.";
    }
    unknownsAcknowledged = ["Real-time unit availability unverified", "Detailed structural blueprints unavailable"];
  }

  // --- STAGE 7: Deterministic Confidence Calculation ---
  const confStep = addStep("confidence_calculation", "Calculating Evidence-Based Confidence", "Executing server-side deterministic mathematical confidence engine...");

  const confidenceBreakdown = calculateDeterministicConfidence({
    title: payload.title || "",
    description: payload.description || "",
    category: reasonedCategory,
    locationQuality,
    requiredCapabilities: plannedCapabilities,
    capabilityCorroboration,
    evidence: allEvidence,
    rankedResources,
    missingEvidence,
    contradictions,
    isDegradedMode,
  });

  updateStepStatus(confStep, "completed", `Calculated overall confidence: ${confidenceBreakdown.overall}% (${confidenceBreakdown.formula})`);

  // --- STAGE 8: Final Result Assembly ---
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
    rankedResources,
    capabilitiesEvaluated: plannedCapabilities,
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
