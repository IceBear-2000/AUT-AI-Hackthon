"use client";

// LANE Y — PROJECT_SPEC.md Section 9, tasks 3 and 4.
// Approved work, split by who does it. The drone column is deliberately
// roadmap-flagged and non-functional: that honesty is a pitch asset (Section 15).

import { useCallback, useMemo, useState } from "react";
import TicketPanel from "@/components/TicketPanel";
import { useTicketStore } from "@/components/TicketsProvider";
import {
  CROP_LABEL,
  SEVERITY_ACCENT,
  formatCoords,
  formatRelative,
  isActionable,
  severityFor,
} from "@/components/ticketMeta";
import { patchTicket } from "@/components/useTickets";
import type { Ticket } from "@/lib/types";

const SECTION_LABEL =
  "font-mono text-[11px] uppercase tracking-[0.18em] text-tertiary";

export default function TodoPage() {
  const { tickets, loading, error, applyUpdate } = useTicketStore();
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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-9">
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-primary sm:text-3xl">
          To-do
        </h1>
        <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-secondary">
          Everything you approved from the map, in the order it was flagged.
          Tick it off when the block is done.
        </p>

        {actionError && (
          <p
            role="alert"
            className="mt-5 border-l-2 border-status-alert bg-status-alert/10 px-3 py-2 font-mono text-[11px] text-status-alert"
          >
            {actionError}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-5 border-l-2 border-status-alert bg-status-alert/10 px-3 py-2 font-mono text-[11px] text-status-alert"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-10 font-mono text-xs tracking-[0.14em] text-tertiary">
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
                  <span className="font-mono text-[11px] text-tertiary">
                    {groups.review.length}
                  </span>
                </div>
                <ul className="mt-3 space-y-2.5">
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
                <span className="font-mono text-[11px] text-tertiary">
                  {groups.farmer.length}
                </span>
              </div>

              {groups.farmer.length === 0 ? (
                <EmptyState>
                  Nothing waiting on you. Approve a flagged scan from the{" "}
                  <a
                    href="/map"
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    map
                  </a>{" "}
                  and it lands here.
                </EmptyState>
              ) : (
                <ul className="mt-3 space-y-2.5">
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
                <span className="rounded-[2px] bg-status-muted/12 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-status-muted">
                  Roadmap
                </span>
                <span className="font-mono text-[11px] text-tertiary">
                  {groups.drone.length}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-secondary">
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
                <ul className="mt-3 space-y-2.5 opacity-80">
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
                  <span className="font-mono text-[11px] text-tertiary">
                    {groups.completed.length}
                  </span>
                </div>
                <ul className="mt-3 space-y-2.5">
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
      </div>

      <TicketPanel
        ticket={selected}
        onClose={() => setSelectedId(null)}
        onUpdated={applyUpdate}
      />
    </div>
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
    <li className="card card-interactive relative flex items-start gap-3.5 overflow-hidden py-3.5 pl-4 pr-3.5">
      {/* Severity reads at a glance from the card edge, before any text. */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-[3px] ${accent.bar} ${
          done ? "opacity-30" : ""
        }`}
      />
      <span className="pt-0.5">
        {review ? (
          <span
            title="Not triaged yet — open it to approve, edit or reject"
            className="grid h-[18px] w-[18px] place-items-center"
          >
            <span className="h-2 w-2 rounded-full bg-status-new" />
          </span>
        ) : queued ? (
          <span
            title="Drone execution is roadmap — not available tonight"
            className="grid h-[18px] w-[18px] place-items-center rounded-[3px] border border-dashed border-status-muted/50 text-status-muted"
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
            className="h-[18px] w-[18px] cursor-pointer accent-[var(--accent)] disabled:cursor-wait"
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            className={`text-[15px] font-medium ${
              done
                ? "text-tertiary line-through"
                : `${accent.text} group-hover:underline underline-offset-2`
            }`}
          >
            {ticket.diagnosis.condition}
          </span>
        </button>

        <p
          className={`mt-0.5 text-[13px] leading-relaxed ${
            done ? "text-tertiary" : "text-secondary"
          }`}
        >
          {ticket.diagnosis.suggestedTreatment}
        </p>

        {ticket.farmerNotes && (
          <p className="mt-1.5 border-l-2 border-status-muted/40 pl-2.5 text-[12px] leading-relaxed text-secondary">
            {ticket.farmerNotes}
          </p>
        )}

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-tertiary">
          <span>{CROP_LABEL[ticket.cropType]}</span>
          <span aria-hidden="true">·</span>
          <span>{formatCoords(ticket.lat, ticket.lng)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatRelative(ticket.createdAt)}</span>
          {ticket.status === "edited" && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-status-muted">Edited</span>
            </>
          )}
        </p>
      </div>

      <span className="shrink-0 pt-0.5 font-mono text-[10px] tracking-[0.12em] text-tertiary">
        {ticket.id.toUpperCase()}
      </span>
    </li>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-card border border-dashed border-hairline px-4 py-7 text-center text-[13px] leading-relaxed text-tertiary">
      {children}
    </p>
  );
}
