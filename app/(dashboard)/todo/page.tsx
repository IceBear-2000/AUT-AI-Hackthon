"use client";

// To-do — only what the farmer has actually accepted. Nothing lands here
// without a human approving it first in AI Insights, which is the whole pitch:
// the model proposes, the grower decides.
//
// Sorted critical-first rather than chronologically, because the order of this
// list is the recommendation.

import { useCallback, useMemo, useState } from "react";
import TicketCard, { DoneButton } from "@/components/TicketCard";
import TicketPanel from "@/components/TicketPanel";
import { useTicketStore } from "@/components/TicketsProvider";
import { bucketFor, byUrgency, isActionable } from "@/components/ticketMeta";
import { patchTicket } from "@/components/useTickets";
import type { Ticket } from "@/lib/types";

export default function TodoPage() {
  const { tickets, loading, error, applyUpdate } = useTicketStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const tasks = useMemo(
    () => tickets.filter(isActionable).sort(byUrgency),
    [tickets],
  );

  const criticalCount = tasks.filter(
    (ticket) => bucketFor(ticket) === "critical",
  ).length;

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  const markDone = useCallback(
    async (ticket: Ticket) => {
      setPendingId(ticket.id);
      setActionError(null);
      try {
        applyUpdate(await patchTicket(ticket.id, { status: "completed" }));
      } catch (cause) {
        setActionError(
          cause instanceof Error ? cause.message : "could not update task",
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
          {criticalCount > 0 ? (
            <>
              <span className="font-medium text-status-alert">
                {criticalCount} critical
              </span>{" "}
              of {tasks.length} — worked through in priority order.
            </>
          ) : (
            <>Work you&rsquo;ve approved, in priority order. Tick it off when the
            block is done.</>
          )}
        </p>

        {(actionError || error) && (
          <p
            role="alert"
            className="mt-5 rounded-card border border-status-alert/30 bg-status-alert/10 px-3.5 py-2.5 text-[13px] text-status-alert"
          >
            {actionError ?? error}
          </p>
        )}

        {loading ? (
          <p className="mt-10 font-mono text-xs tracking-[0.14em] text-tertiary">
            LOADING…
          </p>
        ) : tasks.length === 0 ? (
          <p className="mt-8 rounded-card border border-dashed border-hairline px-4 py-10 text-center text-[14px] leading-relaxed text-tertiary">
            Nothing on your list.
            <br />
            Approve a finding in{" "}
            <a
              href="/ai-insights"
              className="underline underline-offset-2 hover:text-primary"
            >
              AI Insights
            </a>{" "}
            and it becomes a task here.
          </p>
        ) : (
          <ul className="mt-7 space-y-2.5">
            {tasks.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onOpen={() => setSelectedId(ticket.id)}
                trailing={
                  <DoneButton
                    busy={pendingId === ticket.id}
                    onClick={() => markDone(ticket)}
                    label={`Mark ${ticket.diagnosis.condition} done`}
                  />
                }
              />
            ))}
          </ul>
        )}

        {tasks.length > 0 && (
          <p className="mt-6 text-center text-[12px] text-tertiary">
            Finished work is filed in the{" "}
            <a
              href="/archive"
              className="underline underline-offset-2 hover:text-primary"
            >
              archive
            </a>
            .
          </p>
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
