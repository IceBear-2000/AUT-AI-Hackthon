// Map view — pins, Trigger Scan, drone animation. Spec Sections 7 and 8.
//
// Tickets come from the shared store in the dashboard layout, so approving
// something on /todo is reflected here without a reload. The ticket panel is
// the real one shared with /todo, not a stub.

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import TicketPanel from "@/components/TicketPanel";
import TriggerScanButton from "@/components/TriggerScanButton";
import { useTicketStore } from "@/components/TicketsProvider";
import type { Ticket } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center bg-sunken">
      <span className="font-mono text-xs tracking-[0.14em] text-tertiary">
        LOADING SURVEY MAP…
      </span>
    </div>
  ),
});

// One ping cycle is 1.6s and it runs twice (see .pin-ping in globals.css).
const PING_MS = 3400;

const LEGEND = [
  { label: "Flagged", color: "var(--status-alert)" },
  { label: "Needs review", color: "var(--status-new)" },
  { label: "Actioned", color: "var(--status-ok)" },
];

export default function MapPage() {
  const { tickets, applyUpdate, addTicket } = useTicketStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pingTicketId, setPingTicketId] = useState<string | null>(null);
  const [droneWaypointIndex, setDroneWaypointIndex] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read through the store rather than holding a copy, so a status change made
  // in the panel repaints the pin immediately.
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  useEffect(() => {
    return () => {
      if (pingTimer.current) clearTimeout(pingTimer.current);
    };
  }, []);

  const triggerScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const response = await fetch("/api/drone/trigger", { method: "POST" });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as {
        ticket: Ticket;
        droneWaypointIndex: number;
      };

      addTicket(data.ticket);
      setDroneWaypointIndex(data.droneWaypointIndex);

      // Signature moment (Section 7): the new pin lands with one ring ping.
      setPingTicketId(data.ticket.id);
      if (pingTimer.current) clearTimeout(pingTimer.current);
      pingTimer.current = setTimeout(() => setPingTicketId(null), PING_MS);
    } catch {
      setError("Scan failed — check the server logs.");
    } finally {
      setScanning(false);
    }
  }, [addTicket]);

  return (
    <div className="absolute inset-0">
      <MapView
        tickets={tickets}
        selectedId={selectedId}
        pingTicketId={pingTicketId}
        droneWaypointIndex={droneWaypointIndex}
        onSelect={(ticket) => setSelectedId(ticket.id)}
      />

      {/* Legend. Hidden on phones — the screen is small and the colours are
          already explained in the panel the farmer is about to open. */}
      <div className="glass pointer-events-none absolute left-4 top-4 z-[1000] hidden rounded-card px-3 py-2.5 sm:block">
        <p className="font-mono text-[10px] tracking-[0.14em] text-tertiary">
          SURVEY STATUS
        </p>
        <ul className="mt-2 space-y-1.5">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ background: item.color }}
              />
              <span className="text-xs text-secondary">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p
          role="alert"
          className="glass absolute inset-x-4 top-4 z-[1000] mx-auto w-fit max-w-[calc(100%-2rem)] rounded-pill px-4 py-2 text-sm text-status-alert"
        >
          {error}
        </p>
      )}

      {/* Sits above the mobile tab bar, and slides clear of the desktop panel
          so Trigger Scan is never buried. */}
      <div
        className={`absolute inset-x-4 bottom-4 z-[1000] transition-[right,opacity] duration-300 sm:inset-x-auto ${
          selected
            ? "sm:right-[calc(min(400px,92vw)+1.5rem)] max-sm:pointer-events-none max-sm:opacity-0"
            : "sm:right-6"
        }`}
      >
        <TriggerScanButton onClick={triggerScan} busy={scanning} />
      </div>

      <TicketPanel
        ticket={selected}
        onClose={() => setSelectedId(null)}
        onUpdated={applyUpdate}
      />
    </div>
  );
}
