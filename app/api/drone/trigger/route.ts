import { NextResponse } from "next/server";
import { diagnose } from "@/lib/diagnosis";
import { currentWaypointIndex, getNextEvent } from "@/lib/droneSimulator";
import { seedIfEmpty } from "@/lib/seed";
import { createTicket } from "@/lib/store";

export const dynamic = "force-dynamic";

/** POST /api/drone/trigger — next scan event -> diagnose -> ticket. */
export async function POST() {
  seedIfEmpty();

  const event = getNextEvent();
  const diagnosis = await diagnose(event.imageUrl, event.cropType);
  const ticket = createTicket(event, diagnosis);

  return NextResponse.json({
    ticket,
    droneWaypointIndex: currentWaypointIndex(),
  });
}
