# Gap Analysis & Implementation Plan

## Unimplemented / Partial Features (by ID)

| Feature | Missing ACs / Notes |
|---|---|
| F-001 | Owner bootstrap one-time + recovery + override reason/audit |
| F-003 | Email invitations, single-use expiring tokens, statuses |
| F-004 | Admin promotion provenance (created_by_admin_id) |
| F-005 | MFA, sessions expiry, recovery |
| F-006 | Council proposal workflow (admin council) |
| F-007 | Configurable council voting rules |
| F-008 | Vote integrity audit (beyond tally) |
| F-010 | Project lifecycle stages |
| F-012 | Tasks & communication per project |
| F-016 | Value labels & missing-value handling |
| F-017 | SPSS export (.sav) + XLSX already ok |
| F-019 | Data collection forms (UI) |
| F-020 | Participant phone number masking |
| F-025 | Advanced analytics (9 sub-features) |
| F-029 | Sync modes UI (manual/auto, etc.) |
| F-031 | Conflict handling UI polish |
| F-032 | Security/encryption audit docs |
| F-033 | PDF report export |
| F-035 | Core data model docs |
| F-036-040 | Demo mode fully isolated & reset |
| F-044 | Conflict resolution history preservation |
| F-046 | Sync Center UI (status, peers) |
| F-047 | Device roles & hosting availability |
| F-048 | Demo sync simulation lab |
| F-049 | Automated sync test suite (20 categories) |
| F-050 | Threat model + limitations docs |

## Implementation Plan (phases)

### Phase A — Auth & Governance (F-001..F-008)
- Add invitation table + token service; email stub (local log).
- Add MFA (TOTP) using Web Crypto; session expiry + recovery codes.
- Add admin promotion provenance fields and UI.
- Add council proposal + configurable voting rules.

### Phase B — Dataset & Analytics (F-010,F-012,F-016,F-017,F-019,F-020,F-025,F-033)
- Implement value labels/missing values in variables.
- Add SPSS export via a small writer (or CSV fallback documented).
- Add PDF export via browser print/PDF library (permission gate).
- Add data collection forms UI and phone masking.

### Phase C — Sync Hardening (F-029,F-031,F-044,F-046,F-047,F-048,F-049,F-050)
- Pairing UI (QR/manual), Sync Center, device roles.
- CRDT-ish merge (field-level) + history preservation.
- Demo sim lab with synthetic peers.
- Expanded sync tests + threat model doc.

### Phase D — Demo & Docs (F-035..F-040,F-032,F-050)
- Isolated demo data + reset.
- Documentation completion.

## Next Actions
1. Approve plan.
2. Create tasks T-027.. in graph with dependencies.
3. Implement Phase A first.
