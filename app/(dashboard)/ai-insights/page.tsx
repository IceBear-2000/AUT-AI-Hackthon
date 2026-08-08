"use client";

// AI Insights — everything the last analysis flagged, before a human has
// touched it. Grouped by how much it matters, because a farmer standing in a
// block needs "what do I deal with first", not a flat chronological feed.
//
// Severity comes from lib/treatments.json, so the buckets are the content
// library's clinical judgement rather than a threshold invented in the UI.

import { useMemo, useState } from "react";
import TicketCard from "@/components/TicketCard";
import TicketPanel from "@/components/TicketPanel";
import { useTicketStore } from "@/components/TicketsProvider";
import {
  BUCKET_META,
  BUCKET_ORDER,
  type Bucket,
  bucketFor,
} from "@/components/ticketMeta";
import type { Ticket } from "@/lib/types";

export default function AiInsightsPage() {
  const { tickets, loading, error, applyUpdate } = useTicketStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const buckets = useMemo(() => {
    const grouped: Record<Bucket, Ticket[]> = {
      critical: [],
      medium: [],
      ok: [],
    };
    for (const ticket of tickets) {
      if (ticket.status !== "new") continue;
      grouped[bucketFor(ticket)].push(ticket);
    }
    for (const list of Object.values(grouped)) {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return grouped;
  }, [tickets]);

  const total = BUCKET_ORDER.reduce((sum, key) => sum + buckets[key].length, 0);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-9">
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-primary sm:text-3xl">
          AI Insights
        </h1>
        <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-secondary">
          What the drone found, ranked by how much it matters. Approve what&rsquo;s
          real and it becomes a task; discard what isn&rsquo;t.
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
            Nothing waiting on you.
            <br />
            Run an analysis from the{" "}
            <a
              href="/map"
              className="underline underline-offset-2 hover:text-primary"
            >
              map
            </a>{" "}
            and the findings land here.
          </p>
        ) : (
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {BUCKET_ORDER.map((key) => (
              <BucketColumn
                key={key}
                bucket={key}
                tickets={buckets[key]}
                onOpen={setSelectedId}
              />
            ))}
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

function BucketColumn({
  bucket,
  tickets,
  onOpen,
}: {
  bucket: Bucket;
  tickets: Ticket[];
  onOpen: (id: string) => void;
}) {
  const meta = BUCKET_META[bucket];

  return (
    <section className="min-w-0">
      {/* The coloured rule is the only chrome the column needs — it reads as a
          severity band without boxing every group in its own card. */}
      <div className={`border-t-2 pt-3 ${meta.edge}`}>
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${meta.dot}`} />
          <h2 className="text-[14px] font-semibold text-primary">
            {meta.label}
          </h2>
          <span className="ml-auto font-mono text-[13px] tabular-nums text-tertiary">
            {tickets.length}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
          {meta.blurb}
        </p>
      </div>

      {tickets.length === 0 ? (
        <p className="mt-3 rounded-card border border-dashed border-hairline px-3 py-6 text-center text-[13px] text-tertiary">
          Nothing here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onOpen={() => onOpen(ticket.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
