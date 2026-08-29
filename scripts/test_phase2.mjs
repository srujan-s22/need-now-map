import http from "http";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function postJson(url, data, headers = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data: json, headers: res.headers };
}

async function getJson(url, headers = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: "GET",
    headers,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data: json, headers: res.headers };
}

async function runTests() {
  console.log("=================================================");
  console.log("NEEDNOW MAP — PHASE 2 AUTOMATED ACCEPTANCE SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name} — ${details}`);
      failed++;
    }
  }

  // --- TEST 01: Electrical Fire + 6 Trapped People ---
  console.log("Executing TEST 01: Electrical Fire + 6 Trapped People");
  const t1 = await postJson("/api/triage", {
    title: "Transformer Fire & 3rd Floor Entrapment",
    description: "High-voltage transformer exploded, igniting 3rd floor commercial building. 6 workers trapped by smoke. Live power cables sparking on roadway.",
    category: "fire",
    peopleAffected: "6",
    location: "MG Road, Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
  });

  assert(t1.ok, "TEST 01 API returns 200");
  assert(t1.data?.category === "fire" || t1.data?.category === "electrical_hazard", "TEST 01 Category classified as fire/electrical hazard");
  assert(t1.data?.capabilitiesEvaluated?.includes("fire_suppression"), "TEST 01 Evaluated fire_suppression");
  assert(t1.data?.capabilitiesEvaluated?.includes("power_grid_isolation"), "TEST 01 Evaluated power_grid_isolation");
  assert(t1.data?.capabilitiesEvaluated?.includes("trauma_care"), "TEST 01 Evaluated trauma_care because 6 people trapped");
  assert(!t1.data?.capabilitiesEvaluated?.includes("swift_water_rescue"), "TEST 01 Negative Check: Did NOT evaluate swift_water_rescue");
  assert(t1.data?.confidence >= 75, `TEST 01 Deterministic confidence is high (${t1.data?.confidence}%)`);
  assert(Array.isArray(t1.data?.rankedResources), "TEST 01 Ranked resources array returned");

  // --- TEST 02: Municipal Water Pipe Leak ---
  console.log("\nExecuting TEST 02: Municipal Water Pipe Rupture (Negative Check for Water Rescue)");
  const t2 = await postJson("/api/triage", {
    title: "Underground 16-inch Water Main Rupture",
    description: "Pressurized municipal water main burst under street. Water flooding tarmac and washing out gravel. No one trapped or injured.",
    category: "water_leak",
    peopleAffected: "0",
    location: "Indiranagar 100ft Road, Bengaluru",
    lat: 12.9784,
    lng: 77.6408,
  });

  assert(t2.ok, "TEST 02 API returns 200");
  assert(t2.data?.category === "water_leak", "TEST 02 Classified as water_leak");
  assert(t2.data?.capabilitiesEvaluated?.includes("water_grid_isolation"), "TEST 02 Evaluated water_grid_isolation");
  assert(t2.data?.capabilitiesEvaluated?.includes("public_works_clearing"), "TEST 02 Evaluated public_works_clearing");
  assert(!t2.data?.capabilitiesEvaluated?.includes("swift_water_rescue"), "TEST 02 Negative Check: Did NOT search swift water rescue boats");
  assert(!t2.data?.capabilitiesEvaluated?.includes("trauma_care"), "TEST 02 Negative Check: Did NOT search trauma hospitals without casualties");

  // --- TEST 03: Regional River Flood ---
  console.log("\nExecuting TEST 03: Regional River Flood");
  const t3 = await postJson("/api/triage", {
    title: "River Overflow & Residential Inundation",
    description: "Heavy monsoon rain caused river overflow. Water depth 4 feet in residential area. Families trapped on roofs needing rescue boats.",
    category: "flood",
    peopleAffected: "12",
    location: "Shivajinagar, Bengaluru",
    lat: 12.9850,
    lng: 77.6000,
  });

  assert(t3.ok, "TEST 03 API returns 200");
  assert(t3.data?.capabilitiesEvaluated?.includes("swift_water_rescue"), "TEST 03 Evaluated swift_water_rescue");
  assert(t3.data?.capabilitiesEvaluated?.includes("fire_suppression"), "TEST 03 Evaluated fire_suppression");
  assert(t3.data?.capabilitiesEvaluated?.includes("evacuation_support"), "TEST 03 Evaluated evacuation_support");

  // --- TEST 04: Medical Cardiac Emergency ---
  console.log("\nExecuting TEST 04: Medical Emergency");
  const t4 = await postJson("/api/triage", {
    title: "Acute Cardiac Arrest at Transit Station",
    description: "Elderly passenger collapsed with acute chest pain and loss of consciousness. CPR in progress by bystanders.",
    category: "medical_emergency",
    peopleAffected: "1",
    location: "Majestic Metro Station, Bengaluru",
    lat: 12.9757,
    lng: 77.5728,
  });

  assert(t4.ok, "TEST 04 API returns 200");
  assert(t4.data?.capabilitiesEvaluated?.includes("trauma_care"), "TEST 04 Evaluated trauma_care");
  assert(t4.data?.capabilitiesEvaluated?.includes("ems_transport"), "TEST 04 Evaluated ems_transport");
  assert(!t4.data?.capabilitiesEvaluated?.includes("heavy_extrication_usar"), "TEST 04 Negative Check: Did NOT evaluate heavy USAR");

  // --- TEST 05: Road Blockage by Fallen Tree ---
  console.log("\nExecuting TEST 05: Road Blockage by Fallen Tree");
  const t5 = await postJson("/api/triage", {
    title: "Large Tree Uprooted Across Arterial Road",
    description: "Banyan tree fallen across both lanes of traffic during storm. Road completely blocked, causing severe congestion. No vehicles crushed or people injured.",
    category: "road_blockage",
    peopleAffected: "0",
    location: "Koramangala 80ft Road, Bengaluru",
    lat: 12.9352,
    lng: 77.6245,
  });

  assert(t5.ok, "TEST 05 API returns 200");
  assert(t5.data?.capabilitiesEvaluated?.includes("public_works_clearing"), "TEST 05 Evaluated public_works_clearing");
  assert(t5.data?.capabilitiesEvaluated?.includes("traffic_perimeter"), "TEST 05 Evaluated traffic_perimeter");
  assert(!t5.data?.capabilitiesEvaluated?.includes("trauma_care"), "TEST 05 Negative Check: Did NOT search hospitals without injuries");

  // --- TEST 06: Power Grid Outage (Standard Grid vs Hospital Context) ---
  console.log("\nExecuting TEST 06: Power Grid Outage (No Hospitals Mentioned)");
  const t6 = await postJson("/api/triage", {
    title: "Substation Feeder Tripped",
    description: "33kV feeder line tripped due to technical fault, cutting power to residential Sector 4. No hospitals or care facilities impacted.",
    category: "power_outage",
    location: "Jayanagar, Bengaluru",
    lat: 12.9250,
    lng: 77.5838,
  });

  assert(t6.ok, "TEST 06 API returns 200");
  assert(t6.data?.capabilitiesEvaluated?.includes("power_grid_isolation"), "TEST 06 Evaluated power_grid_isolation");
  assert(!t6.data?.capabilitiesEvaluated?.includes("critical_facility_backup"), "TEST 06 Negative Check: Did NOT query critical facility backup when no medical impact reported");

  console.log("\nExecuting TEST 07: Power Grid Outage (With Hospital Medical Oxygen Context)");
  const t7 = await postJson("/api/triage", {
    title: "Regional Blackout Threatening Hospital ICU Generators",
    description: "Grid transformer exploded. District hospital ICU and ventilator patients running on diesel backup with only 45 minutes fuel remaining.",
    category: "power_outage",
    location: "Victoria Hospital Area, Bengaluru",
    lat: 12.9634,
    lng: 77.5750,
  });

  assert(t7.ok, "TEST 07 API returns 200");
  assert(t7.data?.capabilitiesEvaluated?.includes("power_grid_isolation"), "TEST 07 Evaluated power_grid_isolation");
  assert(t7.data?.capabilitiesEvaluated?.includes("critical_facility_backup"), "TEST 07 Evaluated critical_facility_backup due to hospital patient context");

  // --- TEST 08: Gas Main Rupture ---
  console.log("\nExecuting TEST 08: Gas Main Rupture");
  const t8 = await postJson("/api/triage", {
    title: "Excavator Punctured Industrial Gas Line",
    description: "Excavator struck 8-inch pressurized natural gas line. Strong rotten-egg odor, high hiss noise. Immediate ignition hazard in dense area.",
    category: "gas_leak",
    location: "Peenya Industrial Area, Bengaluru",
    lat: 13.0285,
    lng: 77.5195,
  });

  assert(t8.ok, "TEST 08 API returns 200");
  assert(t8.data?.capabilitiesEvaluated?.includes("hazmat_containment"), "TEST 08 Evaluated hazmat_containment");
  assert(t8.data?.capabilitiesEvaluated?.includes("gas_grid_isolation"), "TEST 08 Evaluated gas_grid_isolation");
  assert(t8.data?.capabilitiesEvaluated?.includes("evacuation_support"), "TEST 08 Evaluated evacuation_support");

  // --- TEST 09: Structural Collapse & Extrication ---
  console.log("\nExecuting TEST 09: Structural Collapse & Extrication");
  const t9 = await postJson("/api/triage", {
    title: "Under-Construction Slab Collapse",
    description: "Reinforced concrete slab collapsed onto ground floor. 5 construction workers trapped under debris slabs.",
    category: "structural_collapse",
    peopleAffected: "5",
    location: "Electronic City Phase 1, Bengaluru",
    lat: 12.8452,
    lng: 77.6602,
  });

  assert(t9.ok, "TEST 09 API returns 200");
  assert(t9.data?.capabilitiesEvaluated?.includes("heavy_extrication_usar"), "TEST 09 Evaluated heavy_extrication_usar");
  assert(t9.data?.capabilitiesEvaluated?.includes("trauma_care"), "TEST 09 Evaluated trauma_care");

  // --- TEST 10: Contact Provenance & Usability Verification ---
  console.log("\nExecuting TEST 10: Contact Provenance & Zero Hallucinations");
  const resources = t1.data?.rankedResources || [];
  for (const res of resources) {
    if (res.contact?.phone) {
      assert(res.contact.phoneSource?.startsWith("OSM:"), `TEST 10 Contact phone has valid OSM provenance (${res.contact.phoneSource})`);
      assert(res.usability.hasDirectPhone === true, "TEST 10 usability.hasDirectPhone is true");
    }
  }

  // --- TEST 11: Protected Nearby Endpoint Security ---
  console.log("\nExecuting TEST 11: Protected Endpoint Security (GET /api/resources/nearby)");
  const unauthNearby = await getJson("/api/resources/nearby?lat=12.9716&lng=77.5946");
  assert(unauthNearby.status === 401, `TEST 11 Unauthenticated call rejected with 401 (got ${unauthNearby.status})`);

  // Authenticate as authority
  const authRes = await postJson("/api/auth/authority", { passcode: "2222" });
  assert(authRes.ok, "TEST 11 Authority authentication successful");
  const setCookie = authRes.headers.get("set-cookie") || "";
  const cookieHeader = setCookie.split(";")[0];

  const authNearby = await getJson("/api/resources/nearby?lat=12.9716&lng=77.5946&radiusKm=5", {
    Cookie: cookieHeader,
  });
  assert(authNearby.ok, "TEST 11 Authorized call to /api/resources/nearby returns 200");
  assert(Array.isArray(authNearby.data?.resources), "TEST 11 Returns array of ranked resources");

  // --- TEST 12: Incident Lifecycle & Snapshot Persistence ---
  console.log("\nExecuting TEST 12: Incident Lifecycle & Snapshot Persistence");
  const createIncident = await postJson("/api/incidents", {
    title: "Test Automated Verification Incident",
    category: t1.data.category,
    urgency: t1.data.urgency,
    description: "Automated test incident description.",
    location: "Test Location, Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    peopleAffected: t1.data.estimatedPeopleAffected,
    severityScore: t1.data.severityScore,
    zone: t1.data.zone,
    needs: t1.data.needs,
    summary: t1.data.summary,
    bestNextAction: t1.data.bestNextAction,
    confidence: t1.data.confidence,
    resources: t1.data.rankedResources,
    capabilitiesEvaluated: t1.data.capabilitiesEvaluated,
    timeline: [
      {
        timestamp: new Date().toISOString(),
        stage: "reported",
        title: "Report Ingested",
        description: "Test intake",
        actor: "citizen",
      },
    ],
  });

  assert(createIncident.ok, "TEST 12 Incident successfully persisted");
  const incidentId = createIncident.data?.id;
  assert(Boolean(incidentId), `TEST 12 Incident assigned ID: ${incidentId}`);

  // Test PATCH update
  const patchIncident = await fetch(`${BASE_URL}/api/incidents/${incidentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      status: "assigned",
      responseTeam: "Specialized Task Force",
    }),
  });
  assert(patchIncident.ok, "TEST 12 Authorized PATCH /api/incidents/:id returns 200");

  console.log("\n=================================================");
  console.log(`PHASE 2 ACCEPTANCE SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
