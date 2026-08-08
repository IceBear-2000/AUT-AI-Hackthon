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
  "font-mono text-[10px] uppercase tracking-[0.18em] text-tertiary";

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
        // Phone: a bottom sheet rising to 88% of the viewport, which is where a
        // thumb expects it. Tablet and up: the side panel Section 7 asks for,
        // so the pin stays visible beside its ticket.
        "fixed z-[1200] flex flex-col bg-raised",
        "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-sheet border-t border-hairline",
        "shadow-[0_-16px_48px_-16px_rgba(0,0,0,0.35)]",
        "sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-[27rem]",
        "sm:rounded-none sm:border-l sm:border-t-0",
        "sm:shadow-[-18px_0_44px_-28px_rgba(0,0,0,0.45)]",
        "transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        open
          ? "translate-y-0 sm:translate-x-0"
          : "pointer-events-none translate-y-full sm:translate-x-full sm:translate-y-0",
      ].join(" ")}
    >
      {/* Grab handle — signals "this is a sheet you can dismiss". Phone only. */}
      <div className="flex justify-center pt-2.5 sm:hidden">
        <span className="h-1 w-9 rounded-full bg-hairline-strong" />
      </div>

      {/* Header — ticket ID in Plex Mono, Section 7 */}
      <header className="flex items-center gap-3 border-b border-hairline px-5 py-3.5">
        <span className="font-mono text-xs tracking-[0.14em] text-secondary">
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
          className="ml-auto grid h-8 w-8 place-items-center rounded-[3px] text-secondary transition-colors hover:bg-sunken hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
        <figure className="border-b border-hairline">
          <div className="relative aspect-[4/3] w-full bg-sunken">
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
          <figcaption className="flex items-center justify-between gap-3 px-5 py-2 font-mono text-[11px] text-secondary">
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
                healthy ? "text-accent" : accent.text
              }`}
            >
              {shown.diagnosis.condition}
            </h2>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className={FIELD_LABEL}>Confidence</span>
                <span className="font-mono text-sm text-primary">
                  {formatConfidence(shown.diagnosis.confidence)}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-sunken">
                <div
                  className={`h-full rounded-full ${healthy ? "bg-accent" : accent.bar}`}
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
              <p className="mt-1.5 text-sm leading-relaxed text-secondary">
                {treatment.symptoms}
              </p>
            </section>
          )}

          {/* Suggested treatment */}
          <section>
            <p className={FIELD_LABEL}>Suggested treatment</p>
            <div
              className={`mt-1.5 border-l-2 bg-sunken[0.03] px-4 py-3 ${accent.rule}`}
            >
              <p className="text-sm leading-relaxed text-primary">
                {shown.diagnosis.suggestedTreatment}
              </p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-secondary">
              Triage guidance for a grower to verify — not a registered chemical
              prescription.
            </p>
          </section>

          {shown.farmerNotes && (
            <section>
              <p className={FIELD_LABEL}>Farmer notes</p>
              <p className="mt-1.5 border-l-2 border-status-muted/40 bg-status-muted/[0.05] px-4 py-3 text-sm leading-relaxed text-primary">
                {shown.farmerNotes}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* Action bar */}
      <footer className="border-t border-hairline bg-raised px-5 py-4">
        {confirmed && <ConfirmationStrip status={confirmed} healthy={healthy} />}

        {error && (
          <p
            role="alert"
            className="mb-3 border-l-2 border-status-alert bg-status-alert/10 px-3 py-2 font-mono text-[11px] text-status-alert"
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
                className="flex-1 rounded-[3px] bg-accent px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-on-accent transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-55"
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
                className="rounded-[3px] border border-hairline px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-primary transition-colors hover:border-hairline hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-55"
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
                className="rounded-[3px] border border-status-alert/35 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-status-alert transition-colors hover:border-status-alert/60 hover:bg-status-alert/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-alert disabled:opacity-55"
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
      <div className="mt-1.5 flex gap-1 rounded-[3px] border border-hairline bg-sunken[0.03] p-1">
        <button
          type="button"
          onClick={() => onChange("farmer")}
          aria-pressed={value === "farmer"}
          className={`${option} ${
            value === "farmer"
              ? "bg-accent text-on-accent"
              : "text-secondary hover:text-primary"
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
              ? "bg-status-muted text-on-accent"
              : "text-secondary hover:text-primary"
          }`}
        >
          Drone
          <span
            className={`rounded-[2px] px-1 py-px text-[9px] tracking-[0.1em] ${
              value === "drone"
                ? "bg-white/25 text-on-accent"
                : "bg-status-muted/15 text-status-muted"
            }`}
          >
            Roadmap
          </span>
        </button>
      </div>
      {value === "drone" && (
        <p className="mt-2 text-[11px] leading-relaxed text-secondary">
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
        className="mt-1.5 w-full resize-none rounded-[3px] border border-hairline bg-raised px-3 py-2 text-sm leading-relaxed text-primary placeholder:text-tertiary focus:border-accent focus:outline-none"
      />
      <p className="mt-1.5 text-[11px] text-tertiary">
        Logged for the next training run — the model does not learn in real time.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || notes.trim().length === 0}
          onClick={onSubmit}
          className={`flex-1 rounded-[3px] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-on-accent transition-colors disabled:opacity-45 ${
            editing
              ? "bg-status-muted hover:bg-status-muted/85"
              : "bg-status-alert hover:bg-status-alert/85"
          }`}
        >
          {busy ? "Saving…" : editing ? "Save correction" : "Confirm reject"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-[3px] border border-hairline px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-secondary transition-colors hover:bg-sunken disabled:opacity-55"
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
          ? "border-hairline bg-sunken[0.04] text-secondary"
          : "border-accent bg-accent/[0.07] text-secondary"
      }`}
    >
      <span className="flex-1">{message}</span>
      {!dismissed && !healthy && (
        <a
          href="/todo"
          className="font-mono text-[10px] uppercase tracking-[0.14em] underline underline-offset-2 hover:text-primary"
        >
          To-do
        </a>
      )}
    </div>
  );
}
