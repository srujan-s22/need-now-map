import {
  ConfidenceBreakdown,
  ConfidenceFactor,
  ContradictionRecord,
  LocationQuality,
  TriageEvidence,
} from "@/types/investigation";

export interface ConfidenceInput {
  title: string;
  description: string;
  category: string;
  locationQuality: LocationQuality;
  evidence: TriageEvidence[];
  missingEvidence: string[];
  contradictions: ContradictionRecord[];
  searchSuccess: boolean;
  searchesAttempted: number;
  isDegradedMode?: boolean;
}

/**
 * Pure, deterministic mathematical engine to calculate multi-dimensional confidence scores.
 * Gemini does NOT select these numbers; they are computed strictly by server-side logic.
 */
export function calculateDeterministicConfidence(input: ConfidenceInput): ConfidenceBreakdown {
  const factors: ConfidenceFactor[] = [];

  /* --- 1. Location Confidence (L) --- */
  let location = 30;
  if (input.locationQuality === "exact_gps") {
    location = 98;
    factors.push({
      label: "Precise Hardware GPS",
      impact: "positive",
      weightScore: 98,
      explanation: "Incident origin coordinates verified via device GPS telemetry.",
    });
  } else if (input.locationQuality === "resolved_address") {
    location = 90;
    factors.push({
      label: "Resolved Geographic Address",
      impact: "positive",
      weightScore: 90,
      explanation: "Location string successfully resolved to geographic coordinates.",
    });
  } else if (input.locationQuality === "approximate_city") {
    location = 60;
    factors.push({
      label: "Approximate Regional Location",
      impact: "neutral",
      weightScore: 60,
      explanation: "Location is bounded only to a general district or city area.",
    });
  } else {
    location = 30;
    factors.push({
      label: "Unverified Location",
      impact: "negative",
      weightScore: 30,
      explanation: "Incident location coordinates could not be reliably established.",
    });
  }

  /* --- 2. Classification Confidence (C) --- */
  const desc = (input.description || "").trim().toLowerCase();
  const title = (input.title || "").trim().toLowerCase();
  const textLength = desc.length + title.length;

  let classification = 70; // baseline

  if (textLength > 80) {
    classification += 15;
    factors.push({
      label: "Detailed Situational Narrative",
      impact: "positive",
      weightScore: 15,
      explanation: "Citizen report contains rich descriptive situational telemetry.",
    });
  } else if (textLength < 30) {
    classification -= 15;
    factors.push({
      label: "Brief / Sparse Description",
      impact: "negative",
      weightScore: -15,
      explanation: "Report text is brief, requiring conservative categorization.",
    });
  }

  // Domain specificity check
  const domainKeywords = [
    "fire", "flame", "smoke", "flood", "water", "trapped", "casualty",
    "electric", "wire", "gas", "leak", "collapse", "unconscious", "bleeding", "hazard"
  ];
  const matchedKeywords = domainKeywords.filter((k) => desc.includes(k) || title.includes(k));
  if (matchedKeywords.length >= 2) {
    classification = Math.min(100, classification + 10);
    factors.push({
      label: "Domain Emergency Terminology",
      impact: "positive",
      weightScore: 10,
      explanation: `Explicit emergency terms identified (${matchedKeywords.slice(0, 3).join(", ")}).`,
    });
  }
  classification = Math.min(100, Math.max(30, classification));

  /* --- 3. Severity Confidence (S) --- */
  let severity = 75; // baseline

  // Casualty clarity
  if (input.contradictions.length === 0 && (desc.includes("trapped") || desc.includes("people") || desc.includes("injured") || desc.includes("workers"))) {
    severity += 12;
    factors.push({
      label: "Clear Life-Safety Impact Indicators",
      impact: "positive",
      weightScore: 12,
      explanation: "Report explicitly provides observable impact on human safety.",
    });
  }

  if (desc.includes("spreading") || desc.includes("rising") || desc.includes("explosion") || desc.includes("critical")) {
    severity += 10;
    factors.push({
      label: "Dynamic Hazard Escalation Metrics",
      impact: "positive",
      weightScore: 10,
      explanation: "Rate of hazard spread or environmental escalation is reported.",
    });
  }
  severity = Math.min(100, Math.max(40, severity));

  /* --- 4. Evidence Quality & Confidence (E) --- */
  let evidence = 70; // baseline when searches run

  if (input.searchSuccess && input.searchesAttempted > 0) {
    evidence += 15;
    factors.push({
      label: "Verified Geospatial Query Execution",
      impact: "positive",
      weightScore: 15,
      explanation: "Required infrastructure searches successfully executed against OpenStreetMap dataset.",
    });

    if (input.evidence.length > 0) {
      evidence += 10;
      factors.push({
        label: "Nearby Response Infrastructure Mapped",
        impact: "positive",
        weightScore: 10,
        explanation: `${input.evidence.length} civic infrastructure asset(s) mapped in operational vicinity.`,
      });
    }
  } else if (!input.searchSuccess && input.searchesAttempted > 0) {
    evidence -= 25;
    factors.push({
      label: "Geospatial Infrastructure Query Unavailable",
      impact: "negative",
      weightScore: -25,
      explanation: "External geospatial infrastructure search could not be completed.",
    });
  }

  /* --- 5. Mandatory Universal Limitations (Truth in AI) --- */
  factors.push({
    label: "Live Responder Staffing Unverified",
    impact: "negative",
    weightScore: -5,
    explanation: "Real-time unit readiness, staffing, and active call load are unavailable in dataset.",
  });

  /* --- 6. Penalties for Missing / Contradictory Evidence --- */
  let penaltySum = 0;

  if (input.contradictions.length > 0) {
    const penalty = input.contradictions.length * 8;
    penaltySum += penalty;
    for (const c of input.contradictions) {
      factors.push({
        label: `Data Discrepancy (${c.field})`,
        impact: "negative",
        weightScore: -8,
        explanation: c.explanation,
      });
    }
  }

  if (input.missingEvidence.length > 0) {
    const penalty = Math.min(15, input.missingEvidence.length * 5);
    penaltySum += penalty;
    factors.push({
      label: "Missing Critical Telemetry Points",
      impact: "negative",
      weightScore: -penalty,
      explanation: `Missing evidence: ${input.missingEvidence.slice(0, 2).join("; ")}.`,
    });
  }

  if (input.isDegradedMode) {
    penaltySum += 15;
    factors.push({
      label: "Degraded Rule-Based Mode",
      impact: "negative",
      weightScore: -15,
      explanation: "Confidence adjusted due to deterministic fallback execution.",
    });
  }

  evidence = Math.min(100, Math.max(25, evidence));

  /* --- 7. Final Weighted Overall Confidence --- */
  // Formula: Overall = (Classification * 0.30) + (Severity * 0.25) + (Evidence * 0.25) + (Location * 0.20) - Penalties
  const weightedBase =
    classification * 0.30 +
    severity * 0.25 +
    evidence * 0.25 +
    location * 0.20;

  const rawOverall = Math.round(weightedBase - penaltySum);
  const overall = Math.min(99, Math.max(15, rawOverall));

  return {
    classification: Math.round(classification),
    severity: Math.round(severity),
    evidence: Math.round(evidence),
    location: Math.round(location),
    overall,
    formula: "Overall = (Classification × 30%) + (Severity × 25%) + (Evidence × 25%) + (Location × 20%) − Discrepancy Deductions",
    factors,
  };
}
