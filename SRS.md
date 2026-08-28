# Software Requirements Specification (SRS)
## Project Name: NeedNow Map — Intelligent Crisis Command & Triage Platform
**Version:** 0.3.0  
**Target Environment:** Next.js 16.2.4 (App Router, Turbopack) · React 19 · TypeScript 5 · Tailwind CSS v4  
**Document Purpose:** Complete technical and architectural blueprint to provide context for AI agent pairing, prompt engineering, and feature expansion.

---

## 1. Executive Summary & Product Vision

**NeedNow Map** is a real-time crisis management, civic reporting, and emergency dispatch orchestration platform. It is engineered to bridge civilian situational reports with municipal crisis command response units (Fire, Medical, Water Rescue, Public Works, Utility Grid).

### Key Value Propositions:
1. **Evidence-Based AI Crisis Triage Engine**: Operates a multi-stage investigation pipeline: parses incident telemetry, plans required infrastructure searches, executes real **OpenStreetMap / Overpass** queries to discover actual nearby emergency facilities, assesses evidence quality, synthesizes facts with **Google Gemini 2.5 Flash**, and computes transparent **deterministic multi-dimensional confidence scores** purely in server-side logic.
2. **Live SSE Investigation Telemetry & Map HUD**: Streams real-time investigation steps via Server-Sent Events (`/api/triage/stream`), rendering a live tactical activity feed and dynamic pulsating search radius overlays with real verified evidence markers on Leaflet maps.
3. **Geospatial Command Array**: Fullscreen and dashboard-integrated Leaflet mapping with real-time incident pins, custom markers, reverse-geocoding autocomplete via OpenStreetMap Nominatim, and device GPS capture.
4. **Temporal Playback Engine**: Command dashboard time-slider allowing dispatchers to replay incident timelines across past intervals (15m, 30m, 1h, 2h, 4h, 12h, 24h) or stay locked on live telemetries.
5. **Resilient Dual-Tier Storage**: Hybrid persistence supporting **Cloud Firestore** for multi-client real-time synchronization, with automatic seamless failover to in-memory store if Firestore rules or connectivity are offline.
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
    "tiles": "CartoDB Dark Matter / OpenStreetMap",
    "infrastructure_queries": "OpenStreetMap Overpass API (Primary)",
    "geocoding": "OpenStreetMap Nominatim REST API (Geocoding & Reverse only)"
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

## 3. Evidence-Based Triage & Investigation Engine Architecture

### 3.1 Pipeline Flow
```
Incident Input (Title, Description, Category, People, Lat/Lng)
  │
  ├─► Stage 1: Telemetry Parser & Location Precision Evaluator (GPS vs Address vs Unresolved)
  ├─► Stage 2: Gemini Investigation Planner (Determines relevant searches & bounded radius)
  ├─► Stage 3: Controlled Geospatial Tool Execution (OpenStreetMap Overpass API + Haversine km)
  ├─► Stage 4: Evidence Normalization & Quality Stage (Completeness, Provenance, Contradictions)
  ├─► Stage 5: Gemini Evidence Reasoner (Facts vs Inferences vs Acknowledged Unknowns)
  ├─► Stage 6: Deterministic Confidence Calculator (Server-side weighted math & factor generation)
  └─► Stage 7: SSE Event Stream Broadcast & Live Map HUD Visualization
```

### 3.2 Epistemic Standards & Truth in AI
- **Strict Evidence Provenance**: Every discovered asset retains source attribution (`OpenStreetMap / Overpass API`), query timestamp, coordinates, and exact spherical distance in km.
- **Fact vs Inference Separation**:
  - `FACT`: Direct citizen report telemetry and verified mapped infrastructure in the vicinity.
  - `INFERENCE`: Operational tactical deductions based on verified facts.
  - `UNKNOWN`: Acknowledged limitations (e.g. real-time unit readiness and active staffing load are unavailable).
- **Proximity vs Severity Separation**: Proximity to fire stations or hospitals informs operational dispatch coverage, but does **not** artificially increase crisis severity. Severity is determined strictly by life-safety threats, casualty counts, and hazard escalation.

### 3.3 Deterministic Confidence Mathematical Formula
Final confidence is **never** generated arbitrarily by Gemini. It is computed deterministically in application code:

$$\text{Base Confidence} = (\text{Classification} \times 0.30) + (\text{Severity} \times 0.25) + (\text{Evidence} \times 0.25) + (\text{Location} \times 0.20)$$
$$\text{Overall Confidence} = \text{Clamp}_{15}^{99}\left( \text{Base Confidence} - \sum \text{Penalties} \right)$$

- **Classification Confidence ($C$)**: Evaluated from description density, specific hazard terminology, and category alignment.
- **Severity Confidence ($S$)**: Evaluated from clarity of life-safety impact indicators and hazard escalation metrics.
- **Evidence Quality & Coverage ($E$)**: Evaluated from query execution success, mapped facility density, and source reliability.
- **Location Precision ($L$)**: `exact_gps` = 98%, `resolved_address` = 90%, `approximate_city` = 60%, `unresolved` = 30%.
- **Deduction Penalties**: Discrepancies ($-8\%$ per item), Missing Critical Telemetry ($-5\%$ to $-15\%$), Degraded Mode ($-15\%$).

---

## 4. API Endpoints & Contracts

### 4.1 POST `/api/triage/stream` (SSE Live Stream)
- Request: JSON `IncidentInputPayload`
- Response: `text/event-stream; charset=utf-8` emitting events:
  - `step_update`: Updates investigation lifecycle steps.
  - `search_started`: Emits search type, center `(lat, lng)`, and `radiusKm` (renders search circle on map).
  - `evidence_found`: Emits individual verified `TriageEvidence` item (drops marker on map with distance badge).
  - `search_completed`: Emits total items found and nearest distance.
  - `quality_assessed`: Emits completeness and contradiction counts.
  - `triage_complete`: Emits final `EvidenceBasedTriageResponse`.

### 4.2 POST `/api/triage` & POST `/api/analyze` (REST)
- Request: JSON `IncidentInputPayload`
- Response: Complete `EvidenceBasedTriageResponse` JSON payload.

### 4.3 Incident Persistence Endpoints
- `GET /api/incidents`: Fetch active queue with Firestore + memory fallback.
- `POST /api/incidents`: Create dispatched incident with full audit fields (`confidenceBreakdown`, `evidenceCount`, `isOverridden`).
- `PATCH /api/incidents/[id]`: Protected authority route for status / assignment changes.

---

## 5. Security & Authority Access Control

- **HMAC-SHA256 Signed Session Token**: Cryptographically signed cookie `authority_session` containing `{ role: "authority", issuedAt, expiresAt }`.
- **Server-Only Passcode**: `PASSCODE=2222` defined strictly in `.env.local` without exposing client variables.
- **Authority Gate Verification**: Async server-side `isAuthorized()` verification required before critical emergency modifications.
