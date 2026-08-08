"use client";

// One row shape for AI Insights, To-do and Archive, so a ticket looks like the
// same object wherever the farmer meets it. The thumbnail carries most of the
// recognition — a grower knows their own blocks by sight faster than by ID.

import Image from "next/image";
import {
  CROP_LABEL,
  SEVERITY_ACCENT,
  formatConfidence,
  formatCoords,
  formatRelative,
  isHealthy,
  severityFor,
} from "@/components/ticketMeta";
import type { Ticket } from "@/lib/types";

export default function TicketCard({
  ticket,
  onOpen,
  trailing,
  muted = false,
}: {
  ticket: Ticket;
  onOpen: () => void;
  /** Optional quick action (a done button, say) shown on the right. */
  trailing?: React.ReactNode;
  /** Archive rows read as settled rather than pending. */
  muted?: boolean;
}) {
  const accent = SEVERITY_ACCENT[severityFor(ticket)];
  const healthy = isHealthy(ticket);

  return (
    <li className={`card card-interactive relative flex items-center gap-3 p-3 ${muted ? "opacity-70" : ""}`}>
      {/* The whole card is the target; the trailing action sits above it. */}
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring absolute inset-0 z-0 rounded-card"
        aria-label={`Open ${ticket.diagnosis.condition} at ${formatCoords(ticket.lat, ticket.lng)}`}
      />

      <span className="pointer-events-none relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-sunken">
        <Image
          src={ticket.imageUrl}
          alt=""
          fill
          unoptimized
          // Eager: these lists are tens of rows at most, and lazy thumbnails
          // pop in one by one as the page settles, which looks broken on stage.
          loading="eager"
          sizes="56px"
          className="object-cover"
        />
      </span>

      <span className="pointer-events-none relative min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={`truncate text-[15px] font-semibold ${
              muted ? "text-secondary" : healthy ? "text-status-ok" : accent.text
            }`}
          >
            {ticket.diagnosis.condition}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-tertiary">
            {formatConfidence(ticket.diagnosis.confidence)}
          </span>
        </span>

        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-secondary">
          {ticket.diagnosis.suggestedTreatment}
        </span>

        {ticket.farmerNotes && (
          <span className="mt-1 block truncate border-l-2 border-status-muted/40 pl-2 text-[12px] text-tertiary">
            {ticket.farmerNotes}
          </span>
        )}

        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-tertiary">
          <span>{CROP_LABEL[ticket.cropType]}</span>
          <span aria-hidden="true">·</span>
          <span>{formatCoords(ticket.lat, ticket.lng)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatRelative(ticket.createdAt)}</span>
        </span>
      </span>

      {trailing && <span className="relative z-10 shrink-0">{trailing}</span>}
    </li>
  );
}

/** Round tick used by the to-do list to finish a task without opening it. */
export function DoneButton({
  onClick,
  busy,
  label,
}: {
  onClick: () => void;
  busy: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className="focus-ring grid size-10 place-items-center rounded-full border border-hairline-strong text-tertiary transition-colors hover:border-status-ok hover:bg-status-ok/10 hover:text-status-ok disabled:cursor-wait disabled:opacity-50"
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
        <path
          d="M5 10.5l3.5 3.5L15 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
