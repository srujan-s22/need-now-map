# Graph Report - gdg  (2026-09-13)

## Corpus Check
- 56 files · ~40,246 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 497 nodes · 705 edges · 68 communities (30 shown, 38 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0bca2435`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- investigationEngine.ts
- Incident
- 6. File-by-File Technical Reference
- cn
- dependencies
- compilerOptions
- devDependencies
- Software Requirements Specification (SRS)
- 6.7 UI & Layout Components (`src/components/`)
- auth.ts
- LiveMap.tsx
- 24.1 Route Catalog `[VERIFIED IN CODE]`
- generate_srs_pdf.mjs
- 20.1 Mathematical Formula `[VERIFIED IN CODE]`
- 2. Problem Statement & Civic Crisis Operational Context
- runTests
- README.md
- 12. Google Gemini Multi-Stage AI Architecture
- 15. Geospatial Architecture & Overpass Integration
- 3. Scope, Goals & Non-Goals
- 58. Formal Requirements Classification & Unique IDs
- map-config/route.ts
- 14. Incident-to-Capability Decision Engine
- 1. Executive Summary & Product Vision
- 23. Server-Sent Events (SSE) Investigation Stream Protocol
- 3. Stakeholders & User Roles
- 42. Automated Testing Architecture & Test Scripts
- 55. Developer Maintenance Guide ("How to Change X")
- Document Control & Governance
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- 10. Incident Data Model Specification
- 11. AI Triage & Investigation Data Models
- 13. Canonical Resource Capability Registry
- 17. CARTO Basemap Security & Configuration Model
- 18. Firebase / Cloud Firestore Architecture
- 19. In-Memory Storage & Circular Fallback Architecture
- 21. Deterministic Resource Ranking Engine
- 22. Geospatial Evidence & Provenance Tracking
- 25. Authority Authentication & Cryptographic Session Model
- 26. Security Model, Threat Analysis & Mitigations
- 27. Frontend Route Architecture
- 29. Custom Hooks & Client Telemetry Management
- 32. Crisis Command Center Dashboard Architecture
- 33. Incident Command Console Specification
- 34. Live Tactical Map Tracking Array (`/live-map`)
- 35. Citizen Intake & Telemetry Teleportation (`/report`)
- 36. Environment Variables & Configuration Matrix
- 37. Dependency Ecosystem & Tech Stack Justification
- 38. Build Configuration, PostCSS & SSR Constraints
- 39. Comprehensive Error Handling & Degraded Modes
- 40. Observability, Telemetry & Logging Architecture
- 41. Performance Optimization Architecture
- 44. Deployment Architecture & Production Readiness
- 45. Developer Onboarding & Local Setup Guide
- 47. External Service Contracts & SLA Limits
- 48. Privacy, PII & Data Handling Policies
- 49. AI Safety, Epistemic Grounding & Anti-Hallucination
- 50. System Limitations & Known Constraints
- 52. Architectural Decision Records (ADRs)
- 53. Technical Debt & Codebase Enhancement Opportunities
- 54. Future Extensibility Roadmap
- 59. Non-Functional Requirements (NFR) Specification
- 5. Complete Repository & Module Architecture

## God Nodes (most connected - your core abstractions)
1. `Software Requirements Specification (SRS)` - 65 edges
2. `Incident` - 16 edges
3. `compilerOptions` - 16 edges
4. `6.7 UI & Layout Components (`src/components/`)` - 16 edges
5. `runInvestigationPipeline()` - 14 edges
6. `cn()` - 13 edges
7. `24.1 Route Catalog `[VERIFIED IN CODE]`` - 12 edges
8. `6. File-by-File Technical Reference` - 11 edges
9. `6.3 Core Business Logic & Libraries (`src/lib/`)` - 10 edges
10. `SeverityZone` - 9 edges

## Surprising Connections (you probably didn't know these)
- `LiveMapProps` --references--> `Incident`  [EXTRACTED]
  src/components/shared/LiveMap.tsx → src/types/incident.ts
- `MiniMapProps` --references--> `TriageEvidence`  [EXTRACTED]
  src/components/shared/MiniMap.tsx → src/types/investigation.ts
- `SeverityBadgeProps` --references--> `SeverityZone`  [EXTRACTED]
  src/components/shared/SeverityBadge.tsx → src/types/incident.ts
- `POST()` --calls--> `runInvestigationPipeline()`  [EXTRACTED]
  src/app/api/analyze/route.ts → src/lib/investigationEngine.ts
- `GET()` --calls--> `isAuthorized()`  [EXTRACTED]
  src/app/api/auth/authority/route.ts → src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (68 total, 38 thin omitted)

### Community 0 - "investigationEngine.ts"
Cohesion: 0.08
Nodes (51): POST(), GET(), POST(), CATEGORY_LABELS, geocodeText(), NominatimResult, ReportPage(), reverseGeocode() (+43 more)

### Community 1 - "Incident"
Cohesion: 0.09
Nodes (28): POST(), DashboardPage(), IncidentPageProps, LiveMapPage(), EmptyState(), EmptyStateProps, IncidentCard(), IncidentCardProps (+20 more)

### Community 2 - "6. File-by-File Technical Reference"
Cohesion: 0.04
Nodes (45): 6.10 Test Suites (`scripts/`), 6.1 Configuration & Root Environment Files, 6.2 Data Models & TypeScript Definitions (`src/types/`), 6.3 Core Business Logic & Libraries (`src/lib/`), 6.4 Static Data & Constants (`src/data/`), 6.5 Contexts & Client State (`src/contexts/`), 6.6 Custom React Hooks (`src/hooks/`), 6.8 Pages & Routes (`src/app/`) (+37 more)

### Community 3 - "cn"
Cohesion: 0.10
Nodes (21): geistMono, geistSans, metadata, AppShell(), AppShellProps, MobileNav(), NAV_ITEMS, NAV_ITEMS (+13 more)

### Community 4 - "dependencies"
Cohesion: 0.07
Nodes (29): clsx, firebase, framer-motion, @google/genai, leaflet, lucide-react, next, dependencies (+21 more)

### Community 5 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 6 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+17 more)

### Community 7 - "Software Requirements Specification (SRS)"
Cohesion: 0.10
Nodes (20): 16.1 Leaflet Architecture `[VERIFIED IN CODE]`, 16. Interactive Map Architecture & Basemap Configuration, 28. React Component Architecture & Component Hierarchy, 30. Incident Lifecycle State Machine, 31.1 Override Data Preservation `[VERIFIED IN CODE]`, 31. Human-in-the-Loop Override & Audit Telemetry, 43. Functional Acceptance Test Matrix, 46.1 Cloud Firestore Collection Structure `[VERIFIED IN CODE]` (+12 more)

### Community 8 - "6.7 UI & Layout Components (`src/components/`)"
Cohesion: 0.12
Nodes (16): 6.7 UI & Layout Components (`src/components/`), `src/components/layout/AppShell.tsx` `[VERIFIED IN CODE]`, `src/components/layout/MobileNav.tsx` `[VERIFIED IN CODE]`, `src/components/layout/Sidebar.tsx` `[VERIFIED IN CODE]`, `src/components/shared/AuthorityGate.tsx` `[VERIFIED IN CODE]`, `src/components/shared/EmptyState.tsx` `[VERIFIED IN CODE]`, `src/components/shared/FirebaseWarningBanner.tsx` `[VERIFIED IN CODE]`, `src/components/shared/IncidentCard.tsx` `[VERIFIED IN CODE]` (+8 more)

### Community 9 - "auth.ts"
Cohesion: 0.27
Nodes (11): GET(), POST(), PATCH(), AUTHORITY_COOKIE_NAME, createSessionToken(), getExpectedPasscode(), getSecretKey(), isAuthorized() (+3 more)

### Community 10 - "LiveMap.tsx"
Cohesion: 0.22
Nodes (8): MiniMap, LiveMap(), LiveMapProps, LiveMap, MiniMap(), MiniMapProps, fetchMapTileUrl(), useMapConfig()

### Community 11 - "24.1 Route Catalog `[VERIFIED IN CODE]`"
Cohesion: 0.15
Nodes (13): 10. `POST /api/incidents`, 11. `PATCH /api/incidents/[id]`, 1. `GET /api/auth/authority`, 24.1 Route Catalog `[VERIFIED IN CODE]`, 24. Complete API Reference & Route Contracts, 2. `POST /api/auth/authority`, 3. `DELETE /api/auth/authority`, 4. `GET /api/map-config` (+5 more)

### Community 12 - "generate_srs_pdf.mjs"
Cohesion: 0.29
Nodes (7): buildHtml(), __dirname, __filename, main(), markdownContent, OUTPUT_PDF_PATH, SRS_MD_PATH

### Community 13 - "20.1 Mathematical Formula `[VERIFIED IN CODE]`"
Cohesion: 0.29
Nodes (7): 1. Location Confidence ($L$), 20.1 Mathematical Formula `[VERIFIED IN CODE]`, 20. Deterministic Mathematical Confidence Engine, 2. Classification Confidence ($C$), 3. Severity Confidence ($S$), 4. Evidence Corroboration ($E$), 5. Penalties ($\text{Penalty Sum}$)

### Community 14 - "2. Problem Statement & Civic Crisis Operational Context"
Cohesion: 0.33
Nodes (6): 2.1 Core Problem Statement `[VERIFIED IN CODE]`, 2.2 Key Operational Pain Points `[VERIFIED IN CODE]`, 2.3 The NeedNow Map Solution Architecture `[VERIFIED IN CODE]`, 2.4 Target Beneficiaries & Operational Impact `[VERIFIED IN CODE]`, 2.5 Executive Value Proposition `[VERIFIED IN CODE]`, 2. Problem Statement & Civic Crisis Operational Context

### Community 15 - "runTests"
Cohesion: 0.60
Nodes (3): getJson(), postJson(), runTests()

### Community 16 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 17 - "12. Google Gemini Multi-Stage AI Architecture"
Cohesion: 0.50
Nodes (4): 12.1 SDK & Model Configuration `[VERIFIED IN CODE]`, 12.2 Multi-Stage Pipeline Breakdown `[VERIFIED IN CODE]`, 12.3 AI vs Deterministic Division Matrix `[VERIFIED IN CODE]`, 12. Google Gemini Multi-Stage AI Architecture

### Community 18 - "15. Geospatial Architecture & Overpass Integration"
Cohesion: 0.50
Nodes (4): 15.1 Overpass API Mirrors & Resilient Failover `[VERIFIED IN CODE]`, 15.2 In-Memory 5-Minute Spatial Cache `[VERIFIED IN CODE]`, 15.3 Great-Circle Haversine Distance Formula `[VERIFIED IN CODE]`, 15. Geospatial Architecture & Overpass Integration

### Community 19 - "3. Scope, Goals & Non-Goals"
Cohesion: 0.50
Nodes (4): 3.1 Scope `[VERIFIED IN CODE]`, 3.2 Goals `[VERIFIED IN CODE]`, 3.3 Non-Goals `[VERIFIED IN CODE]`, 3. Scope, Goals & Non-Goals

### Community 20 - "58. Formal Requirements Classification & Unique IDs"
Cohesion: 0.50
Nodes (4): 58.1 Functional Requirements (FR), 58.2 Non-Functional Requirements (NFR), 58.3 Security Requirements (SEC), 58. Formal Requirements Classification & Unique IDs

### Community 22 - "14. Incident-to-Capability Decision Engine"
Cohesion: 0.67
Nodes (3): 14.1 Scoping Rules `[VERIFIED IN CODE]`, 14.2 Negative Scoping Guarantees `[VERIFIED IN CODE]`, 14. Incident-to-Capability Decision Engine

### Community 23 - "1. Executive Summary & Product Vision"
Cohesion: 0.67
Nodes (3): 1.1 Executive Summary `[VERIFIED IN CODE]`, 1.2 Decision-Support Paradigm `[VERIFIED IN CODE]`, 1. Executive Summary & Product Vision

### Community 24 - "23. Server-Sent Events (SSE) Investigation Stream Protocol"
Cohesion: 0.67
Nodes (3): 23.1 SSE Protocol Contract `[VERIFIED IN CODE]`, 23.2 Event Types & Schemas `[VERIFIED IN CODE]`, 23. Server-Sent Events (SSE) Investigation Stream Protocol

### Community 25 - "3. Stakeholders & User Roles"
Cohesion: 0.67
Nodes (3): 3.1 Role Hierarchy `[VERIFIED IN CODE]`, 3.2 Role Matrix `[VERIFIED IN CODE]`, 3. Stakeholders & User Roles

### Community 26 - "42. Automated Testing Architecture & Test Scripts"
Cohesion: 0.67
Nodes (3): 42.1 Test Execution `[VERIFIED IN CODE]`, 42.2 Test Suite Coverage Matrix `[VERIFIED IN CODE]`, 42. Automated Testing Architecture & Test Scripts

### Community 27 - "55. Developer Maintenance Guide ("How to Change X")"
Cohesion: 0.67
Nodes (3): 55.1 How to Add a New Incident Category, 55.2 How to Add a New Resource Capability, 55. Developer Maintenance Guide ("How to Change X")

### Community 28 - "Document Control & Governance"
Cohesion: 0.67
Nodes (3): Document Control & Governance, Epistemic Categorization Standards, Revision History

## Knowledge Gaps
- **238 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+233 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Software Requirements Specification (SRS)` connect `Software Requirements Specification (SRS)` to `6. File-by-File Technical Reference`, `24.1 Route Catalog `[VERIFIED IN CODE]``, `20.1 Mathematical Formula `[VERIFIED IN CODE]``, `2. Problem Statement & Civic Crisis Operational Context`, `12. Google Gemini Multi-Stage AI Architecture`, `15. Geospatial Architecture & Overpass Integration`, `3. Scope, Goals & Non-Goals`, `58. Formal Requirements Classification & Unique IDs`, `14. Incident-to-Capability Decision Engine`, `1. Executive Summary & Product Vision`, `23. Server-Sent Events (SSE) Investigation Stream Protocol`, `3. Stakeholders & User Roles`, `42. Automated Testing Architecture & Test Scripts`, `55. Developer Maintenance Guide ("How to Change X")`, `Document Control & Governance`, `10. Incident Data Model Specification`, `11. AI Triage & Investigation Data Models`, `13. Canonical Resource Capability Registry`, `17. CARTO Basemap Security & Configuration Model`, `18. Firebase / Cloud Firestore Architecture`, `19. In-Memory Storage & Circular Fallback Architecture`, `21. Deterministic Resource Ranking Engine`, `22. Geospatial Evidence & Provenance Tracking`, `25. Authority Authentication & Cryptographic Session Model`, `26. Security Model, Threat Analysis & Mitigations`, `27. Frontend Route Architecture`, `29. Custom Hooks & Client Telemetry Management`, `32. Crisis Command Center Dashboard Architecture`, `33. Incident Command Console Specification`, `34. Live Tactical Map Tracking Array (`/live-map`)`, `35. Citizen Intake & Telemetry Teleportation (`/report`)`, `36. Environment Variables & Configuration Matrix`, `37. Dependency Ecosystem & Tech Stack Justification`, `38. Build Configuration, PostCSS & SSR Constraints`, `39. Comprehensive Error Handling & Degraded Modes`, `40. Observability, Telemetry & Logging Architecture`, `41. Performance Optimization Architecture`, `44. Deployment Architecture & Production Readiness`, `45. Developer Onboarding & Local Setup Guide`, `47. External Service Contracts & SLA Limits`, `48. Privacy, PII & Data Handling Policies`, `49. AI Safety, Epistemic Grounding & Anti-Hallucination`, `50. System Limitations & Known Constraints`, `52. Architectural Decision Records (ADRs)`, `53. Technical Debt & Codebase Enhancement Opportunities`, `54. Future Extensibility Roadmap`, `59. Non-Functional Requirements (NFR) Specification`, `5. Complete Repository & Module Architecture`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Why does `6. File-by-File Technical Reference` connect `6. File-by-File Technical Reference` to `6.7 UI & Layout Components (`src/components/`)`, `Software Requirements Specification (SRS)`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `6.7 UI & Layout Components (`src/components/`)` connect `6.7 UI & Layout Components (`src/components/`)` to `6. File-by-File Technical Reference`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _238 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `investigationEngine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07589285714285714 - nodes in this community are weakly interconnected._
- **Should `Incident` be split into smaller, more focused modules?**
  _Cohesion score 0.08585858585858586 - nodes in this community are weakly interconnected._
- **Should `6. File-by-File Technical Reference` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._