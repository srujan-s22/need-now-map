import {
  ConfidenceBreakdown,
  ConfidenceEngineInput,
  ConfidenceFactor,
} from "@/types/investigation";

/**
 * Pure, deterministic mathematical engine to calculate multi-dimensional confidence scores.
 * Gemini does NOT select these numbers; they are computed strictly by server-side logic.
 */
export function calculateDeterministicConfidence(input: ConfidenceEngineInput): ConfidenceBreakdown {
  const factors: ConfidenceFactor[] = [];

  /* --- 1. Location Confidence (L) --- */
  let location = 35;
  if (input.locationQuality === "exact_gps") {
    location = 98;
    factors.push({
      label: "Precise Hardware GPS",
      impact: "positive",
      weightScore: 98,
      explanation: "Incident origin coordinates verified via device GPS telemetry.",
    });
  } else if (input.locationQuality === "resolved_address") {
    location = 92;
    factors.push({
      label: "Resolved Geographic Address",
      impact: "positive",
      weightScore: 92,
      explanation: "Location string successfully resolved to geographic coordinates.",
    });
  } else if (input.locationQuality === "approximate_city") {
    location = 65;
    factors.push({
      label: "Approximate Regional Location",
      impact: "neutral",
      weightScore: 65,
      explanation: "Location is bounded only to a general district or city area.",
    });
  } else {
    location = 35;
    factors.push({
      label: "Unverified Location",
      impact: "negative",
      weightScore: 35,
      explanation: "Incident location coordinates could not be reliably established.",
    });
  }

  /* --- 2. Classification Confidence (C) --- */
  const desc = (input.description || "").trim().toLowerCase();
  const title = (input.title || "").trim().toLowerCase();
  const textLength = desc.length + title.length;

  let classification = 75; // baseline

  if (textLength > 60) {
    classification += 15;
    factors.push({
      label: "Detailed Situational Narrative",
      impact: "positive",
      weightScore: 15,
      explanation: "Citizen report contains rich descriptive situational telemetry.",
    });
  } else if (textLength < 25) {
    classification -= 15;
    factors.push({
      label: "Brief / Sparse Description",
      impact: "negative",
      weightScore: -15,
      explanation: "Report text is brief, requiring conservative categorization.",
    });
  }

  // Domain emergency specificity check
  const domainKeywords = [
    "fire", "flame", "smoke", "flood", "water", "trapped", "casualty",
    "electric", "wire", "gas", "leak", "collapse", "unconscious", "bleeding", "hazard", "pipe", "rupture"
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
  let severity = 80; // baseline

  // Casualty clarity
  if (input.contradictions.length === 0 && (desc.includes("trapped") || desc.includes("people") || desc.includes("injured") || desc.includes("workers"))) {
    severity += 10;
    factors.push({
      label: "Clear Life-Safety Impact Indicators",
      impact: "positive",
      weightScore: 10,
      explanation: "Report explicitly provides observable impact on human safety.",
    });
  }

  if (desc.includes("spreading") || desc.includes("rising") || desc.includes("explosion") || desc.includes("critical")) {
    severity += 8;
    factors.push({
      label: "Dynamic Hazard Escalation Metrics",
      impact: "positive",
      weightScore: 8,
      explanation: "Rate of hazard spread or environmental escalation is reported.",
    });
  }
  severity = Math.min(100, Math.max(40, severity));

  /* --- 4. Evidence Corroboration & Quality (E) --- */
  let evidence = 75; // baseline when searches run

  const totalCapSearches = input.capabilityCorroboration.length;
  const successfulCapSearches = input.capabilityCorroboration.filter((c) => c.queryExecuted).length;

  if (totalCapSearches > 0 && successfulCapSearches === totalCapSearches) {
    evidence += 15;
    factors.push({
      label: "Verified Geospatial Capability Queries",
      impact: "positive",
      weightScore: 15,
      explanation: `All ${totalCapSearches} required capability searches successfully executed against OpenStreetMap dataset.`,
    });

    const responseResourcesCount = input.rankedResources.filter((r) => r.entityKind === "emergency_response").length;
    if (responseResourcesCount > 0) {
      evidence += 8;
      factors.push({
        label: "Nearby Response Infrastructure Corroborated",
        impact: "positive",
        weightScore: 8,
        explanation: `${responseResourcesCount} emergency response facility(ies) mapped in operational vicinity.`,
      });
    }
  } else if (successfulCapSearches < totalCapSearches && totalCapSearches > 0) {
    evidence -= 15;
    factors.push({
      label: "Partial Geospatial Query Execution",
      impact: "negative",
      weightScore: -15,
      explanation: "One or more capability searches could not be completed via external dataset.",
    });
  }

  /* --- 5. Mandatory Universal Limitations (Truth in AI) --- */
  factors.push({
    label: "Live Responder Readiness Unverified",
    impact: "negative",
    weightScore: -4,
    explanation: "Real-time unit readiness, active staffing, and call loads are unavailable in dataset.",
  });

  /* --- 6. Penalties for Missing / Contradictory Evidence --- */
  let penaltySum = 4; // base universal deduction

  if (input.contradictions.length > 0) {
    const penalty = input.contradictions.length * 6;
    penaltySum += penalty;
    for (const c of input.contradictions) {
      factors.push({
        label: `Data Discrepancy (${c.field})`,
        impact: "negative",
        weightScore: -6,
        explanation: c.explanation,
      });
    }
  }

  const criticalMissing = input.missingEvidence.filter((m) => !m.includes("Live real-time unit readiness"));
  if (criticalMissing.length > 0) {
    const penalty = Math.min(12, criticalMissing.length * 4);
    penaltySum += penalty;
    factors.push({
      label: "Missing Critical Telemetry Points",
      impact: "negative",
      weightScore: -penalty,
      explanation: `Missing evidence: ${criticalMissing.slice(0, 2).join("; ")}.`,
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
