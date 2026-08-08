"use client";

// One ticket store for the whole dashboard.
//
// Before this, three screens each fetched /api/tickets independently and the
// map's copy went stale the moment you approved something on /todo. Now the
// layout owns the list, the header counts read from it, and every view sees the
// same numbers.

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchTickets } from "@/components/useTickets";
import type { Ticket } from "@/lib/types";

type TicketStore = {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Merge one PATCHed ticket back in without a refetch. */
  applyUpdate: (ticket: Ticket) => void;
  /** Append a ticket the drone just produced. */
  addTicket: (ticket: Ticket) => void;
  /** Empty the farm server-side and locally, for a clean demo run. */
  resetDemo: () => Promise<void>;
};

const TicketsContext = createContext<TicketStore | null>(null);

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : "could not load tickets";
}

export function TicketsProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  const load = useCallback(() => {
    // Resolved in a callback rather than awaited, so nothing is set
    // synchronously inside an effect body.
    fetchTickets().then(
      (loaded) => {
        setTickets(loaded);
        setError(null);
        setLoading(false);
      },
      (cause: unknown) => {
        setError(message(cause));
        setLoading(false);
      },
    );
  }, []);

  // Re-runs on every route change, so walking map -> to-do -> insights always
  // lands on fresh counts. The store is in-memory server-side, so this is cheap.
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
  }, [pathname]);

  // Coming back to the tab after acting elsewhere should not show stale data.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const applyUpdate = useCallback((updated: Ticket) => {
    setTickets((previous) =>
      previous.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
    );
  }, []);

  // Upsert, not append. A sweep runs for several seconds, and a focus or route
  // refetch during it returns a list that already contains the findings added so
  // far — appending them a second time gave duplicate React keys and double pins.
  const addTicket = useCallback((ticket: Ticket) => {
    setTickets((previous) => {
      const at = previous.findIndex((existing) => existing.id === ticket.id);
      if (at === -1) return [...previous, ticket];
      const next = [...previous];
      next[at] = ticket;
      return next;
    });
  }, []);

  const resetDemo = useCallback(async () => {
    const response = await fetch("/api/demo/reset", { method: "POST" });
    if (!response.ok) throw new Error("reset failed");
    // Clear locally too rather than refetching — the operator should see the
    // farm empty the instant they press it, with no round trip to wait on.
    setTickets([]);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      tickets,
      loading,
      error,
      reload: load,
      applyUpdate,
      addTicket,
      resetDemo,
    }),
    [tickets, loading, error, load, applyUpdate, addTicket, resetDemo],
  );

  return (
    <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>
  );
}

export function useTicketStore(): TicketStore {
  const store = useContext(TicketsContext);
  if (!store) {
    throw new Error("useTicketStore must be used inside <TicketsProvider>");
  }
  return store;
}
