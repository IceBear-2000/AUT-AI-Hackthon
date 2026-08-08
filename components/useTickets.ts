"use client";

// The only place that talks to the ticket API.
// Endpoints are frozen (Spec Section 3); this just wraps them. State lives in
// TicketsProvider — these are the plain calls it and the panel are built on.

import type { Ticket } from "@/lib/types";

export type TicketPatch = {
  status?: Ticket["status"];
  farmerNotes?: string;
  assignedTo?: Ticket["assignedTo"];
};

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? `${response.status} ${response.statusText}`;
}

export async function fetchTickets(): Promise<Ticket[]> {
  const response = await fetch("/api/tickets", { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  const { tickets } = (await response.json()) as { tickets: Ticket[] };
  return tickets;
}

export async function patchTicket(
  id: string,
  patch: TicketPatch,
): Promise<Ticket> {
  const response = await fetch(`/api/tickets/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await readError(response));
  const { ticket } = (await response.json()) as { ticket: Ticket };
  return ticket;
}
