// Insights — Spec Section 10 task 5.
// Stat cards plus one chart, counts by status / crop / condition. Reads the
// shared ticket store, so marking something complete on /todo is reflected the
// moment you land here. Deliberately not overbuilt.
"use client";

import { useTicketStore } from "@/components/TicketsProvider";
import { SEVERITY_ACCENT, isActionable, severityFor } from "@/components/ticketMeta";
import type { CropType, Ticket, TicketStatus } from "@/lib/types";

const STATUS_ORDER: TicketStatus[] = [
  "new",
  "approved",
  "edited",
  "completed",
  "rejected",
];

const STATUS_LABEL: Record<TicketStatus, string> = {
  new: "Needs review",
  approved: "Approved",
  edited: "Edited",
  completed: "Completed",
  rejected: "Dismissed",
};

const STATUS_BAR: Record<TicketStatus, string> = {
  new: "bg-status-new",
  approved: "bg-status-ok",
  edited: "bg-status-ok",
  completed: "bg-accent",
  rejected: "bg-status-muted",
};

function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function Stat({
  label,
  value,
  hint,
  tone = "text-primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-[12px] font-medium text-tertiary">{label}</p>
      <p
        className={`mt-1.5 font-mono text-[28px] leading-none tabular-nums ${tone}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] text-tertiary">{hint}</p> : null}
    </div>
  );
}

/** CSS-only horizontal bar. A chart library would be overbuilding this. */
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
        className="w-[38%] shrink-0 truncate text-[13px] text-primary sm:w-[42%] sm:text-sm"
        title={label}
      >
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-pill bg-sunken">
        <div
          className={`h-full rounded-pill ${color} transition-[width] duration-500 ease-out`}
          // A zero draws nothing — a minimum width would read as "a few".
          style={{
            width:
              count === 0 || max === 0 ? "0%" : `${Math.max((count / max) * 100, 3)}%`,
          }}
        />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[13px] tabular-nums text-secondary">
        {count}
      </span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card px-4 py-4 sm:px-5 sm:py-5">
      <h2 className="text-[13px] font-semibold text-primary">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function InsightsPage() {
  const { tickets, loading, error } = useTicketStore();

  const byStatus = countBy(tickets.map((t) => t.status));
  const byCrop = countBy(tickets.map((t) => t.cropType));
  const byCondition = countBy(tickets.map((t) => t.diagnosis.condition));

  const diseased = tickets.filter((t) => t.diagnosis.condition !== "Healthy");
  const openWork = tickets.filter(isActionable);
  const diseaseRate = tickets.length
    ? Math.round((diseased.length / tickets.length) * 100)
    : 0;
  const avgConfidence = tickets.length
    ? tickets.reduce((sum, t) => sum + t.diagnosis.confidence, 0) / tickets.length
    : 0;
  const lowConfidence = tickets.filter((t) => t.diagnosis.confidence < 0.85).length;

  const conditionRows = [...byCondition.entries()].sort((a, b) => {
    // Healthy last — the diseases are what the farmer opens this page for.
    if (a[0] === "Healthy") return 1;
    if (b[0] === "Healthy") return -1;
    return b[1] - a[1];
  });
  const conditionMax = Math.max(1, ...conditionRows.map(([, n]) => n));
  const statusMax = Math.max(1, ...STATUS_ORDER.map((s) => byStatus.get(s) ?? 0));

  /** Colour a condition bar by clinical severity, not by chart index. */
  function conditionColor(condition: string): string {
    if (condition === "Healthy") return SEVERITY_ACCENT.none.bar;
    const sample = tickets.find((t) => t.diagnosis.condition === condition);
    return sample ? SEVERITY_ACCENT[severityFor(sample)].bar : SEVERITY_ACCENT.none.bar;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-9">
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-primary sm:text-3xl">
          Insights
        </h1>
        <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-secondary">
          Every scan this season, and what came of it.
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
        ) : tickets.length === 0 ? (
          <p className="mt-8 rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[14px] text-tertiary">
            No scans yet. Trigger one from the map and it shows up here.
          </p>
        ) : (
          <div className="mt-7 space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Total scans" value={tickets.length} />
              <Stat
                label="Needs review"
                value={byStatus.get("new") ?? 0}
                tone="text-status-new"
              />
              <Stat
                label="Open actions"
                value={openWork.length}
                tone="text-status-ok"
                hint="approved + edited"
              />
              <Stat
                label="Disease rate"
                value={`${diseaseRate}%`}
                tone={diseaseRate >= 40 ? "text-status-alert" : "text-primary"}
                hint={`${diseased.length} of ${tickets.length}`}
              />
            </div>

            <Section title="By condition">
              <div className="space-y-2.5">
                {conditionRows.map(([condition, count]) => (
                  <Bar
                    key={condition}
                    label={condition}
                    count={count}
                    max={conditionMax}
                    color={conditionColor(condition)}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-hairline pt-3 text-[11px] text-tertiary">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-status-alert" />
                  High severity
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-status-new" />
                  Medium
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-status-ok" />
                  Healthy
                </span>
              </div>
            </Section>

            <Section title="By status">
              <div className="space-y-2.5">
                {STATUS_ORDER.map((status) => (
                  <Bar
                    key={status}
                    label={STATUS_LABEL[status]}
                    count={byStatus.get(status) ?? 0}
                    max={statusMax}
                    color={STATUS_BAR[status]}
                  />
                ))}
              </div>
            </Section>

            <div className="grid gap-4 sm:grid-cols-2">
              <Section title="By crop">
                <dl className="space-y-3">
                  {(["grape", "apple"] as CropType[]).map((crop) => {
                    const cropTickets = tickets.filter(
                      (t: Ticket) => t.cropType === crop,
                    );
                    const flagged = cropTickets.filter(
                      (t) => t.diagnosis.condition !== "Healthy",
                    ).length;
                    return (
                      <div
                        key={crop}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <dt className="text-[14px] capitalize text-primary">
                          {crop}
                        </dt>
                        <dd className="font-mono text-[14px] tabular-nums text-primary">
                          {byCrop.get(crop) ?? 0}
                          <span className="ml-2 text-[12px] text-tertiary">
                            {flagged} flagged
                          </span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </Section>

              <Section title="Model">
                <dl className="space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[14px] text-primary">Mean confidence</dt>
                    <dd className="font-mono text-[14px] tabular-nums text-primary">
                      {avgConfidence.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[14px] text-primary">
                      Low confidence
                      <span className="ml-1 text-[12px] text-tertiary">
                        &lt; 0.85
                      </span>
                    </dt>
                    <dd className="font-mono text-[14px] tabular-nums text-primary">
                      {lowConfidence}
                    </dd>
                  </div>
                </dl>
              </Section>
            </div>

            <p className="px-1 pt-2 text-[12px] leading-relaxed text-tertiary">
              Triage and prioritisation only. Conditions are model-suggested and
              farmer-verified, not a registered chemical prescription.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
