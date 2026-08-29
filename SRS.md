# Software Requirements Specification (SRS)
## Project Name: NeedNow Map — Intelligent Crisis Command & Triage Platform
**Version:** 0.4.0 (Phase 2: Resource Intelligence & Crisis Command Center)  
**Target Environment:** Next.js 16.2.4 (App Router, Turbopack) · React 19 · TypeScript 5 · Tailwind CSS v4  
**Document Purpose:** Complete technical and architectural blueprint to provide context for AI agent pairing, prompt engineering, and feature expansion.

---

## 1. Executive Summary & Product Vision

**NeedNow Map** is a real-time crisis management, civic reporting, and emergency dispatch orchestration platform. It operates as an **AI-Assisted Emergency Crisis Command Center** adhering to strict **decision-support principles**: AI investigates, correlates real geospatial evidence, and recommends capabilities; human dispatchers retain exclusive command authority to approve, override, and deploy.

### Key Value Propositions:
1. **Evidence-Based AI Crisis Triage Engine**: Operates a multi-stage investigation pipeline: parses incident telemetry, plans required capabilities against a Canonical Capability Registry, executes live **OpenStreetMap / Overpass** queries to discover actual nearby emergency facilities, extracts real contact telemetry (`phone`, `website`, `address`), assesses evidence quality, synthesizes facts with **Google Gemini 2.5 Flash**, and computes transparent **deterministic multi-dimensional confidence scores** in server-side logic.
2. **Canonical Resource Capability Registry**: 13 formally defined capabilities (`fire_suppression`, `heavy_extrication_usar`, `hazmat_containment`, `trauma_care`, `ems_transport`, `swift_water_rescue`, `traffic_perimeter`, `evacuation_support`, `power_grid_isolation`, `gas_grid_isolation`, `water_grid_isolation`, `public_works_clearing`, `critical_facility_backup`).
3. **Zero-Hallucination Contact Extraction**: Extracts real OSM contact tags (`phone`, `website`, `addr:*`, `operator`) with field-level provenance (`OSM:phone`). Missing contacts explicitly display `Contact unmapped in dataset`.
4. **Crisis Command Center Dashboard & Contextual Console**: 5-section Command Console with Situation Telemetry, AI Assessment Matrix, Operational Timeline, Ranked Resources Panel with direct `<a href="tel:...">Call</a>` and `<a href="..." target="_blank">Portal</a>` actions, and Human Dispatcher Override.
5. **Interactive Tactical Map Array**: Leaflet map with layer toggles (`🚒 Fire`, `🏥 Medical`, `⚡ Utilities`, `🚔 Police`), active search radii, and single-vector tactical relationship lines connecting incidents to top recommendations.
6. **Zero-Trust Server Authority Gate**: High-security emergency command authorization using server-side HMAC-SHA256 signed `httpOnly` session cookies and server-only `PASSCODE` verification.

---

## 2. Technical Stack & Dependencies

```json
{
  "framework": "Next.js 16.2.4 (Turbopack, App Router)",
  "runtime": "Node.js (TypeScript 5.x)",
  "frontend": {
    "core": "React 19.2.4",
    "styling": "Tailwind CSS v4 with CSS Variables (@tailwindcss/postcss)",
    "icons": "Lucide React (1.8.0)",
    "animations": "Framer Motion (12.38.0)"
  },
  "geospatial": {
    "mapping": "Leaflet 1.9.4 & React-Leaflet 5.0.0",
    "tiles": "CartoDB Dark Matter (with MAP_KEY via /api/map-config) / Dark OSM Fallback",
    "infrastructure_queries": "OpenStreetMap Overpass API (Primary)",
    "geocoding": "OpenStreetMap Nominatim REST API"
  },
  "ai_inference": {
    "sdk": "@google/genai 1.50.1",
    "model": "gemini-2.5-flash",
    "output_mode": "application/json (responseSchema validation)"
  },
  "streaming": {
    "protocol": "Server-Sent Events (SSE) via Web Streams API (ReadableStream)",
    "endpoint": "/api/triage/stream"
  },
  "persistence": {
    "primary": "Firebase Firestore 12.12.0",
    "secondary": "In-Memory Circular Buffer Store (memoryStore.ts)"
  },
  "security": {
    "token_signing": "Node.js Built-in Crypto (HMAC-SHA256)",
    "session_storage": "httpOnly, sameSite=lax, Secure Cookies"
  }
}
```

---

## 3. Canonical Capability Registry & Resource Ranking

### 3.1 Separation of Relevance vs Operational Usability
$$\text{Relevance Score} = (\text{Capability Match} \times 0.50) + (\text{Proximity Score} \times 0.40) + (\text{Context Specificity} \times 0.10)$$
- **Relevance**: Dictates ranking order based purely on capability match and physical proximity ($P(d) = 100 \times \exp(-0.15 \times d)$).
- **Usability Flags**: (`hasDirectPhone`, `hasWebsite`, `hasPhysicalAddress`, `has24x7OpeningHoursTag`) inform dispatcher actions (`Call`, `Portal`) without demoting closer unmapped facilities.

### 3.2 Emergency Response Resources vs Contextual Infrastructure
- **Emergency Response Resources**: Deployable units (Fire Stations, Hospitals, Ambulance Bases, Police, Rescue Stations).
- **Contextual Infrastructure**: Situational environmental context (Substations, Pipelines, Water Works, Depots, Hydrants) evaluated for risk assessment, but never ranked as response teams.

---

## 4. API Endpoints & Contracts

### 4.1 Protected Resource Intelligence Endpoint
- **`GET /api/resources/nearby`**
  - **Auth**: Required (`authority_session` cookie via `isAuthorized()`).
  - **Query Params**: `lat`, `lng`, `capability` (optional), `radiusKm` (default: 10).
  - **Response (200)**:
    ```json
    {
      "lat": 12.9716,
      "lng": 77.5946,
      "radiusKm": 5,
      "count": 4,
      "resources": [ ...RankedOperationalResource[] ],
      "retrievedAt": "2026-08-29T03:45:00.000Z",
      "source": "OpenStreetMap / Overpass API"
    }
    ```

### 4.2 Triage & SSE Streaming
- **`POST /api/triage/stream`**: Server-Sent Events stream emitting `step_update`, `search_started`, `evidence_found`, `resource_ranked`, `quality_assessed`, and `triage_complete`.
- **`POST /api/triage`**: REST route returning `EvidenceBasedTriageResponse`.

### 4.3 Incident Lifecycle
- **`GET /api/incidents`**: Returns all active and historic incidents.
- **`POST /api/incidents`**: Persists new incident with attached `resources`, `capabilitiesEvaluated`, and `timeline`.
- **`PATCH /api/incidents/[id]`**: Updates status, team assignments, or dispatcher overrides with memory fallback.
- **`POST /api/auth/authority`**: Validates `PASSCODE` and sets `authority_session` HMAC-SHA256 cookie.
