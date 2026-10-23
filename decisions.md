# Zaydian Research Integrity — Decision Log (ADR)

> Every irreversible or expensive-to-reverse choice lands here, at the moment it is made.

**Status values:** `proposed` · `accepted` · `rejected` · `superseded by ADR-0nn`
**Never delete an ADR.** Supersede it.

---

## Index

| ADR | Title | Date | Status |
|---|---|---|---|
| 000 | Process adopted | 2026-10-23 | accepted |

---

## ADR-000 — Process: autonomous software house

**Date:** 2026-10-23 · **Status:** accepted · **Decided by:** Admin

**Context:** A feature list must become a working, offline-capable application over a build long enough to span multiple sessions and possibly multiple models.

**Decision:** Adopt the graph-orchestrated, file-state software-house process. `graph.json` is the schedule; `features.md` is the contract; `progress.md` is the memory; `plot_graph.py` is the dashboard. Quality gates are checkable, not advisory.

**Consequences:** More upfront ceremony (plan approval before code). In exchange: no feature loss, no context loss on model switch, and an auditable traceability matrix at delivery.

---
---

## ADR-001 — Initial sync mode: institution-controlled encrypted relay

**Date:** 2026-10-23 · **Status:** accepted (default, pending Admin confirmation) · **Decided by:** Principal Architect (default)

**Context:** Need a dependable initial deployment for a medical college; direct P2P cannot receive updates while offline.

**Decision:** Build a pluggable sync layer with an institution-controlled encrypted relay as the initial transport (Mode B/C). Direct P2P (Mode A) added later without redesign.

**Consequences:** Requires an institution-controlled host; relay may retain encrypted data/metadata; not equivalent to no network infrastructure.

**Review trigger:** revisit if institution cannot host a relay or demands fully peer-direct operation.

