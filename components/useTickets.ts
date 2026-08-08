"use client";

// LANE Y — the only place that talks to the ticket API.
// Endpoints are frozen (Spec Section 3); this just wraps them.

import { useCallback, useEffect, useState } from "react";
import type { Ticket } from "@/lib/types";

export type TicketPatch = {
  status?: Ticket["status"];
  farmerNotes?: string;
  assignedTo?: Ticket["assignedTo"];
};

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : "could not load tickets";
}

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

/**
 * Loads every ticket once on mount. `applyUpdate` merges a single PATCHed
 * ticket back in without a refetch, so acting on a ticket never costs a
 * round trip the audience has to watch.
 */
export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setTickets(await fetchTickets());
      setError(null);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  // Resolved in a callback rather than awaited in the effect body, so no state
  // is set synchronously during the effect, and `cancelled` keeps a fast
  // unmount from writing to a dead component.
  useEffect(() => {
    let cancelled = false;
    fetchTickets().then(
      (loaded) => {
        if (cancelled) return;
        setTickets(loaded);
        setError(null);
        setLoading(false);
      },
      (cause: unknown) => {
        if (cancelled) return;
        setError(message(cause));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const applyUpdate = useCallback((updated: Ticket) => {
    setTickets((previous) =>
      previous.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
    );
  }, []);

  return { tickets, loading, error, reload, applyUpdate };
}
