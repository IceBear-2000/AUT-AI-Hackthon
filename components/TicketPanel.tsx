"use client";

// LANE Y — PROJECT_SPEC.md Section 9, tasks 1 and 2.
//
// A side panel, deliberately NOT a modal: no scrim, nothing covering the map,
// so the pin and its ticket stay spatially connected (Section 7).
//
// Lane X integration contract (Section 8 handoff):
//   <TicketPanel ticket={selected} onClose={...} onUpdated={...} />
// `ticket` may be null — the panel slides itself out and keeps rendering the
// last ticket until the animation finishes, so it is safe to leave mounted.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CROP_LABEL,
  SEVERITY_ACCENT,
  STATUS_META,
  formatClock,
  formatConfidence,
  formatCoords,
  formatRelative,
  isHealthy,
  severityFor,
  treatmentFor,
} from "@/components/ticketMeta";
import { patchTicket } from "@/components/useTickets";
import type { Ticket } from "@/lib/types";

export interface TicketPanelProps {
  ticket: Ticket | null;
  onClose: () => void;
  /** Fired with the updated ticket so the caller can recolour its pin. */
  onUpdated?: (ticket: Ticket) => void;
}

type Mode = "idle" | "edit" | "reject";
type Assignee = "farmer" | "drone";

const FIELD_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-canopy-900/45";

export default function TicketPanel({
  ticket,
  onClose,
  onUpdated,
}: TicketPanelProps) {
  // Retained so the panel still has content to render while it slides out.
  const [shown, setShown] = useState<Ticket | null>(ticket);
  const [mode, setMode] = useState<Mode>("idle");
  // null = "follow the ticket"; set only once the farmer picks a different owner.
  const [assigneeOverride, setAssigneeOverride] = useState<Assignee | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Ticket["status"] | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const ticketId = ticket?.id ?? null;
  // Derived synchronously, never from requestAnimationFrame: a backgrounded or
  // non-compositing tab never fires rAF, and the panel must not depend on that
  // to become visible. The slide comes from the CSS transition, which needs the
  // panel left mounted with a null ticket — see the contract note above.
  const open = ticket !== null;

  // Adjust state while rendering rather than in an effect — the pattern
  // react.dev recommends for "reset when a prop changes", and it avoids the
  // extra commit an effect would cost. Compared on primitives, never on object
  // identity, so a caller that rebuilds the ticket each render cannot loop us.
  const signature = ticket ? `${ticket.id}:${ticket.updatedAt}` : null;
  const [syncedSignature, setSyncedSignature] = useState(signature);

  if (signature !== syncedSignature) {
    setSyncedSignature(signature);
    if (ticket) {
      const switched = ticket.id !== shown?.id;
      setShown(ticket);
      if (switched) {
        // A different ticket is a clean slate.
        setMode("idle");
        setNotes("");
        setError(null);
        setConfirmed(null);
        setPending(null);
        setAssigneeOverride(null);
      }
    }
  }

  useEffect(() => {
    if (!ticketId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ticketId, onClose]);

  useEffect(() => {
    if (mode !== "idle") notesRef.current?.focus();
  }, [mode]);

  const act = useCallback(
    async (
      action: string,
      patch: Parameters<typeof patchTicket>[1],
    ): Promise<void> => {
      if (!shown) return;
      setPending(action);
      setError(null);
      try {
        const updated = await patchTicket(shown.id, patch);
        setShown(updated);
        setConfirmed(updated.status);
        setMode("idle");
        setNotes("");
        onUpdated?.(updated);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "update failed");
      } finally {
        setPending(null);
      }
    },
    [shown, onUpdated],
  );

  if (!shown) return null;

  const healthy = isHealthy(shown);
  const severity = severityFor(shown);
  const accent = SEVERITY_ACCENT[severity];
  const status = STATUS_META[shown.status];
  const treatment = treatmentFor(shown);
  const busy = pending !== null;
  // Reflects whoever already owns the ticket, so re-approving never silently
  // reassigns a drone task back to the farmer.
  const assignee: Assignee =
    assigneeOverride ?? (shown.assignedTo === "drone" ? "drone" : "farmer");
  const accepted = shown.status === "approved" || shown.status === "edited";

  return (
    <aside
      aria-label={`Ticket ${shown.id}`}
      aria-hidden={!open}
      className={[
        "fixed inset-y-0 right-0 z-[1200] flex w-full max-w-[27rem] flex-col",
        "border-l border-canopy-900/12 bg-mist-50 shadow-[-18px_0_44px_-28px_rgba(28,46,34,0.55)]",
        "transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        open ? "translate-x-0" : "pointer-events-none translate-x-full",
      ].join(" ")}
    >
      {/* Header — ticket ID in Plex Mono, Section 7 */}
      <header className="flex items-center gap-3 border-b border-canopy-900/10 px-5 py-3.5">
        <span className="font-mono text-xs tracking-[0.14em] text-canopy-900/70">
          {shown.id.toUpperCase()}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${status.pill}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ticket panel"
          className="ml-auto grid h-8 w-8 place-items-center rounded-[3px] text-canopy-900/50 transition-colors hover:bg-canopy-900/6 hover:text-canopy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy-600"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Scan frame + telemetry caption */}
        <figure className="border-b border-canopy-900/10">
          <div className="relative aspect-[4/3] w-full bg-mist-100">
            {/* unoptimized: the demo images are SVG placeholders today and real
                PlantVillage rasters after Lane Z's swap — this works for both. */}
            <Image
              src={shown.imageUrl}
              alt={`${CROP_LABEL[shown.cropType]} scan for ticket ${shown.id}`}
              fill
              unoptimized
              // Eager, not lazy: this is the first thing the farmer looks at
              // when the panel opens — it must not arrive a beat late on stage.
              loading="eager"
              sizes="(max-width: 27rem) 100vw, 27rem"
              className="object-cover"
            />
          </div>
          <figcaption className="flex items-center justify-between gap-3 px-5 py-2 font-mono text-[11px] text-canopy-900/55">
            <span>{formatCoords(shown.lat, shown.lng)}</span>
            <span>
              {formatClock(shown.createdAt)} · {formatRelative(shown.createdAt)}
            </span>
          </figcaption>
        </figure>

        <div className="space-y-6 px-5 py-5">
          {/* Diagnosis */}
          <section>
            <p className={FIELD_LABEL}>
              {CROP_LABEL[shown.cropType]} · AI diagnosis
            </p>
            <h2
              className={`mt-1.5 text-[1.4rem] leading-tight font-semibold ${
                healthy ? "text-canopy-600" : accent.text
              }`}
            >
              {shown.diagnosis.condition}
            </h2>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className={FIELD_LABEL}>Confidence</span>
                <span className="font-mono text-sm text-canopy-900">
                  {formatConfidence(shown.diagnosis.confidence)}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-canopy-900/10">
                <div
                  className={`h-full rounded-full ${healthy ? "bg-canopy-600" : accent.bar}`}
                  style={{
                    width: `${Math.round(shown.diagnosis.confidence * 100)}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {treatment && (
            <section>
              <p className={FIELD_LABEL}>Typical symptoms</p>
              <p className="mt-1.5 text-sm leading-relaxed text-canopy-900/75">
                {treatment.symptoms}
              </p>
            </section>
          )}

          {/* Suggested treatment */}
          <section>
            <p className={FIELD_LABEL}>Suggested treatment</p>
            <div
              className={`mt-1.5 border-l-2 bg-canopy-900/[0.03] px-4 py-3 ${accent.rule}`}
            >
              <p className="text-sm leading-relaxed text-canopy-900">
                {shown.diagnosis.suggestedTreatment}
              </p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-canopy-900/50">
              Triage guidance for a grower to verify — not a registered chemical
              prescription.
            </p>
          </section>

          {shown.farmerNotes && (
            <section>
              <p className={FIELD_LABEL}>Farmer notes</p>
              <p className="mt-1.5 border-l-2 border-soil-500/40 bg-soil-500/[0.05] px-4 py-3 text-sm leading-relaxed text-canopy-900">
                {shown.farmerNotes}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* Action bar */}
      <footer className="border-t border-canopy-900/10 bg-mist-50 px-5 py-4">
        {confirmed && <ConfirmationStrip status={confirmed} healthy={healthy} />}

        {error && (
          <p
            role="alert"
            className="mb-3 border-l-2 border-alert-600 bg-alert-600/[0.06] px-3 py-2 font-mono text-[11px] text-alert-600"
          >
            {error}
          </p>
        )}

        {mode === "idle" ? (
          <>
            {!healthy && (
              <AssigneeToggle value={assignee} onChange={setAssigneeOverride} />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act("approve", {
                    status: "approved",
                    assignedTo: healthy ? null : assignee,
                  })
                }
                className="flex-1 rounded-[3px] bg-canopy-600 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-mist-50 transition-colors hover:bg-canopy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy-900 disabled:opacity-55"
              >
                {pending === "approve"
                  ? "Saving…"
                  : healthy
                    ? "Confirm — no action"
                    : accepted
                      ? "Update"
                      : "Approve"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setNotes(shown.farmerNotes ?? "");
                  setMode("edit");
                }}
                className="rounded-[3px] border border-canopy-900/20 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-canopy-900 transition-colors hover:border-canopy-900/40 hover:bg-canopy-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy-600 disabled:opacity-55"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setNotes("");
                  setMode("reject");
                }}
                className="rounded-[3px] border border-alert-600/35 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-alert-600 transition-colors hover:border-alert-600/60 hover:bg-alert-600/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alert-600 disabled:opacity-55"
              >
                Reject
              </button>
            </div>
          </>
        ) : (
          <NotesForm
            mode={mode}
            notes={notes}
            onNotesChange={setNotes}
            busy={busy}
            textareaRef={notesRef}
            onCancel={() => {
              setMode("idle");
              setError(null);
            }}
            onSubmit={() =>
              act(
                mode,
                mode === "edit"
                  ? {
                      status: "edited",
                      farmerNotes: notes.trim(),
                      assignedTo: healthy ? null : assignee,
                    }
                  : {
                      status: "rejected",
                      farmerNotes: notes.trim(),
                      assignedTo: null,
                    },
              )
            }
          />
        )}
      </footer>
    </aside>
  );
}

/** Section 9 task 3 — the drone route exists, and is honest about being roadmap. */
function AssigneeToggle({
  value,
  onChange,
}: {
  value: Assignee;
  onChange: (next: Assignee) => void;
}) {
  const option =
    "flex-1 rounded-[2px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors";
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <span className={FIELD_LABEL}>Assign to</span>
      </div>
      <div className="mt-1.5 flex gap-1 rounded-[3px] border border-canopy-900/15 bg-canopy-900/[0.03] p-1">
        <button
          type="button"
          onClick={() => onChange("farmer")}
          aria-pressed={value === "farmer"}
          className={`${option} ${
            value === "farmer"
              ? "bg-canopy-600 text-mist-50"
              : "text-canopy-900/60 hover:text-canopy-900"
          }`}
        >
          Me
        </button>
        <button
          type="button"
          onClick={() => onChange("drone")}
          aria-pressed={value === "drone"}
          className={`${option} flex items-center justify-center gap-1.5 ${
            value === "drone"
              ? "bg-soil-500 text-mist-50"
              : "text-canopy-900/60 hover:text-canopy-900"
          }`}
        >
          Drone
          <span
            className={`rounded-[2px] px-1 py-px text-[9px] tracking-[0.1em] ${
              value === "drone"
                ? "bg-mist-50/25 text-mist-50"
                : "bg-soil-500/15 text-soil-500"
            }`}
          >
            Roadmap
          </span>
        </button>
      </div>
      {value === "drone" && (
        <p className="mt-2 text-[11px] leading-relaxed text-canopy-900/55">
          Queued only. CAA Part 102 requires a supervising observer for any
          agrichemical flight — we automate the scheduling and detection, not the
          legal oversight.
        </p>
      )}
    </div>
  );
}

function NotesForm({
  mode,
  notes,
  onNotesChange,
  busy,
  textareaRef,
  onCancel,
  onSubmit,
}: {
  mode: Exclude<Mode, "idle">;
  notes: string;
  onNotesChange: (next: string) => void;
  busy: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const editing = mode === "edit";
  return (
    <div>
      <label className={FIELD_LABEL} htmlFor="farmer-notes">
        {editing ? "Your correction" : "Why are you rejecting this?"}
      </label>
      <textarea
        id="farmer-notes"
        ref={textareaRef}
        rows={3}
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder={
          editing
            ? "It's leafroll virus, not black rot — treat block 4 first."
            : "Already sprayed last week."
        }
        className="mt-1.5 w-full resize-none rounded-[3px] border border-canopy-900/20 bg-mist-50 px-3 py-2 text-sm leading-relaxed text-canopy-900 placeholder:text-canopy-900/35 focus:border-canopy-600 focus:outline-none"
      />
      <p className="mt-1.5 text-[11px] text-canopy-900/45">
        Logged for the next training run — the model does not learn in real time.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || notes.trim().length === 0}
          onClick={onSubmit}
          className={`flex-1 rounded-[3px] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-mist-50 transition-colors disabled:opacity-45 ${
            editing
              ? "bg-soil-500 hover:bg-soil-500/85"
              : "bg-alert-600 hover:bg-alert-600/85"
          }`}
        >
          {busy ? "Saving…" : editing ? "Save correction" : "Confirm reject"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-[3px] border border-canopy-900/20 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-canopy-900/70 transition-colors hover:bg-canopy-900/5 disabled:opacity-55"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Tells the farmer where the ticket just went — no guessing on stage. */
function ConfirmationStrip({
  status,
  healthy,
}: {
  status: Ticket["status"];
  healthy: boolean;
}) {
  const message =
    status === "rejected"
      ? "Dismissed. Logged for the next training run."
      : healthy
        ? "Confirmed — no action needed. Counted in insights."
        : status === "edited"
          ? "Correction saved — on your to-do list."
          : status === "completed"
            ? "Marked complete."
            : "Approved — on your to-do list.";

  const dismissed = status === "rejected";

  return (
    <div
      className={`mb-3 flex items-center gap-2 border-l-2 px-3 py-2 text-[12px] ${
        dismissed
          ? "border-canopy-900/25 bg-canopy-900/[0.04] text-canopy-900/65"
          : "border-canopy-600 bg-canopy-600/[0.07] text-canopy-700"
      }`}
    >
      <span className="flex-1">{message}</span>
      {!dismissed && !healthy && (
        <a
          href="/todo"
          className="font-mono text-[10px] uppercase tracking-[0.14em] underline underline-offset-2 hover:text-canopy-900"
        >
          To-do
        </a>
      )}
    </div>
  );
}
