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
