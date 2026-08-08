// Map view — the survey, and the one control that drives the whole demo.
//
// "Trigger analysis" flies the full waypoint path rather than producing a
// single ticket: the drone steps from block to block dropping findings as it
// goes, which is what a real sweep looks like and makes the work legible.
//
// Tickets come from the shared store, so approving something in AI Insights is
// reflected here without a reload.

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import TicketPanel from "@/components/TicketPanel";
import TriggerAnalysisButton from "@/components/TriggerAnalysisButton";
import { useTicketStore } from "@/components/TicketsProvider";
import { DEMO_WAYPOINTS } from "@/lib/droneSimulator";
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

// One finding per waypoint, so a sweep covers the survey grid exactly once.
const SWEEP_POINTS = DEMO_WAYPOINTS.length;

// Paced so the whole run lands around six seconds — long enough to narrate
// over, short enough to hold a room.
const STEP_MS = 700;

const LEGEND = [
  { label: "Flagged", color: "var(--status-alert)" },
  { label: "Needs review", color: "var(--status-new)" },
  { label: "Actioned", color: "var(--status-ok)" },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function MapPage() {
  const { tickets, applyUpdate, addTicket } = useTicketStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pingTicketId, setPingTicketId] = useState<string | null>(null);
  const [droneWaypointIndex, setDroneWaypointIndex] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Navigating away mid-sweep must not keep writing to an unmounted page.
  const aliveRef = useRef(true);

  // Read through the store rather than holding a copy, so a status change made
  // in the panel repaints the pin immediately.
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (pingTimer.current) clearTimeout(pingTimer.current);
    };
  }, []);

  const runAnalysis = useCallback(async () => {
    setScanning(true);
    setError(null);
    setProgress(0);
    if (pingTimer.current) clearTimeout(pingTimer.current);

    try {
      for (let step = 0; step < SWEEP_POINTS; step += 1) {
        if (!aliveRef.current) return;

        // The request and the beat run together, so the sweep keeps its rhythm
        // when the model answers fast and simply stretches when it doesn't —
        // rather than the pacing collapsing into a burst at the end.
        const [response] = await Promise.all([
          fetch("/api/drone/trigger", { method: "POST" }),
          step < SWEEP_POINTS - 1 ? delay(STEP_MS) : Promise.resolve(),
        ]);
        if (!response.ok) throw new Error(String(response.status));

        const data = (await response.json()) as {
          ticket: Ticket;
          droneWaypointIndex: number;
        };
        if (!aliveRef.current) return;

        addTicket(data.ticket);
        setDroneWaypointIndex(data.droneWaypointIndex);
        // Signature moment (Section 7): one ring on the newest pin. Rolling
        // rather than cumulative — nine rings at once would be noise.
        setPingTicketId(data.ticket.id);
        setProgress(step + 1);
      }

      pingTimer.current = setTimeout(() => {
        if (aliveRef.current) setPingTicketId(null);
      }, PING_MS);
    } catch {
      if (aliveRef.current) setError("Analysis failed — check the server logs.");
    } finally {
      if (aliveRef.current) setScanning(false);
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
          so the control is never buried. */}
      <div
        className={`absolute inset-x-4 bottom-4 z-[1000] transition-[right,opacity] duration-300 sm:inset-x-auto ${
          selected
            ? "sm:right-[calc(min(400px,92vw)+1.5rem)] max-sm:pointer-events-none max-sm:opacity-0"
            : "sm:right-6"
        }`}
      >
        <TriggerAnalysisButton
          onClick={runAnalysis}
          busy={scanning}
          done={progress}
          total={SWEEP_POINTS}
        />
      </div>

      <TicketPanel
        ticket={selected}
        onClose={() => setSelectedId(null)}
        onUpdated={applyUpdate}
      />
    </div>
  );
}
