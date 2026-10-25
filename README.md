# BlueIntel Nigeria (MVP front-end)

React + TypeScript + Vite front-end built from the *BlueIntel Nigeria PRD & SRS v1.0*. The layout takes its cues from the NiMet weather site (utility bar, red alert ticker, forecast panel plus "latest values" panel).

> **All data in this build is synthetic.** `src/api/mockApi.ts` generates sample values so the interface, states and alert logic can be reviewed. No real source is connected or approved yet (see PRD §12, Appendix A).

## Run it

Prerequisites: Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5173 by default (Vite picks the next free port; use -- --port 5133 to pin one)
npm test           # unit tests (freshness + alert rules)
npm run build      # type-check + production build into dist/
```

Copy `.env.example` to `.env` if you want to change the tile server. No secrets belong in this client (NFR-005); provider keys live on the future FastAPI server.

Deploying `dist/` to static hosting: configure an SPA fallback so deep links like `/alerts` serve `index.html`.

## What is implemented (PRD/SRS mapping)

| Area | Where | Requirements |
|---|---|---|
| Interactive map, coverage box, layers, legend, location select | `components/MapView.tsx`, `pages/Home.tsx` | FR-001–003, 5.1 |
| Loading / empty / stale / error states | `components/States.tsx`, `Home.tsx` | FR-004, NFR-002 |
| Time ranges, charts with visible gaps, forecast styling, CSV export | `components/TrendChart.tsx`, `lib/csv.ts` | FR-005, 009, 010, 011 |
| Observed / forecast / model estimate / derived labels | `components/Badges.tsx` | FR-010 |
| Shared freshness policy (per-dataset limits) | `lib/freshness.ts` | NFR-004, 11.2 |
| Alert rules, duplicate suppression, stale suppression, validity window | `lib/alerts.ts`, `pages/Alerts.tsx` | FR-012–015 |
| Source and licence transparency, candidate-source checklist | `pages/Sources.tsx` | 11.1, 12.1, App. A |
| Operations view: feed health, ingestion runs, rule config, audit sample, failure simulation | `pages/Admin.tsx` | FR-021–024 |
| AI insights placeholder with guardrails (post-MVP) | `pages/Insights.tsx` | 5.4, 14.3 |
| Pilot feedback form | `pages/Feedback.tsx` | 6, 7 |
| Responsive (checked at 360 px), keyboard focus, text+icon status cues, table alternative to chart | `styles.css`, components | NFR-001, 010 |

## Connecting real data

1. Pick one approved source (licence, coverage and attribution reviewed) and build the ingestion adapter server-side.
2. Replace `fetchBundle()` in `src/api/mockApi.ts` with calls to `GET /api/v1/locations/{id}/series`, `/summary`, `/alerts`, `/sources`.
3. Update `SOURCES`, `DATASETS`, `LOCATIONS` and `ALERT_RULES` in `src/config.ts`. Move alert evaluation to the server for production.
4. Have the thresholds in `ALERT_RULES` reviewed by a marine/meteorological specialist. The current values are placeholders.

## Known placeholders

- The coastal area (Lagos) and the three indicators are assumptions; the PRD leaves both open (§18).
- The admin sign-in is a UI stub with **no real authentication**.
- Languages: English only until discovery decides otherwise.
- Map tiles use OpenStreetMap's public server, which has usage limits. Choose a tile provider before launch.

## Structure

```
src/
  api/mockApi.ts        demo data layer (replace with real API client)
  components/           Sidebar, Topbar, AlertTicker, MapView, TrendChart, badges, states
  context/              DataContext (fetch, freshness, alerts), AuthContext (demo)
  lib/                  time, freshness, alerts, csv
  pages/                Home, Alerts, Sources, Admin, About, Insights, Feedback
  __tests__/            vitest unit tests
  config.ts             locations, datasets, sources, alert rules
```
