// Drone simulator — built. No real hardware, no real flight (Spec Section 1).

import type { CropType, DroneEvent } from "@/lib/types";

// Demo flight path — Renwick, Marlborough (heart of NZ's grape-growing region)
export const DEMO_WAYPOINTS: { lat: number; lng: number }[] = [
  { lat: -41.507, lng: 173.826 },
  { lat: -41.507, lng: 173.83 },
  { lat: -41.507, lng: 173.834 },
  { lat: -41.5095, lng: 173.834 },
  { lat: -41.5095, lng: 173.83 },
  { lat: -41.5095, lng: 173.826 },
  { lat: -41.512, lng: 173.826 },
  { lat: -41.512, lng: 173.83 },
  { lat: -41.512, lng: 173.834 },
];

export const DEMO_FARM_CENTER = { lat: -41.5095, lng: 173.83 };

/** Waypoints 0-5 are the grape block, 6-8 the apple block. */
function cropForWaypoint(index: number): CropType {
  return index < 6 ? "grape" : "apple";
}

// Real PlantVillage photos, 5 per class. Interleaved by condition rather than
// grouped, because pick() walks these in order — grouped, five straight scans
// would all be black rot; interleaved, each one surfaces a different disease.
const DISEASED_IMAGES: Record<CropType, string[]> = {
  grape: [
    "/sample-images/grape-black-rot-01.jpg",
    "/sample-images/grape-esca-01.jpg",
    "/sample-images/grape-leaf-blight-01.jpg",
    "/sample-images/grape-black-rot-02.jpg",
    "/sample-images/grape-esca-02.jpg",
    "/sample-images/grape-leaf-blight-02.jpg",
    "/sample-images/grape-black-rot-03.jpg",
    "/sample-images/grape-esca-03.jpg",
    "/sample-images/grape-leaf-blight-03.jpg",
    "/sample-images/grape-black-rot-04.jpg",
    "/sample-images/grape-esca-04.jpg",
    "/sample-images/grape-leaf-blight-04.jpg",
    "/sample-images/grape-black-rot-05.jpg",
    "/sample-images/grape-esca-05.jpg",
    "/sample-images/grape-leaf-blight-05.jpg",
  ],
  apple: [
    "/sample-images/apple-scab-01.jpg",
    "/sample-images/apple-black-rot-01.jpg",
    "/sample-images/apple-cedar-rust-01.jpg",
    "/sample-images/apple-scab-02.jpg",
    "/sample-images/apple-black-rot-02.jpg",
    "/sample-images/apple-cedar-rust-02.jpg",
    "/sample-images/apple-scab-03.jpg",
    "/sample-images/apple-black-rot-03.jpg",
    "/sample-images/apple-cedar-rust-03.jpg",
    "/sample-images/apple-scab-04.jpg",
    "/sample-images/apple-black-rot-04.jpg",
    "/sample-images/apple-cedar-rust-04.jpg",
    "/sample-images/apple-scab-05.jpg",
    "/sample-images/apple-black-rot-05.jpg",
    "/sample-images/apple-cedar-rust-05.jpg",
  ],
};

const HEALTHY_IMAGES: Record<CropType, string[]> = {
  grape: [
    "/sample-images/grape-healthy-01.jpg",
    "/sample-images/grape-healthy-02.jpg",
    "/sample-images/grape-healthy-03.jpg",
    "/sample-images/grape-healthy-04.jpg",
    "/sample-images/grape-healthy-05.jpg",
  ],
  apple: [
    "/sample-images/apple-healthy-01.jpg",
    "/sample-images/apple-healthy-02.jpg",
    "/sample-images/apple-healthy-03.jpg",
    "/sample-images/apple-healthy-04.jpg",
    "/sample-images/apple-healthy-05.jpg",
  ],
};

// ~40% diseased / 60% healthy, but deterministic — a live demo should not roll dice.
const DISEASE_PATTERN = [true, false, false, true, false, false, true, false, false];

type SimulatorState = { cursor: number };

const state: SimulatorState = { cursor: 0 };

function pick<T>(items: T[], n: number): T {
  return items[n % items.length];
}

/** Cycles the waypoint path, returning one GPS-tagged scan event per call. */
export function getNextEvent(): DroneEvent {
  const n = state.cursor++;
  const waypointIndex = n % DEMO_WAYPOINTS.length;
  const waypoint = DEMO_WAYPOINTS[waypointIndex];
  const cropType = cropForWaypoint(waypointIndex);
  const diseased = DISEASE_PATTERN[n % DISEASE_PATTERN.length];
  const pool = diseased ? DISEASED_IMAGES[cropType] : HEALTHY_IMAGES[cropType];

  return {
    id: `evt-${String(n + 1).padStart(4, "0")}`,
    timestamp: new Date().toISOString(),
    lat: waypoint.lat,
    lng: waypoint.lng,
    imageUrl: pick(pool, n),
    cropType,
  };
}

/** Where the drone icon sits right now — the waypoint the last event came from. */
export function currentWaypointIndex(): number {
  return state.cursor === 0
    ? 0
    : (state.cursor - 1) % DEMO_WAYPOINTS.length;
}

export function resetSimulator(): void {
  state.cursor = 0;
}
