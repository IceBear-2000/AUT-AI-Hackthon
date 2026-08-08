"use client";

// LANE Y — PROJECT_SPEC.md Section 9, tasks 3 and 4.
// Approved work, split by who does it. The drone column is deliberately
// roadmap-flagged and non-functional: that honesty is a pitch asset (Section 15).

import { useCallback, useMemo, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import TicketPanel from "@/components/TicketPanel";
import {
  CROP_LABEL,
  SEVERITY_ACCENT,
  formatCoords,
  formatRelative,
  isActionable,
  severityFor,
} from "@/components/ticketMeta";
import { patchTicket, useTickets } from "@/components/useTickets";
import type { Ticket } from "@/lib/types";

const SECTION_LABEL =
  "font-mono text-[11px] uppercase tracking-[0.18em] text-canopy-900/50";

export default function TodoPage() {
  const { tickets, loading, error, applyUpdate } = useTickets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const actionable = tickets.filter(isActionable);
    return {
      review: tickets.filter((ticket) => ticket.status === "new"),
      farmer: actionable.filter((ticket) => ticket.assignedTo === "farmer"),
      drone: actionable.filter((ticket) => ticket.assignedTo === "drone"),
      completed: tickets.filter((ticket) => ticket.status === "completed"),
    };
  }, [tickets]);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  /** Checkbox both ways — un-ticking sends it back to the list for a re-run. */
  const toggleComplete = useCallback(
    async (ticket: Ticket) => {
      setPendingId(ticket.id);
      setActionError(null);
      try {
        applyUpdate(
          await patchTicket(ticket.id, {
            status: ticket.status === "completed" ? "approved" : "completed",
          }),
        );
      } catch (cause) {
        setActionError(
          cause instanceof Error ? cause.message : "could not update ticket",
        );
      } finally {
        setPendingId(null);
      }
    },
    [applyUpdate],
  );

  return (
    <>
      <DashboardHeader tickets={tickets} />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-8">
        <h1 className="text-2xl font-semibold text-canopy-900">To-do</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-canopy-900/65">
          Everything you approved from the map, in the order it was flagged.
          Tick it off when the block is done.
        </p>

        {actionError && (
          <p
            role="alert"
            className="mt-5 border-l-2 border-alert-600 bg-alert-600/[0.06] px-3 py-2 font-mono text-[11px] text-alert-600"
          >
            {actionError}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-5 border-l-2 border-alert-600 bg-alert-600/[0.06] px-3 py-2 font-mono text-[11px] text-alert-600"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-10 font-mono text-xs tracking-[0.14em] text-canopy-900/40">
            LOADING TICKETS…
          </p>
        ) : (
          <div className="mt-10 space-y-12">
            {/* Flagged but not yet triaged. Also the demo's fallback path if the
                map is unavailable — every ticket is reachable without Leaflet. */}
            {groups.review.length > 0 && (
              <section>
                <div className="flex items-baseline gap-3">
                  <h2 className={SECTION_LABEL}>Needs review</h2>
                  <span className="font-mono text-[11px] text-canopy-900/40">
                    {groups.review.length}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-canopy-900/8 border-y border-canopy-900/10">
                  {groups.review.map((ticket) => (
                    <TaskRow
                      key={ticket.id}
                      ticket={ticket}
                      review
                      pending={false}
                      onToggle={() => undefined}
                      onOpen={() => setSelectedId(ticket.id)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* Farmer's own work */}
            <section>
              <div className="flex items-baseline gap-3">
                <h2 className={SECTION_LABEL}>Your tasks</h2>
                <span className="font-mono text-[11px] text-canopy-900/40">
                  {groups.farmer.length}
                </span>
              </div>

              {groups.farmer.length === 0 ? (
                <EmptyState>
                  Nothing waiting on you. Approve a flagged scan from the{" "}
                  <a
                    href="/map"
                    className="underline underline-offset-2 hover:text-canopy-900"
                  >
                    map
                  </a>{" "}
                  and it lands here.
                </EmptyState>
              ) : (
                <ul className="mt-3 divide-y divide-canopy-900/8 border-y border-canopy-900/10">
                  {groups.farmer.map((ticket) => (
                    <TaskRow
                      key={ticket.id}
                      ticket={ticket}
                      pending={pendingId === ticket.id}
                      onToggle={() => toggleComplete(ticket)}
                      onOpen={() => setSelectedId(ticket.id)}
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* Section 9 task 3 — visibly roadmap, visibly not wired up */}
            <section>
              <div className="flex items-baseline gap-3">
                <h2 className={SECTION_LABEL}>Drone queue</h2>
                <span className="rounded-[2px] bg-soil-500/12 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-soil-500">
                  Roadmap
                </span>
                <span className="font-mono text-[11px] text-canopy-900/40">
                  {groups.drone.length}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-canopy-900/55">
                Queued, not flown. NZ CAA Part 102 requires a supervising human
                observer for any agrichemical drone flight regardless of
                autonomy — what we automate today is the scheduling and
                detection, not the legal oversight requirement.
              </p>

              {groups.drone.length === 0 ? (
                <EmptyState>
                  Nothing queued. Assign a task to the drone from the ticket
                  panel to stage it here.
                </EmptyState>
              ) : (
                <ul className="mt-3 divide-y divide-canopy-900/8 border-y border-canopy-900/10 opacity-80">
                  {groups.drone.map((ticket) => (
                    <TaskRow
                      key={ticket.id}
                      ticket={ticket}
                      queued
                      pending={false}
                      onToggle={() => undefined}
                      onOpen={() => setSelectedId(ticket.id)}
                    />
                  ))}
                </ul>
              )}
            </section>

            {groups.completed.length > 0 && (
              <section>
                <div className="flex items-baseline gap-3">
                  <h2 className={SECTION_LABEL}>Completed</h2>
                  <span className="font-mono text-[11px] text-canopy-900/40">
                    {groups.completed.length}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-canopy-900/8 border-y border-canopy-900/10">
                  {groups.completed.map((ticket) => (
                    <TaskRow
                      key={ticket.id}
                      ticket={ticket}
                      done
                      pending={pendingId === ticket.id}
                      onToggle={() => toggleComplete(ticket)}
                      onOpen={() => setSelectedId(ticket.id)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>

      <TicketPanel
        ticket={selected}
        onClose={() => setSelectedId(null)}
        onUpdated={applyUpdate}
      />
    </>
  );
}

function TaskRow({
  ticket,
  pending,
  done = false,
  queued = false,
  review = false,
  onToggle,
  onOpen,
}: {
  ticket: Ticket;
  pending: boolean;
  done?: boolean;
  queued?: boolean;
  review?: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const accent = SEVERITY_ACCENT[severityFor(ticket)];

  return (
    <li className="group flex items-start gap-3.5 py-3.5">
      <span className="pt-0.5">
        {review ? (
          <span
            title="Not triaged yet — open it to approve, edit or reject"
            className="grid h-[18px] w-[18px] place-items-center"
          >
            <span className="h-2 w-2 rounded-full bg-veraison-500" />
          </span>
        ) : queued ? (
          <span
            title="Drone execution is roadmap — not available tonight"
            className="grid h-[18px] w-[18px] place-items-center rounded-[3px] border border-dashed border-soil-500/50 text-soil-500"
          >
            <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" aria-hidden="true">
              <path
                d="M8 4v4l2.5 1.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
        ) : (
          <input
            type="checkbox"
            checked={done}
            disabled={pending}
            onChange={onToggle}
            aria-label={`Mark ${ticket.diagnosis.condition} at ${formatCoords(ticket.lat, ticket.lng)} complete`}
            className="h-[18px] w-[18px] cursor-pointer accent-canopy-600 disabled:cursor-wait"
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy-600"
        >
          <span
            className={`text-[15px] font-medium ${
              done
                ? "text-canopy-900/45 line-through"
                : `${accent.text} group-hover:underline underline-offset-2`
            }`}
          >
            {ticket.diagnosis.condition}
          </span>
        </button>

        <p
          className={`mt-0.5 text-[13px] leading-relaxed ${
            done ? "text-canopy-900/35" : "text-canopy-900/70"
          }`}
        >
          {ticket.diagnosis.suggestedTreatment}
        </p>

        {ticket.farmerNotes && (
          <p className="mt-1.5 border-l-2 border-soil-500/40 pl-2.5 text-[12px] leading-relaxed text-canopy-900/60">
            {ticket.farmerNotes}
          </p>
        )}

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-canopy-900/45">
          <span>{CROP_LABEL[ticket.cropType]}</span>
          <span aria-hidden="true">·</span>
          <span>{formatCoords(ticket.lat, ticket.lng)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatRelative(ticket.createdAt)}</span>
          {ticket.status === "edited" && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-soil-500">Edited</span>
            </>
          )}
        </p>
      </div>

      <span className="shrink-0 pt-0.5 font-mono text-[10px] tracking-[0.12em] text-canopy-900/35">
        {ticket.id.toUpperCase()}
      </span>
    </li>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 border border-dashed border-canopy-900/15 px-4 py-6 text-center text-[13px] leading-relaxed text-canopy-900/50">
      {children}
    </p>
  );
}
