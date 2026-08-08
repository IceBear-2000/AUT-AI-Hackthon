// LANE Z — Spec Section 10 task 5, built to Section 7.
// Stat cards with Plex Mono numerals plus one bar chart. Deliberately not
// overbuilt: no chart library, no date filters, no drill-downs.
"use client";

import { useCallback, useEffect, useState } from "react";
import treatments from "@/lib/treatments.json";
import type { CropType, Ticket, TicketStatus } from "@/lib/types";

type TreatmentEntry = { symptoms: string; response: string; severity: string };
const library = treatments as Record<CropType, Record<string, TreatmentEntry>>;

/**
 * Tickets carry the display label ("Grape Black Rot"); treatments.json is keyed
 * by the bare condition ("Black Rot"). Match within the ticket's own crop and
 * take the longest hit, so apple's "Black Rot (Frogeye Leaf Spot)" never loses
 * to the shorter grape "Black Rot".
 *
 * Note this deliberately does not import from lib/diagnosis — that module pulls
 * in node:fs and the Anthropic SDK, which must not reach a client bundle.
 */
function severityOf(cropType: CropType, condition: string): string {
  const key = Object.keys(library[cropType])
    .filter((k) => condition.includes(k))
    .sort((a, b) => b.length - a.length)[0];
  return key ? library[cropType][key].severity : "none";
}

const SEVERITY_COLOR: Record<string, string> = {
  high: "bg-alert-600",
  medium: "bg-veraison-500",
  none: "bg-canopy-600",
};

const STATUS_ORDER: TicketStatus[] = [
  "new",
  "approved",
  "edited",
  "completed",
  "rejected",
];

const STATUS_COLOR: Record<TicketStatus, string> = {
  new: "bg-veraison-500",
  approved: "bg-canopy-600",
  edited: "bg-canopy-600",
  completed: "bg-canopy-900",
  rejected: "bg-soil-500",
};

function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

/** Readout-style stat card. The numeral is the point, so it carries the weight. */
function Stat({
  label,
  value,
  hint,
  accent = "text-canopy-900",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="border border-canopy-900/10 bg-white/50 px-4 py-3">
      <p className="font-mono text-[10px] tracking-widest text-canopy-700/70">
        {label}
      </p>
      <p className={`mt-2 font-mono text-3xl leading-none ${accent}`}>{value}</p>
      {hint ? (
        <p className="mt-1.5 font-mono text-[10px] text-canopy-700/60">{hint}</p>
      ) : null}
    </div>
  );
}

/** One horizontal bar. CSS only — a chart library would be overbuilding this. */
function Bar({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-40 shrink-0 truncate text-sm text-canopy-900 sm:w-80"
        title={label}
      >
        {label}
      </span>
      <div className="h-5 flex-1 bg-canopy-900/5">
        <div
          className={`h-full ${color} transition-[width] duration-500 ease-out`}
          // A zero draws nothing. A minimum width would read as "a few".
          style={{
            width: count === 0 || max === 0 ? "0%" : `${Math.max((count / max) * 100, 2)}%`,
          }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums text-canopy-900">
        {count}
      </span>
    </div>
  );
}

export default function InsightsPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      // no-store: this page must show a ticket that was marked complete seconds
      // ago on /todo — a cached list would silently make the demo look broken.
      const response = await fetch("/api/tickets", { cache: "no-store", signal });
      if (!response.ok) throw new Error(`GET /api/tickets -> ${response.status}`);
      const data = (await response.json()) as { tickets: Ticket[] };
      if (signal?.aborted) return;
      setTickets(data.tickets);
      setError(null);
      setUpdatedAt(new Date().toLocaleTimeString("en-NZ", { hour12: false }));
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    // Fetching remote data is exactly the "subscribe to an external system" case
    // effects are for, and every setState above happens after an await, never
    // synchronously in the effect body — so the cascading-render risk the rule
    // guards against does not apply. The controller drops any in-flight response
    // on unmount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);

    // Coming back from /todo after marking something complete should show the
    // new numbers without a manual reload.
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const all = tickets ?? [];
  const byStatus = countBy(all.map((t) => t.status));
  const byCrop = countBy(all.map((t) => t.cropType));
  const byCondition = countBy(all.map((t) => t.diagnosis.condition));

  const diseased = all.filter((t) => t.diagnosis.condition !== "Healthy");
  const openWork = all.filter(
    (t) => t.status === "approved" || t.status === "edited",
  );
  const diseaseRate = all.length
    ? Math.round((diseased.length / all.length) * 100)
    : 0;
  const avgConfidence = all.length
    ? all.reduce((sum, t) => sum + t.diagnosis.confidence, 0) / all.length
    : 0;

  const conditionRows = [...byCondition.entries()].sort((a, b) => {
    // Healthy last — the diseases are what the farmer is scanning this page for.
    if (a[0] === "Healthy") return 1;
    if (b[0] === "Healthy") return -1;
    return b[1] - a[1];
  });
  const conditionMax = Math.max(1, ...conditionRows.map(([, n]) => n));
  const statusMax = Math.max(1, ...STATUS_ORDER.map((s) => byStatus.get(s) ?? 0));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-canopy-900/10 pb-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-soil-500">
            FARMSENTRY // RENWICK-01
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-canopy-900">Insights</h1>
        </div>
        <nav className="flex items-center gap-4 font-mono text-xs">
          <a className="text-canopy-600 hover:underline" href="/map">
            ← MAP
          </a>
          <a className="text-canopy-600 hover:underline" href="/todo">
            TO-DO
          </a>
          <button
            type="button"
            onClick={() => void load()}
            className="border border-canopy-900/15 px-2 py-1 text-canopy-700 transition-colors hover:bg-canopy-900/5"
          >
            REFRESH
          </button>
        </nav>
      </header>

      {error ? (
        <p className="mt-6 border border-alert-600/30 bg-alert-600/5 px-4 py-3 font-mono text-xs text-alert-600">
          {error}
        </p>
      ) : null}

      {tickets === null && !error ? (
        <p className="mt-8 font-mono text-xs text-canopy-700/60">LOADING…</p>
      ) : null}

      {tickets !== null ? (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="TOTAL SCANS" value={all.length} />
            <Stat
              label="NEEDS REVIEW"
              value={byStatus.get("new") ?? 0}
              accent="text-veraison-500"
              hint="status: new"
            />
            <Stat
              label="OPEN ACTIONS"
              value={openWork.length}
              accent="text-canopy-600"
              hint="approved + edited"
            />
            <Stat
              label="COMPLETED"
              value={byStatus.get("completed") ?? 0}
              accent="text-canopy-600"
            />
            <Stat
              label="DISEASE RATE"
              value={`${diseaseRate}%`}
              accent={diseaseRate >= 40 ? "text-alert-600" : "text-canopy-900"}
              hint={`${diseased.length} of ${all.length} scans`}
            />
          </section>

          <section className="mt-10">
            <h2 className="font-mono text-xs tracking-widest text-canopy-600">
              BY CONDITION
            </h2>
            <div className="mt-4 space-y-2">
              {conditionRows.length === 0 ? (
                <p className="font-mono text-xs text-canopy-700/60">NO SCANS YET</p>
              ) : (
                conditionRows.map(([condition, count]) => {
                  // Colour by clinical severity, not by chart index — the bar
                  // tells the farmer how urgent the block is, at a glance.
                  const crop =
                    all.find((t) => t.diagnosis.condition === condition)?.cropType ??
                    "grape";
                  const severity =
                    condition === "Healthy" ? "none" : severityOf(crop, condition);
                  return (
                    <Bar
                      key={condition}
                      label={condition}
                      count={count}
                      max={conditionMax}
                      color={SEVERITY_COLOR[severity] ?? "bg-canopy-600"}
                    />
                  );
                })
              )}
            </div>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] text-canopy-700/60">
              <span>
                <span className="mr-1.5 inline-block h-2 w-2 bg-alert-600 align-middle" />
                HIGH SEVERITY
              </span>
              <span>
                <span className="mr-1.5 inline-block h-2 w-2 bg-veraison-500 align-middle" />
                MEDIUM
              </span>
              <span>
                <span className="mr-1.5 inline-block h-2 w-2 bg-canopy-600 align-middle" />
                HEALTHY
              </span>
            </p>
          </section>

          <section className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="font-mono text-xs tracking-widest text-canopy-600">
                BY STATUS
              </h2>
              <div className="mt-4 space-y-2">
                {STATUS_ORDER.map((status) => (
                  <Bar
                    key={status}
                    label={status}
                    count={byStatus.get(status) ?? 0}
                    max={statusMax}
                    color={STATUS_COLOR[status]}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-mono text-xs tracking-widest text-canopy-600">
                BY CROP
              </h2>
              <dl className="mt-4 divide-y divide-canopy-900/10 border-y border-canopy-900/10">
                {(["grape", "apple"] as CropType[]).map((crop) => {
                  const cropTickets = all.filter((t) => t.cropType === crop);
                  const cropDiseased = cropTickets.filter(
                    (t) => t.diagnosis.condition !== "Healthy",
                  ).length;
                  return (
                    <div
                      key={crop}
                      className="flex items-baseline justify-between py-2.5"
                    >
                      <dt className="text-sm capitalize text-canopy-900">{crop}</dt>
                      <dd className="font-mono text-sm tabular-nums text-canopy-900">
                        {byCrop.get(crop) ?? 0}
                        <span className="ml-2 text-xs text-canopy-700/60">
                          {cropDiseased} flagged
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <h2 className="mt-8 font-mono text-xs tracking-widest text-canopy-600">
                MODEL
              </h2>
              <dl className="mt-4 divide-y divide-canopy-900/10 border-y border-canopy-900/10">
                <div className="flex items-baseline justify-between py-2.5">
                  <dt className="text-sm text-canopy-900">Mean confidence</dt>
                  <dd className="font-mono text-sm tabular-nums text-canopy-900">
                    {avgConfidence.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-2.5">
                  <dt className="text-sm text-canopy-900">Low confidence (&lt;0.85)</dt>
                  <dd className="font-mono text-sm tabular-nums text-canopy-900">
                    {all.filter((t) => t.diagnosis.confidence < 0.85).length}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <footer className="mt-12 border-t border-soil-500/20 pt-4 font-mono text-[10px] leading-relaxed text-canopy-700/60">
            <p>
              {updatedAt ? `UPDATED ${updatedAt} · ` : ""}
              {all.length} TICKETS · SOURCE GET /api/tickets
            </p>
            <p className="mt-1">
              Triage and prioritisation only. Conditions are model-suggested and
              farmer-verified, not a registered chemical prescription.
            </p>
          </footer>
        </>
      ) : null}
    </main>
  );
}
