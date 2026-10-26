# Zaydian Research Integrity

Local-first research management app (PWA) with offline support and optional P2P sync over WebRTC.

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run test` - run unit tests
- `npm run lint` - lint

## Architecture

- Vite + React + TypeScript
- Dexie (IndexedDB) for local persistence
- WebRTC data channels for P2P sync (manual/QR pairing)
- Service worker for offline caching

## Sync limitations

- Peer discovery is manual; no central relay by default.
- Restrictive networks may block WebRTC; sync falls back to manual file export/import.
- Offline changes queue locally and sync when peers reconnect.

## Meta-analysis module

- Forest plot with study rows, pooled estimates, heterogeneity stats.
- Export SVG/PNG/CSV/JSON.
- Unit tests in `src/components/MetaAnalysis/__tests__`.

## License

MIT
