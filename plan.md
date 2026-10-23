# Zaydian Research Integrity — Project Plan

> **Status:** draft · **Version:** 1.0 · **Updated:** 2026-10-23
> **Approved by:** PENDING — do not start execution

---

## 1. Vision

Zaydian Research Integrity is a locally-persistent, collaborative research governance and data-management platform for a medical college research cell. It manages the full research lifecycle — proposals, council voting, project workspaces, SPSS-style datasets, analytics, publications — without a central research database, with role-based access control and auditable offline-capable synchronization. Success looks like: an institution can run its entire research cell offline-capable with no feature loss and a verifiable traceability matrix at delivery.

## 2. Scope

### In scope (v1)
- All 40 features transcribed in features.md (proposed; pending approval)
- Local-first PWA with IndexedDB
- RBAC, invitations, council voting, project workspaces
- SPSS-style Variable/Data View, validation, import/export
- Analytics dashboard + 9 advanced sections + Published Vault + department dashboards
- Offline sync (institution-controlled relay initial)
- Demo mode with synthetic data

### Out of scope (v1, explicitly)
- Hosted central research database — prohibited by architecture
- Real patient data in demo — prohibited
- Gmail-specific identity dependency — use verified email identity

## 3. Users and roles

See requirements §2 (System Owner, Research Cell Admin, Admin Council Member, Research Head, plus project team roles). Full matrix to be finalized in discovery.

## 4. Architecture

### 4.1 Shape
UI (React+TS+Vite) ⇄ local store (IndexedDB via Dexie) ⇄ CRDT (Yjs, proposed) ⇄ outbox ⇄ institution-controlled encrypted relay

### 4.2 Data flow for a single write
1. user action
2. write to local store — immediately, synchronously visible
3. apply CRDT update → persist update
4. enqueue in outbox
5. background sync when peer/relay reachable
6. peers apply update; convergence guaranteed by CRDT

### 4.3 Storage
| What | Where | Why |
|---|---|---|
| Primary data | IndexedDB (Dexie) | browser-local, durable |
| Attachments | OPFS blobs by hash | large binary off main store |
| Sync metadata | separate store | rebuildable independently |
| Keys | platform keystore | OS-level protection |

### 4.4 Sync topology
**Decision:** institution-controlled encrypted relay initial (Mode B/C hybrid) — see ADR to be recorded. Direct P2P (Mode A) added later without redesign.

### 4.5 Security model
TLS in transit; encryption at rest for sensitive records; least-privilege RBAC; device enrollment/revocation; audited admin actions.

### 4.6 Accessibility
Target WCAG 2.2 AA.

## 5. Tech stack — and why

| Layer | Choice | Reason | Rejected alternative |
|---|---|---|---|
| Language | TypeScript | type safety across FE/BE | JavaScript |
| UI framework | React | ecosystem, virtualized grids | Vue/Svelte |
| Build | Vite | fast dev, PWA plugin | Webpack |
| Local storage | IndexedDB (Dexie) | robust wrapper, offline | raw IDB |
| CRDT | Yjs (proposed) | mature, small | Automerge |
| Sync transport | institution relay (proposed) | reliable queueing | P2P-only |
| Styling | Tailwind CSS (proposed) | utility, consistent | CSS modules |
| Testing | Vitest + Playwright (proposed) | fast unit + E2E | Jest |
| Packaging | PWA | installable, offline | Tauri (desktop later) |

## 6. Task graph
To be built in Phase D after plan approval.

## 7. Milestones

| ID | Name | Goal | Features | Gate |
|---|---|---|---|---|
| M0 | Foundation | repo, CI, tokens, brand, auth bootstrap, RBAC | F-001,F-002,F-005,F-028,F-035 | build + lint green |
| M1 | Data core | local storage, sync engine skeleton, data model | F-003,F-004,F-028,F-030,F-035 | offline cold-start test |
| M2 | Governance & workspace | proposals, voting, project workspace, UI nav | F-006..F-011,F-034 | task gates + a11y |
| M3 | Data engine | Variable/Data View, forms, import/export, versioning | F-012..F-020 | data tests |
| M4 | Analytics & integrity | validation, audit, analytics, published vault, reports | F-021..F-027,F-033 | analytics reference match |
| M5 | Sync & security | sync modes, conflict handling, encryption, backups | F-029,F-031,F-032 | convergence suite |
| M6 | Demo & release | demo mode, reset/removal, integrity tests, docs | F-036..F-040 | final gate |

## 8. Risks

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Sync convergence bugs surface late | M | H | Convergence tests in M1 | Sync Engineer |
| R2 | Scope growth | M | M | Weekly traceability audit; Admin-only scope changes | Orchestrator |
| R3 | PII leakage in analytics | L | H | Field-level permission checks; small-cell suppression | Security Engineer |

## 9. Quality budget

| Metric | Budget |
|---|---|
| Cold start to interactive (offline, mid-range) | < 2.5s |
| Local write → UI | < 100ms |
| Initial bundle (compressed) | < 250KB |
| Accessibility | WCAG 2.2 AA, zero serious/critical axe findings |

## 10. Definition of Done (project level)

- [ ] 100% of Admin-approved features `verified` in the traceability matrix
- [ ] All milestone gates passed with recorded evidence
- [ ] Full suite green from a clean clone
- [ ] Installs and runs offline on a fresh machine
- [ ] No stubs, TODOs, or mock data in delivered code
- [ ] Docs complete and every command in them verified
- [ ] Final report + demo script delivered

## Changelog

| Version | Date | Author | Change | Reason |
|---|---|---|---|---|
| 1.0 | 2026-10-23 | Principal Architect | Initial draft | — |
