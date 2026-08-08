// LANE X OWNS THIS FILE — replace this placeholder entirely.
// Target: full-bleed Leaflet map, status-coloured pins, "Trigger Scan" button,
// drone icon on the waypoint path. See PROJECT_SPEC.md Sections 7 and 8.

const BUILT = [
  ["lib/types.ts", "shared contract — locked, tell the group before editing"],
  ["lib/treatments.json", "Section 6 content library"],
  ["lib/diagnosis/", "diagnose(imageUrl, cropType) + cached fallback"],
  ["lib/droneSimulator/", "DEMO_WAYPOINTS + getNextEvent()"],
  ["lib/store.ts", "in-memory ticket store"],
  ["app/api/*", "POST /api/drone/trigger, GET /api/tickets, PATCH /api/tickets/:id"],
  ["app/globals.css", "Section 7 palette + IBM Plex + ping keyframes"],
  ["public/sample-images/", "14 placeholders — swap for real PlantVillage images"],
];

const TODO = [
  ["Lane X", "this map view — pins, Trigger Scan, drone + ping animation"],
  ["Lane Y", "ticket side panel (not a modal), approve/edit/reject, to-do list"],
  ["Lane Z", "real PlantVillage images, verify the live model, re-record the cache, insights"],
];

export default function MapPage() {
  return (
    <main className="mx-auto max-w-3xl px-8 py-16">
      <p className="font-mono text-xs tracking-widest text-soil-500">
        FARMSENTRY // RENWICK-01
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-canopy-900">
        Scaffold is up.
      </h1>
      <p className="mt-3 max-w-xl text-canopy-700">
        Shared contracts, design tokens and the API plumbing are in. This page is
        a placeholder — Lane X replaces it with the map view.
      </p>

      <section className="mt-10">
        <h2 className="font-mono text-xs tracking-widest text-canopy-600">
          IN THE REPO
        </h2>
        <ul className="mt-3 divide-y divide-canopy-900/10 border-y border-canopy-900/10">
          {BUILT.map(([path, note]) => (
            <li key={path} className="flex flex-wrap gap-x-4 py-2 text-sm">
              <code className="font-mono text-canopy-900">{path}</code>
              <span className="text-canopy-700/80">{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs tracking-widest text-veraison-500">
          NEXT UP
        </h2>
        <ul className="mt-3 divide-y divide-canopy-900/10 border-y border-canopy-900/10">
          {TODO.map(([track, note]) => (
            <li key={track} className="flex flex-wrap gap-x-4 py-2 text-sm">
              <span className="font-mono text-canopy-900">{track}</span>
              <span className="text-canopy-700/80">{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 font-mono text-xs text-canopy-700/70">
        Smoke-test the API:{" "}
        <code>curl -X POST localhost:3000/api/drone/trigger</code>
      </p>
    </main>
  );
}
