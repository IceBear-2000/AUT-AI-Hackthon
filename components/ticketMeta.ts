// LANE Y — presentation metadata shared by the panel and the to-do list.
// Colour semantics are PROJECT_SPEC.md Section 7; nothing here touches the API.

import treatments from "@/lib/treatments.json";
import type { CropType, Ticket, TicketStatus } from "@/lib/types";

type TreatmentEntry = { symptoms: string; response: string; severity: string };
const library = treatments as Record<CropType, Record<string, TreatmentEntry>>;

/**
 * `diagnosis.condition` is the display label ("Grape Black Rot"), but
 * treatments.json is keyed by the bare condition ("Black Rot"). `label()` in
 * lib/diagnosis only ever prefixes the crop name, so stripping it reverses
 * cleanly — and "Apple Scab" already starts with its crop, so it hits directly.
 */
export function treatmentFor(ticket: Ticket): TreatmentEntry | undefined {
  const crop = library[ticket.cropType];
  const { condition } = ticket.diagnosis;
  if (crop[condition]) return crop[condition];

  const prefix = ticket.cropType === "grape" ? "Grape " : "Apple ";
  return condition.startsWith(prefix)
    ? crop[condition.slice(prefix.length)]
    : undefined;
}

export function isHealthy(ticket: Ticket): boolean {
  return ticket.diagnosis.condition === "Healthy";
}

/** Drives the urgency accent — Section 7 reserves `alert` for genuine severity. */
export function severityFor(ticket: Ticket): "high" | "medium" | "none" {
  const severity = treatmentFor(ticket)?.severity;
  return severity === "high" || severity === "medium" ? severity : "none";
}

/** Tailwind needs whole class strings, so these are written out, never built up.
 *  All semantic tokens — they re-resolve per theme, so nothing here is a
 *  light-mode-only colour. */
export const SEVERITY_ACCENT: Record<
  "high" | "medium" | "none",
  { text: string; bar: string; rule: string }
> = {
  high: {
    text: "text-status-alert",
    bar: "bg-status-alert",
    rule: "border-status-alert/35",
  },
  medium: {
    text: "text-status-new",
    bar: "bg-status-new",
    rule: "border-status-new/35",
  },
  none: {
    text: "text-status-ok",
    bar: "bg-status-ok",
    rule: "border-status-ok/30",
  },
};

export const STATUS_META: Record<
  TicketStatus,
  { label: string; pill: string; dot: string }
> = {
  new: {
    label: "Needs review",
    pill: "bg-status-new/14 text-status-new ring-status-new/30",
    dot: "bg-status-new",
  },
  approved: {
    label: "Approved",
    pill: "bg-status-ok/14 text-status-ok ring-status-ok/30",
    dot: "bg-status-ok",
  },
  edited: {
    label: "Edited by farmer",
    pill: "bg-status-muted/14 text-status-muted ring-status-muted/30",
    dot: "bg-status-muted",
  },
  rejected: {
    label: "Dismissed",
    pill: "bg-sunken text-tertiary ring-hairline",
    dot: "bg-status-muted",
  },
  completed: {
    label: "Completed",
    pill: "bg-status-ok/14 text-status-ok ring-status-ok/30",
    dot: "bg-status-ok",
  },
};

/** Approved and edited both mean "the farmer accepted this" — both are actionable. */
export function isActionable(ticket: Ticket): boolean {
  return ticket.status === "approved" || ticket.status === "edited";
}

/* ── Workflow stages ───────────────────────────────────────────────────────
   Three screens, one frozen status field. Where a ticket sits also decides
   what the farmer can do to it, so both are derived in one place rather than
   passed down as a prop each screen could get wrong. */

export type Stage = "triage" | "task" | "archive";

export function stageFor(ticket: Ticket): Stage {
  if (ticket.status === "new") return "triage";
  if (ticket.status === "completed" || ticket.status === "rejected") {
    return "archive";
  }
  return "task";
}

/* ── Triage buckets ────────────────────────────────────────────────────────
   Critical / Medium / All good read straight off treatments.json severity, so
   the grouping is the content library's clinical judgement rather than a
   second opinion invented in the UI. */

export type Bucket = "critical" | "medium" | "ok";

export const BUCKET_ORDER: Bucket[] = ["critical", "medium", "ok"];

export function bucketFor(ticket: Ticket): Bucket {
  const severity = severityFor(ticket);
  if (severity === "high") return "critical";
  if (severity === "medium") return "medium";
  return "ok";
}

export const BUCKET_META: Record<
  Bucket,
  { label: string; blurb: string; dot: string; text: string; edge: string }
> = {
  critical: {
    label: "Critical",
    blurb: "High disease pressure — act on these first.",
    dot: "bg-status-alert",
    text: "text-status-alert",
    edge: "border-t-status-alert",
  },
  medium: {
    label: "Medium",
    blurb: "Worth planning for, not an emergency.",
    dot: "bg-status-new",
    text: "text-status-new",
    edge: "border-t-status-new",
  },
  ok: {
    label: "All good",
    blurb: "Nothing found — logged as a healthy baseline.",
    dot: "bg-status-ok",
    text: "text-status-ok",
    edge: "border-t-status-ok",
  },
};

/** Critical first, then medium, then healthy; newest first inside a bucket. */
export function byUrgency(a: Ticket, b: Ticket): number {
  const rank =
    BUCKET_ORDER.indexOf(bucketFor(a)) - BUCKET_ORDER.indexOf(bucketFor(b));
  return rank !== 0 ? rank : b.createdAt.localeCompare(a.createdAt);
}

export const CROP_LABEL: Record<CropType, string> = {
  grape: "Grape",
  apple: "Apple",
};

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/** Telemetry-style coordinates — Section 7 puts instrument data in Plex Mono. */
export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function formatRelative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
