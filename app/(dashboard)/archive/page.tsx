"use client";

// Archive — the record of what happened. Completed work and discarded findings
// both live here rather than vanishing, so "what did we decide about block 4"
// is answerable, and a wrongly-dismissed finding can be reopened.

import { useMemo, useState } from "react";
import TicketCard from "@/components/TicketCard";
import TicketPanel from "@/components/TicketPanel";
import { useTicketStore } from "@/components/TicketsProvider";
import { byUrgency } from "@/components/ticketMeta";
import type { Ticket } from "@/lib/types";

export default function ArchivePage() {
  const { tickets, loading, error, applyUpdate } = useTicketStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { completed, discarded } = useMemo(
    () => ({
      completed: tickets
        .filter((ticket) => ticket.status === "completed")
        .sort(byUrgency),
      discarded: tickets
        .filter((ticket) => ticket.status === "rejected")
        .sort(byUrgency),
    }),
    [tickets],
  );

  const total = completed.length + discarded.length;
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-9">
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-primary sm:text-3xl">
          Archive
        </h1>
        <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-secondary">
          Work you&rsquo;ve finished and findings you dismissed. Open any of them
          to reopen it.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-card border border-status-alert/30 bg-status-alert/10 px-3.5 py-2.5 text-[13px] text-status-alert"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-10 font-mono text-xs tracking-[0.14em] text-tertiary">
            LOADING…
          </p>
        ) : total === 0 ? (
          <p className="mt-8 rounded-card border border-dashed border-hairline px-4 py-10 text-center text-[14px] leading-relaxed text-tertiary">
            Nothing archived yet.
            <br />
            Finish a task on your{" "}
            <a
              href="/todo"
              className="underline underline-offset-2 hover:text-primary"
            >
              to-do list
            </a>{" "}
            and it lands here.
          </p>
        ) : (
          <div className="mt-7 space-y-10">
            <Group
              title="Completed"
              hint="Done and dusted."
              tickets={completed}
              onOpen={setSelectedId}
            />
            <Group
              title="Discarded"
              hint="Dismissed as not worth acting on — logged for the next training run."
              tickets={discarded}
              onOpen={setSelectedId}
            />
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

function Group({
  title,
  hint,
  tickets,
  onOpen,
}: {
  title: string;
  hint: string;
  tickets: Ticket[];
  onOpen: (id: string) => void;
}) {
  if (tickets.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-tertiary">
          {title}
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-tertiary">
          {tickets.length}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-tertiary">{hint}</p>
      <ul className="mt-3 space-y-2.5">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            muted
            onOpen={() => onOpen(ticket.id)}
          />
        ))}
      </ul>
    </section>
  );
}
