// LANE X — map view, pins, Trigger Scan, drone animation. Spec Sections 7 and 8.

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import TriggerScanButton from "@/components/TriggerScanButton";
import type { Ticket } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center bg-mist-100 font-mono text-xs tracking-widest text-canopy-700/60">
      LOADING SURVEY MAP…
    </div>
  ),
});

// One ping cycle is 1.6s and it runs twice (see .pin-ping in globals.css).
const PING_MS = 3400;

export default function MapPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [pingTicketId, setPingTicketId] = useState<string | null>(null);
  const [droneWaypointIndex, setDroneWaypointIndex] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data: { tickets: Ticket[] }) => setTickets(data.tickets))
      .catch(() => setError("Couldn't load tickets — is the dev server up?"));
  }, []);

  useEffect(() => {
    return () => {
      if (pingTimer.current) clearTimeout(pingTimer.current);
    };
  }, []);

  const triggerScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/drone/trigger", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        ticket: Ticket;
        droneWaypointIndex: number;
      };

      setTickets((prev) => [...prev, data.ticket]);
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
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <TopBar tickets={tickets} />

      <div className="relative flex-1 overflow-hidden">
        <MapView
          tickets={tickets}
          selectedId={selected?.id ?? null}
          pingTicketId={pingTicketId}
          droneWaypointIndex={droneWaypointIndex}
          onSelect={setSelected}
        />

        {error && (
          <p className="absolute inset-x-0 top-4 z-1000 mx-auto w-fit border border-alert-600 bg-mist-50 px-4 py-2 font-mono text-xs text-alert-600">
            {error}
          </p>
        )}

        {/* Slides clear of the panel so Trigger Scan is never buried. */}
        <div
          className={`absolute bottom-6 z-1000 transition-[right] duration-300 ${
            selected ? "right-[calc(min(380px,90vw)+1.5rem)]" : "right-6"
          }`}
        >
          <TriggerScanButton onClick={triggerScan} busy={scanning} />
        </div>

        {selected && (
          <TicketPanelStub
            ticket={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * LANE Y HANDOFF — throwaway.
 * Delete this and swap in `<TicketPanel ticket={selected} onClose={...}
 * onUpdated={(t) => setTickets(prev => prev.map(p => p.id === t.id ? t : p))} />`
 * the moment components/TicketPanel.tsx lands. Nothing else in this file changes.
 */
function TicketPanelStub({
  ticket,
  onClose,
}: {
  ticket: Ticket;
  onClose: () => void;
}) {
  return (
    <aside className="absolute inset-y-0 right-0 z-1000 w-[min(380px,90vw)] overflow-y-auto border-l border-canopy-900/15 bg-mist-50 p-6 shadow-[-6px_0_24px_rgba(28,46,34,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <span className="font-mono text-[11px] tracking-widest text-soil-500">
          {ticket.id} <span className="text-canopy-700/50">/ {ticket.status.toUpperCase()}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-xs text-canopy-700/70 hover:text-canopy-900"
        >
          CLOSE ✕
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- placeholder art, Lane Y builds the real panel */}
      <img
        src={ticket.imageUrl}
        alt={ticket.diagnosis.condition}
        className="mt-4 aspect-square w-full rounded-sm object-cover"
      />

      <h2 className="mt-4 text-xl font-semibold text-canopy-900">
        {ticket.diagnosis.condition}
      </h2>
      <p className="mt-1 font-mono text-xs text-canopy-700/80">
        {(ticket.diagnosis.confidence * 100).toFixed(0)}% CONFIDENCE ·{" "}
        {ticket.cropType.toUpperCase()}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-canopy-700">
        {ticket.diagnosis.suggestedTreatment}
      </p>
      <p className="mt-6 font-mono text-[11px] leading-relaxed tracking-wide text-veraison-500">
        STUB — LANE Y REPLACES THIS PANEL
        <br />
        approve / edit / reject buttons land here
      </p>
    </aside>
  );
}
