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

/** Tailwind needs whole class strings, so these are written out, never built up. */
export const SEVERITY_ACCENT: Record<
  "high" | "medium" | "none",
  { text: string; bar: string; rule: string }
> = {
  high: {
    text: "text-alert-600",
    bar: "bg-alert-600",
    rule: "border-alert-600/35",
  },
  medium: {
    text: "text-veraison-500",
    bar: "bg-veraison-500",
    rule: "border-veraison-500/35",
  },
  none: {
    text: "text-canopy-600",
    bar: "bg-canopy-600",
    rule: "border-canopy-600/30",
  },
};

export const STATUS_META: Record<
  TicketStatus,
  { label: string; pill: string; dot: string }
> = {
  new: {
    label: "Needs review",
    pill: "bg-veraison-500/12 text-[#8a5312] ring-veraison-500/30",
    dot: "bg-veraison-500",
  },
  approved: {
    label: "Approved",
    pill: "bg-canopy-600/12 text-canopy-700 ring-canopy-600/30",
    dot: "bg-canopy-600",
  },
  edited: {
    label: "Edited by farmer",
    pill: "bg-soil-500/12 text-soil-500 ring-soil-500/30",
    dot: "bg-soil-500",
  },
  rejected: {
    label: "Dismissed",
    pill: "bg-canopy-900/8 text-canopy-900/55 ring-canopy-900/15",
    dot: "bg-canopy-900/35",
  },
  completed: {
    label: "Completed",
    pill: "bg-canopy-600/12 text-canopy-700 ring-canopy-600/30",
    dot: "bg-canopy-600",
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
