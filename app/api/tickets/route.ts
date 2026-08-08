import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/seed";
import { listTickets } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/tickets — every ticket, newest last. */
export async function GET() {
  seedIfEmpty();
  return NextResponse.json({ tickets: listTickets() });
}
