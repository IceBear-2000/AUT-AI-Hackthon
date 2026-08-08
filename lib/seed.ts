// Spec Section 10, task 4: 5-8 tickets on the map before the first live trigger,
// so the judges see "a farm mid-scan", not an empty map.

import { createTicket, hasSeeded, markSeeded } from "@/lib/store";
import { label } from "@/lib/diagnosis";
import { DEMO_WAYPOINTS } from "@/lib/droneSimulator";
import treatments from "@/lib/treatments.json";
import type { CropType, Diagnosis, DroneEvent } from "@/lib/types";

type TreatmentEntry = { symptoms: string; response: string; severity: string };
const library = treatments as Record<CropType, Record<string, TreatmentEntry>>;

function diagnosisFor(
  cropType: CropType,
  condition: string,
  confidence: number,
): Diagnosis {
  return {
    condition: label(cropType, condition),
    confidence,
    suggestedTreatment: library[cropType][condition].response,
  };
}

const SEEDS: {
  waypoint: number;
  cropType: CropType;
  condition: string;
  confidence: number;
  imageUrl: string;
  minutesAgo: number;
  status?: "approved" | "completed";
}[] = [
  { waypoint: 0, cropType: "grape", condition: "Black Rot", confidence: 0.91, imageUrl: "/sample-images/grape-black-rot-01.jpg", minutesAgo: 96 },
  { waypoint: 1, cropType: "grape", condition: "Healthy", confidence: 0.97, imageUrl: "/sample-images/grape-healthy-01.jpg", minutesAgo: 88 },
  { waypoint: 2, cropType: "grape", condition: "Esca (Black Measles)", confidence: 0.78, imageUrl: "/sample-images/grape-esca-01.jpg", minutesAgo: 74, status: "approved" },
  { waypoint: 3, cropType: "grape", condition: "Healthy", confidence: 0.95, imageUrl: "/sample-images/grape-healthy-02.jpg", minutesAgo: 61 },
  { waypoint: 4, cropType: "grape", condition: "Leaf Blight (Isariopsis Leaf Spot)", confidence: 0.84, imageUrl: "/sample-images/grape-leaf-blight-01.jpg", minutesAgo: 47, status: "completed" },
  { waypoint: 6, cropType: "apple", condition: "Apple Scab", confidence: 0.88, imageUrl: "/sample-images/apple-scab-01.jpg", minutesAgo: 33 },
  { waypoint: 7, cropType: "apple", condition: "Healthy", confidence: 0.96, imageUrl: "/sample-images/apple-healthy-01.jpg", minutesAgo: 21 },
];

export function seedIfEmpty(): void {
  if (hasSeeded()) return;
  markSeeded();

  SEEDS.forEach((seed, index) => {
    const waypoint = DEMO_WAYPOINTS[seed.waypoint];
    const event: DroneEvent = {
      id: `seed-${String(index + 1).padStart(4, "0")}`,
      timestamp: new Date(Date.now() - seed.minutesAgo * 60_000).toISOString(),
      lat: waypoint.lat,
      lng: waypoint.lng,
      imageUrl: seed.imageUrl,
      cropType: seed.cropType,
    };
    const ticket = createTicket(
      event,
      diagnosisFor(seed.cropType, seed.condition, seed.confidence),
    );
    if (seed.status) ticket.status = seed.status;
  });
}
