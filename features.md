# Zaydian Research Integrity — Feature Registry

> Transcribed from Admin requirements (2026-10-23). Status: proposed. Approval pending at plan approval gate.

## Summary

| Metric | Count |
|---|---|
| Total features | 40 |
| Approved | 0 |
| Verified | 0 |
| Deferred | 0 |
| Dropped | 0 |
| Traceability | 0% |

---

## Registry

### F-001 — Secure one-time owner bootstrap and system settings

- **Status:** proposed
- **Source:** admin
- **Owner:** System Owner / Super Admin
- **Milestone:** M0
- **Description:** Initial owner account via secure one-time setup; configure institution, departments, policies, backups, sync, security; view institution-wide audit; secure recovery route; exceptional overrides require recorded reason and audit event.
- **Acceptance criteria:**
  - AC1 owner bootstrap is one-time and audited
  - AC2 settings persist locally and sync
  - AC3 override requires reason and audit event
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-002 — Role-based access control enforced by backend and sync

- **Status:** proposed
- **Source:** admin
- **Owner:** Security Engineer
- **Milestone:** M0
- **Description:** RBAC with permissions enforced by backend and rechecked during synchronization; button hiding is not security; project- and dataset-level configurable permissions.
- **Acceptance criteria:**
  - AC1 unauthorized API calls return 403
  - AC2 sync rechecks permissions
  - AC3 statistician cannot access PII by default
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-003 — Research team invitation and registration workflow

- **Status:** proposed
- **Source:** admin
- **Owner:** Backend/Local-Service Engineer
- **Milestone:** M1
- **Description:** Authorized admin/team lead issues single-use expiring email invitation; invitee verifies email, registers, activates after verification/approval; statuses Pending/Accepted/Expired/Revoked/Suspended; no duplicate accounts per verified email per institution.
- **Acceptance criteria:**
  - AC1 invitation token single-use and expiring
  - AC2 duplicate email prevented
  - AC3 status transitions auditable
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-004 — Administrator invitation and provenance

- **Status:** proposed
- **Source:** admin
- **Owner:** Backend/Local-Service Engineer
- **Milestone:** M1
- **Description:** Only authorized existing admin can create/promote admin; profile shows name, verified email, role/scope, registration date, status, created_by_admin_id (immutable), invitation/acceptance timestamps, role-change and revocation history.
- **Acceptance criteria:**
  - AC1 created_by_admin_id immutable in UI
  - AC2 team lead cannot grant admin
  - AC3 provenance displayed
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-005 — Authentication, sessions, MFA and recovery

- **Status:** proposed
- **Source:** admin
- **Owner:** Security Engineer
- **Milestone:** M0
- **Description:** Secure login/logout, session expiry, account recovery; modern password hashing; email verification and password reset with expiring tokens; optional MFA for admins; rate limiting/brute-force protection/session revocation; no plaintext passwords or reusable tokens in shared data; credentials stored separately from research records.
- **Acceptance criteria:**
  - AC1 password hashed with modern algorithm
  - AC2 rate limiting enforced
  - AC3 reset tokens expire
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---
### F-006 — Admin council proposal workflow

- **Status:** proposed
- **Source:** admin
- **Owner:** Product Manager
- **Milestone:** M2
- **Description:** Research head creates draft proposal (title, department, research question, PI, design, synopsis links); submits for council review; eligible members vote; system evaluates threshold/quorum/deadline; result recorded; only approved proposals become active projects with auto-generated project ID.
- **Acceptance criteria:**
  - AC1 proposal cannot become project without approval
  - AC2 project ID auto-generated
  - AC3 result recorded with tally
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-007 — Configurable council voting rules

- **Status:** proposed
- **Source:** admin
- **Owner:** Principal Architect
- **Milestone:** M2
- **Description:** Support simple majority, strict majority of all eligible, unanimous, configurable quorum, abstentions, deadlines, conditional approvals, rejection/resubmission, tie outcome, reconsideration; recommended default > half of eligible non-recused with min quorum; tie not approval.
- **Acceptance criteria:**
  - AC1 tie not approval
  - AC2 quorum enforced
  - AC3 policy visible before voting
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-008 — Vote integrity and audit

- **Status:** proposed
- **Source:** admin
- **Owner:** Backend/Local-Service Engineer
- **Milestone:** M2
- **Description:** One active vote per eligible member per proposal; store voter identity, choice, timestamp, proposal version; prevent unauthorized changes; preserve vote changes as history if amendments allowed; freeze decision when closing rule met; recused members excluded; record final decision/tally/threshold/timestamp; material scientific change triggers re-review.
- **Acceptance criteria:**
  - AC1 duplicate vote prevented
  - AC2 vote changes preserved as history
  - AC3 recused excluded from quorum
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-009 — Research project workspace (tabs)

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M2
- **Description:** Dedicated workspace with tabs: Overview, Team, Progress, Links/Documents, Tasks/Communication, Data/Analysis, Submissions/Publication, Audit/History; each with specified fields.
- **Acceptance criteria:**
  - AC1 all tabs present
  - AC2 fields per spec
  - AC3 permissions enforced per tab
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-010 — Project lifecycle stages and milestones

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M2
- **Description:** Configurable 20 research lifecycle stages with responsible person, dates, status, evidence, notes; prerequisite checks (e.g. recruitment requires ethics approval).
- **Acceptance criteria:**
  - AC1 stages configurable
  - AC2 prerequisites enforced
  - AC3 completion evidence stored
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-011 — Project links and documents

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M2
- **Description:** Paste links under fixed headings (IRB/Ethics, Synopsis, Manuscript plus recommended); each entry has category, title, URL, description, version/date, added by, modified, expiry/review, verification status; opens in safe new context; URL validation; distinguish external link vs stored doc.
- **Acceptance criteria:**
  - AC1 URL validation
  - AC2 headings fixed
  - AC3 opens safely
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-012 — Tasks and communication

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M3
- **Description:** Assign tasks with priorities/deadlines/dependencies; record status and completion evidence; comments/mentions; notifications for invitations/approvals/due dates/reviews; activity timeline; unread notifications and preferences.
- **Acceptance criteria:**
  - AC1 task assignment
  - AC2 notifications
  - AC3 activity timeline
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-013 — SPSS-style Variable View

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M3
- **Description:** Variable View with Name, Type, Width, Decimals, Label, Values, Missing, Columns, Align, Measure, Role, Format, Validation; editable only by dataset-design permission; changes affecting records trigger validation and preview.
- **Acceptance criteria:**
  - AC1 all columns present
  - AC2 permission-gated
  - AC3 preview before apply
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-014 — Variable creation, editing and schema versioning

- **Status:** proposed
- **Source:** admin
- **Owner:** Database Engineer
- **Milestone:** M3
- **Description:** Add/duplicate/rename/reorder variables; edit labels/value labels; change measurement levels; configure precision/date formats; required/optional; valid ranges/enumerations; missing codes; units/derivation/source notes; mark identifiers/sensitive; allowed edit roles; computed read-only; duplicate detection; type-conversion preview; schema version history.
- **Acceptance criteria:**
  - AC1 variable CRUD
  - AC2 schema versioning
  - AC3 type-conversion preview
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-015 — Data View grid

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M3
- **Description:** Rows/cols grid; add/edit/delete authorized records; freeze columns; sort multi; filter; search; resize/reorder/hide columns; virtualized rows; labels/raw values; missing distinct from zero; validation errors in cells; copy/paste rectangular; keyboard nav; bulk edit authorized+confirmed; undo/redo local; durable save; unsynced/conflict indicators; import/export.
- **Acceptance criteria:**
  - AC1 virtualized grid
  - AC2 missing distinct from zero
  - AC3 conflict indicators
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-016 — Value labels and missing data

- **Status:** proposed
- **Source:** admin
- **Owner:** Database Engineer
- **Milestone:** M3
- **Description:** Display labels while retaining raw values; distinguish genuine zero, blank/null, not applicable, unknown, refused/not reported, user-defined missing codes; missing explicit; no silent conversion to zero.
- **Acceptance criteria:**
  - AC1 missing codes preserved
  - AC2 zero vs missing distinct
  - AC3 export preserves
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-017 — Import and export (CSV, XLSX, JSON, SPSS/Stata/R)

- **Status:** proposed
- **Source:** admin
- **Owner:** Backend/Local-Service Engineer
- **Milestone:** M3
- **Description:** CSV/XLSX/JSON import/export; SPSS .sav where library available; Stata/R optional; import with column mapping, type inference preview, duplicate column detection, date parsing, missing mapping, invalid value reporting, duplicate record checks, transactional import, provenance/counts; export preserves metadata with disclosure of unsupported.
- **Acceptance criteria:**
  - AC1 transactional import
  - AC2 metadata preserved
  - AC3 actionable errors
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-018 — Dataset versioning and provenance

- **Status:** proposed
- **Source:** admin
- **Owner:** Database Engineer
- **Milestone:** M3
- **Description:** Each meaningful update produces version/change history: schema version, actor, timestamp, records added/modified/deleted, validation results, source/import batch, reason, sync status; restore earlier version creates new version; compare versions.
- **Acceptance criteria:**
  - AC1 restore creates new version
  - AC2 audit history preserved
  - AC3 comparison works
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-019 — Data collection forms

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M3
- **Description:** Form generated from schema; one participant per record; mandatory validation; range/logic checks; conditional questions; date/time controls; dropdowns/radio; autosave/offline drafts; completion status; unique IDs; duplicate detection; correction requests/review flags; submission workflow; optional e-consent if approved; only authorized collectors create/submit.
- **Acceptance criteria:**
  - AC1 form validation
  - AC2 offline drafts
  - AC3 role gating
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-020 — Participant phone number privacy safeguards

- **Status:** proposed
- **Source:** admin
- **Owner:** Security Engineer
- **Milestone:** M3
- **Description:** Required phone number field; stored separately from de-identified dataset; encrypted at rest and in sync; restricted access; masked in general tables/analytics; excluded from statistical exports by default; record collection purpose/authorization/consent/legal basis; retention/deletion/de-identification workflows; never primary participant ID.
- **Acceptance criteria:**
  - AC1 encrypted at rest
  - AC2 masked in UI
  - AC3 excluded from exports by default
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-021 — Validation engine

- **Status:** proposed
- **Source:** admin
- **Owner:** Backend/Local-Service Engineer
- **Milestone:** M4
- **Description:** Required fields, type checks, valid ranges, date consistency, duplicate detection, conditional rules, cross-variable logic, outlier flags, inconsistent categories, missingness summaries, schema conformity, import validation reports; outliers flagged not deleted.
- **Acceptance criteria:**
  - AC1 outliers flagged
  - AC2 invalid records excluded from clean analytics
  - AC3 import report
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-022 — Change tracking and audit history

- **Status:** proposed
- **Source:** admin
- **Owner:** Database Engineer
- **Milestone:** M4
- **Description:** Append-only history of committed changes; record actor, time, record, field, reason; preserve previous values for protected data; approved corrections separate; track schema mods and analysis script versions; record exports/permission changes; distinguish user vs sync events.
- **Acceptance criteria:**
  - AC1 append-only
  - AC2 before/after values
  - AC3 sync events distinguished
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-023 — Integrity and compliance safeguards

- **Status:** proposed
- **Source:** admin
- **Owner:** Security Engineer
- **Milestone:** M4
- **Description:** Require documented ethics status for human-participant research; prevent unauthorized recruitment progression; store protocol amendments/approval versions; consent documentation and withdrawal workflows; separate identifiers from analytical data; controlled exports; backup verification/restore testing; breach/incident log for authorized admins.
- **Acceptance criteria:**
  - AC1 ethics gating
  - AC2 consent/withdrawal
  - AC3 incident log
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-024 — Analytics Dashboard (5 KPIs + department table + charts)

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M4
- **Description:** KPI cards: total registered projects (unique), active pipeline, under submission review, accepted/selected, total completed publications; department distribution table; charts active vs published by dept, output, stage distribution, publication totals over time; filters by dept/year/status/study type.
- **Acceptance criteria:**
  - AC1 KPIs from live data
  - AC2 filters work
  - AC3 no double counting
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-025 — Advanced Analytics (9 sections)

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M4
- **Description:** Section 1 executive KPIs; 2 dept x phase heatmap; 3 submission funnel; 4 first-author leaderboard; 5 monthly submission velocity; 6 synopsis approval x manuscript matrix; 7 presentation/venue mix; 8 cross-dept collaboration matrix; 9 institutional health scorecard (weighted 0-100 with labels).
- **Acceptance criteria:**
  - AC1 all 9 sections
  - AC2 drill-downs
  - AC3 scorecard labeled
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-026 — Published Vault

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M4
- **Description:** Dedicated publication repository with 9 original fields plus recommended; search/filter/sort/export/duplicate detection; DOI/indexing verified not inferred.
- **Acceptance criteria:**
  - AC1 9 fields present
  - AC2 search/filter
  - AC3 DOI validation
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-027 — Department-level dashboard

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M4
- **Description:** Per-department dashboard with registered studies, stage counts, awaiting synopsis/ethics, recruitment/collection, data completeness/unresolved queries, approaching deadlines, manuscripts in prep, submissions under review, accepted presentations, published output, collaborations, team composition, trends, comparison with institution totals; role-scoped; no small-cell identification.
- **Acceptance criteria:**
  - AC1 role-scoped
  - AC2 small-cell suppression
  - AC3 trend charts
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-028 — Local-first architecture and offline PWA

- **Status:** proposed
- **Source:** admin
- **Owner:** Principal Architect
- **Milestone:** M1
- **Description:** React+TS+Vite PWA; service worker for shell caching/offline loading; IndexedDB (Dexie); virtualized grid; charting; no central research DB; each device holds replica; durable local writes.
- **Acceptance criteria:**
  - AC1 offline cold start works
  - AC2 local writes durable
  - AC3 no central DB required
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-029 — Synchronization modes (P2P, relay, institution node)

- **Status:** proposed
- **Source:** admin
- **Owner:** Sync & Offline Engineer
- **Milestone:** M5
- **Description:** Pluggable sync layer supporting direct P2P (WebRTC+signaling), encrypted relay (queue/forward), institution-controlled network node; documented limitations; recommended institution-controlled relay initial.
- **Acceptance criteria:**
  - AC1 pluggable transport
  - AC2 mode selectable
  - AC3 documented limits
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-030 — Sync engine (ops, queue, checkpoints, idempotency, tombstones)

- **Status:** proposed
- **Source:** admin
- **Owner:** Sync & Offline Engineer
- **Milestone:** M5
- **Description:** Durable local write-ahead/change queue; unique op IDs; device/actor IDs; per-record version metadata; sync cursor/checkpoint; acknowledgments; retries with backoff; idempotent processing; tombstones for deletes; schema-version negotiation; permission checks on arrival; recovery after closure/restart; status Local Only/Pending/Syncing/Synced/Conflict/Error; manual retry/diagnostics.
- **Acceptance criteria:**
  - AC1 idempotent
  - AC2 tombstones
  - AC3 recovery after restart
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-031 — Conflict handling

- **Status:** proposed
- **Source:** admin
- **Owner:** Sync & Offline Engineer
- **Milestone:** M5
- **Description:** Deterministic field-aware resolution: different fields merge auto; same field conflict flagged or configured rule; participant records preserve both histories; delete/edit conflicts not silently discarded; schema changes compatibility check; permission changes apply current authoritative; council votes use governance protocol; audit records append; conflict screen shows fields/versions/timestamps/options.
- **Acceptance criteria:**
  - AC1 field-aware merge
  - AC2 conflict screen
  - AC3 no silent overwrite
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-032 — Security, encryption and backups

- **Status:** proposed
- **Source:** admin
- **Owner:** Security Engineer
- **Milestone:** M5
- **Description:** TLS transport; authenticated/authorized sync sessions; encryption at rest for sensitive local records; E2E encryption for sensitive payloads; key management; device enrollment/revocation; least privilege; secure backup/export; integrity checks; session expiry/recovery; replay/forgery protection; audited admin actions; configurable retention/de-identification.
- **Acceptance criteria:**
  - AC1 encryption at rest
  - AC2 device revocation
  - AC3 backup restore tested
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-033 — Reports and exports (PDF, XLSX, CSV, JSON)

- **Status:** proposed
- **Source:** admin
- **Owner:** Technical Writer
- **Milestone:** M4
- **Description:** Downloadable institutional reports: research summary, departmental annual, project progress, submission/publication, data quality, team contribution, council decision register, audit/sync health; include period, generation time, filters, metric definitions, permissions; participant-level exports require authorization+audit.
- **Acceptance criteria:**
  - AC1 report types
  - AC2 metadata in reports
  - AC3 permission-gated exports
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-034 — UI navigation and accessibility

- **Status:** proposed
- **Source:** admin
- **Owner:** UI/UX Designer
- **Milestone:** M2
- **Description:** Main nav: Home, Projects, Departments, Admin Council, Team Directory, Data Manager, Analytics, Published Vault, Notifications, Audit & Integrity, Settings; responsive sidebar desktop, compact mobile; global search; filterable tables; status indicators; role/permission labels; visible offline/sync indicator; accessible forms/keyboard nav; loading/empty/error/conflict states; confirmation dialogs; consistent identity with product name and 'by Ahsan Mandhar'.
- **Acceptance criteria:**
  - AC1 nav present
  - AC2 responsive
  - AC3 a11y baseline
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-035 — Core data model

- **Status:** proposed
- **Source:** admin
- **Owner:** Database Engineer
- **Milestone:** M1
- **Description:** Core entities: Institution, Department, User, Role/Permission, Invitation, Admin provenance, Council/membership, Proposal, Vote/Decision, Project, Membership, Task/Milestone, Link/Doc ref, Ethics approval, Dataset, Schema version, Variable, Participant record, Sensitive identifier, Change event, Import batch, Validation issue, Analysis run/output, Manuscript, Submission/event, Publication, Collaboration, Audit event, Device enrollment, Sync operation/checkpoint/conflict, Backup/restore; stable IDs; project ID stable across devices; immutable record IDs.
- **Acceptance criteria:**
  - AC1 entities implemented
  - AC2 stable IDs
  - AC3 relationships explicit
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-036 — Demo mode and test environment controls

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M6
- **Description:** Demo & Test Environment page under Settings for authorized admins: enable demo mode, load dataset, reset, remove all demo data, recreate deleted, summary by entity, export demo data, display env type (demo/real/both), run integrity checks, confirm before destructive.
- **Acceptance criteria:**
  - AC1 controls present
  - AC2 reset works
  - AC3 removal safe
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-037 — Demo users, departments and projects

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M6
- **Description:** Seed demo departments (14), 12+ fictional projects across stages, demo users per role with DEMO ACCOUNT label, synthetic datasets A/B/C, demo links/docs, demo submissions/publications; is_demo marker; strict separation from real data; demo cannot affect production analytics/metrics/votes/records.
- **Acceptance criteria:**
  - AC1 seed idempotent
  - AC2 is_demo marker
  - AC3 no leakage
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-038 — Demo council voting scenarios

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M6
- **Description:** Demo scenarios: approved majority, tie, quorum failure, rejection, conditional approval, awaiting votes, resubmission; compute outcome from stored votes; display eligibility/quorum/tally/threshold/decision.
- **Acceptance criteria:**
  - AC1 scenarios present
  - AC2 computed not hardcoded
  - AC3 display complete
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-039 — Demo sync simulation lab

- **Status:** proposed
- **Source:** admin
- **Owner:** Frontend Engineer
- **Milestone:** M6
- **Description:** Simulated devices A-D with test actions (edit/receive/queue/reconnect/conflict/duplicate/failure/restart/revocation); display op queue/applied/pending/conflicts/checkpoints; visibly distinguished from real sync; passing sim does not prove real sync.
- **Acceptance criteria:**
  - AC1 sim lab present
  - AC2 op queue visible
  - AC3 revocation tested
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

### F-040 — Demo reset, removal and integrity tests

- **Status:** proposed
- **Source:** admin
- **Owner:** Test Automation Engineer
- **Milestone:** M6
- **Description:** Reset restores baseline; removal requires admin auth, summary, confirmation, transactional deletion of demo-only records, preserve real data/audit, no orphans, verify absent; automated tests for seeding idempotency, reset, removal, leakage, role restrictions, vote outcomes, labels/missing export, validation, analytics reference, offline queues, duplicate sync, conflict preservation, dataset restore, demo sync isolation; Run Demo Integrity Tests action with report.
- **Acceptance criteria:**
  - AC1 reset idempotent
  - AC2 removal safe
  - AC3 integrity report
- **Tasks:** (none yet)
- **Tests:** (to be assigned)
- **Notes:** derived from requirements spec; refine during discovery
- **History:** 2026-10-23 created

---

## Architect proposals awaiting decision

| Proposal | Reason | Effort | Recommendation | Admin decision |
|---|---|---|---|---|
| Offline-first local-first architecture (no central research DB) | Product promise; retrofit cost | L | recommended | pending |
| Encrypted sync relay (institution-controlled) | Reliable multi-device sync | M | recommended | pending |
| Demo environment as first-class feature | Testing without real data | M | recommended | pending |

## Deferred and dropped

| Feature | Status | Reason | Decided by | Date |
|---|---|---|---|---|
| — | — | — | — | — |

## Out of scope (never was in)

- Real patient data in demo environment — prohibited
- Hosted central research database — prohibited by architecture
- Gmail-specific identity dependency — use verified email identity

