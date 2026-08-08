# FarmSentry

AI-powered crop disease triage for NZ growers. Simulated drone scans flag problems on a map, an AI suggests a diagnosis and treatment, the farmer approves or edits, and it becomes a to-do list.

Full brief, demo script and judge Q&A: [PROJECT_SPEC.md](PROJECT_SPEC.md).

## Run it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000. No API key? It still runs — `diagnose()` falls back to the pre-cached results in `lib/diagnosis/cache.json`.

## What's already scaffolded

| Path | What it is |
|---|---|
| `lib/types.ts` | **Shared contract.** Spec Section 4. Tell the group before you touch it. |
| `lib/treatments.json` | Disease + treatment content library (Spec Section 6) |
| `lib/diagnosis/` | `diagnose(imageUrl, cropType)` — live model call, 3s timeout, cached fallback |
| `lib/droneSimulator/` | `DEMO_WAYPOINTS` (Renwick, Marlborough) + `getNextEvent()` |
| `lib/store.ts` | In-memory ticket store |
| `lib/seed.ts` | 7 pre-seeded tickets so the map isn't empty on stage |
| `app/api/` | The three endpoints below |
| `app/globals.css` | Spec Section 7 palette, IBM Plex, ping keyframes |
| `public/sample-images/` | 40 real PlantVillage photos, 5 each across 8 classes (Lane Z) |

## API

```bash
curl -X POST localhost:3000/api/drone/trigger      # next scan -> diagnose -> ticket
curl localhost:3000/api/tickets                    # list all tickets
curl -X PATCH localhost:3000/api/tickets/tkt-0001 \
  -H 'content-type: application/json' \
  -d '{"status":"approved"}'
```

All three return exactly the shapes in `lib/types.ts`.

## Dev quirk worth knowing

Editing `app/(dashboard)/map/page.tsx` or `components/MapView.tsx` can throw `Cannot read properties of undefined (reading 'appendChild')` on Fast Refresh. That's a known react-leaflet + HMR issue — the map remounts into a stale container. **Hard-reload the page and it's gone.** It does not happen on a cold load, and it will not happen in the demo.

## Lanes — one person each, no dependencies between them

| Lane | Owns | Job |
|---|---|---|
| **X** | `app/(dashboard)/map/page.tsx`, `components/MapView.tsx`, `components/TriggerScanButton.tsx` | Map view, status-coloured pins, Trigger Scan button, drone + ping animation |
| **Y** | `components/TicketPanel.tsx`, `app/(dashboard)/todo/page.tsx` | Ticket side panel (**panel, not a modal**), approve/edit/reject, to-do list, mark complete |
| **Z** | `public/sample-images/`, `lib/diagnosis/cache.json`, `app/(dashboard)/insights/page.tsx` | Real PlantVillage images, verify the live model, re-record the cache, insights view |

Full task lists and definitions of done: Spec Sections 8, 9 and 10. File ownership map: Section 3.

**Frozen — shout in the chat before editing:** `lib/types.ts`, `app/globals.css`, `app/layout.tsx`, `lib/store.ts`, `app/api/`.

## Git workflow

Work directly on `main`, push every 15–20 minutes. Shout in the group chat before touching `lib/types.ts` or anything outside your own folder.

## Out of scope tonight

Real drone hardware, autonomous treatment application (NZ CAA Part 102 needs a supervising observer), live model learning from corrections, crops beyond grape and apple. See Spec Section 1 — say these proactively, don't wait to be asked.
