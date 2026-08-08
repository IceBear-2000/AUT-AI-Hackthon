import { NextResponse } from "next/server";
import { resetSimulator } from "@/lib/droneSimulator";
import { clearTickets } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/demo/reset — back to an empty farm.
 *
 * Operator control, not part of the product story: it clears every ticket and
 * rewinds the drone to the first waypoint, so a sweep can fill the map from
 * nothing while the room watches. Nothing here is destructive beyond the
 * in-memory demo store.
 */
export async function POST() {
  clearTickets();
  resetSimulator();
  return NextResponse.json({ ok: true, tickets: [] });
}
