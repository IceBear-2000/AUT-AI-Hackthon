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
