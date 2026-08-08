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
| `public/sample-images/` | 14 **placeholder** SVGs — Track A swaps in real PlantVillage images |

## API

```bash
curl -X POST localhost:3000/api/drone/trigger      # next scan -> diagnose -> ticket
curl localhost:3000/api/tickets                    # list all tickets
curl -X PATCH localhost:3000/api/tickets/tkt-0001 \
  -H 'content-type: application/json' \
  -d '{"status":"approved"}'
```

All three return exactly the shapes in `lib/types.ts`.

## Tracks

- **Track A — AI diagnosis.** Pull real PlantVillage images into `public/sample-images/` (grape: black rot, esca, leaf blight, healthy; apple: scab, black rot, cedar apple rust, healthy), then refresh `lib/diagnosis/cache.json`. The live model call is gated off while the images are SVG placeholders — real `.jpg` files switch it on.
- **Track B — Frontend.** Map view, ticket side panel (**panel, not a modal**), to-do list, insights. `app/(dashboard)/map/page.tsx` is a placeholder to replace.
- **Track C — Backend.** The simulator and API above are a working starting point. Extend or rewrite.

## Git workflow

Work directly on `main`, push every 15–20 minutes. Shout in the group chat before touching `lib/types.ts` or anything outside your own folder.

## Out of scope tonight

Real drone hardware, autonomous treatment application (NZ CAA Part 102 needs a supervising observer), live model learning from corrections, crops beyond grape and apple. See Spec Section 1 — say these proactively, don't wait to be asked.
