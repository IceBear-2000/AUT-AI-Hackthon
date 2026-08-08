// Storage — built. In-memory only, per Spec Section 2. No hosted DB tonight.
// Stashed on globalThis so Next's dev hot-reload doesn't wipe the tickets mid-demo.

import type { Diagnosis, DroneEvent, Ticket, TicketStatus } from "@/lib/types";

type Store = { tickets: Ticket[]; seeded: boolean };

const globalStore = globalThis as unknown as { __farmsentry?: Store };

function store(): Store {
  if (!globalStore.__farmsentry) {
    globalStore.__farmsentry = { tickets: [], seeded: false };
  }
  return globalStore.__farmsentry;
}

/** Disease tickets go to the farmer; healthy ones need no owner. */
function assigneeFor(diagnosis: Diagnosis): Ticket["assignedTo"] {
  return diagnosis.condition === "Healthy" ? null : "farmer";
}

export function createTicket(event: DroneEvent, diagnosis: Diagnosis): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: `tkt-${String(store().tickets.length + 1).padStart(4, "0")}`,
    droneEventId: event.id,
    lat: event.lat,
    lng: event.lng,
    imageUrl: event.imageUrl,
    cropType: event.cropType,
    diagnosis,
    status: "new",
    assignedTo: assigneeFor(diagnosis),
    createdAt: now,
    updatedAt: now,
  };
  store().tickets.push(ticket);
  return ticket;
}

export function listTickets(): Ticket[] {
  return store().tickets;
}

export function getTicket(id: string): Ticket | undefined {
  return store().tickets.find((t) => t.id === id);
}

export function updateTicket(
  id: string,
  patch: { status?: TicketStatus; farmerNotes?: string; assignedTo?: Ticket["assignedTo"] },
): Ticket | undefined {
  const ticket = getTicket(id);
  if (!ticket) return undefined;
  if (patch.status) ticket.status = patch.status;
  if (patch.farmerNotes !== undefined) ticket.farmerNotes = patch.farmerNotes;
  if (patch.assignedTo !== undefined) ticket.assignedTo = patch.assignedTo;
  ticket.updatedAt = new Date().toISOString();
  return ticket;
}

export function hasSeeded(): boolean {
  return store().seeded;
}

export function markSeeded(): void {
  store().seeded = true;
}
