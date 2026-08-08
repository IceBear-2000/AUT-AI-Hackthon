import { NextResponse } from "next/server";
import { updateTicket } from "@/lib/store";
import type { Ticket, TicketStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID: TicketStatus[] = [
  "new",
  "approved",
  "edited",
  "rejected",
  "completed",
];

/** PATCH /api/tickets/:id — status / farmerNotes / assignedTo. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    status?: TicketStatus;
    farmerNotes?: string;
    assignedTo?: Ticket["assignedTo"];
  };

  if (body.status && !VALID.includes(body.status)) {
    return NextResponse.json(
      { error: `invalid status: ${body.status}` },
      { status: 400 },
    );
  }

  const ticket = updateTicket(id, body);
  if (!ticket) {
    return NextResponse.json({ error: `no ticket ${id}` }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}
