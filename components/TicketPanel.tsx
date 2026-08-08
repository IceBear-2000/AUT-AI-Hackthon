"use client";

// The one detail view, shared by the map, AI Insights, To-do and Archive.
//
// A side panel, deliberately NOT a modal: no scrim, nothing covering the map,
// so the pin and its ticket stay spatially connected (Spec Section 7). On a
// phone it becomes a bottom sheet, which is where a thumb expects it.
//
// The actions are derived from the ticket's own status rather than passed in,
// so every caller gets the right verbs without having to know the workflow:
//   new                  -> Approve / Edit / Discard      (AI Insights)
//   approved | edited    -> Mark done / Discard           (To-do)
//   completed | rejected -> read-only + Reopen            (Archive)
//
// Integration contract: <TicketPanel ticket={t} onClose={...} onUpdated={...} />
// `ticket` may be null — leave it mounted and pass null to slide it out.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUCKET_META,
  CROP_LABEL,
  SEVERITY_ACCENT,
  STATUS_META,
  bucketFor,
  formatClock,
  formatConfidence,
  formatCoords,
  formatRelative,
  isHealthy,
  severityFor,
  stageFor,
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

type Mode = "idle" | "edit" | "discard";

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
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Ticket["status"] | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const ticketId = ticket?.id ?? null;
  // Derived synchronously, never from requestAnimationFrame: a backgrounded or
  // non-compositing tab never fires rAF, and the panel must not depend on that
  // to become visible.
  const open = ticket !== null;

  // Adjust state while rendering rather than in an effect — the pattern
  // react.dev recommends for "reset when a prop changes". Compared on
  // primitives, so a caller that rebuilds the ticket each render cannot loop us.
  const signature = ticket ? `${ticket.id}:${ticket.updatedAt}` : null;
  const [syncedSignature, setSyncedSignature] = useState(signature);

  if (signature !== syncedSignature) {
    setSyncedSignature(signature);
    if (ticket) {
      const switched = ticket.id !== shown?.id;
      setShown(ticket);
      if (switched) {
        setMode("idle");
        setNotes("");
        setError(null);
        setConfirmed(null);
        setPending(null);
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
  const accent = SEVERITY_ACCENT[severityFor(shown)];
  const bucket = BUCKET_META[bucketFor(shown)];
  const status = STATUS_META[shown.status];
  const treatment = treatmentFor(shown);
  const stage = stageFor(shown);
  const busy = pending !== null;

  return (
    <aside
      aria-label={`Ticket ${shown.id}`}
      aria-hidden={!open}
      className={[
        // Phone: a bottom sheet rising to 88% of the viewport. Tablet and up:
        // the side panel Section 7 asks for, so the pin stays visible beside it.
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

      <header className="flex items-center gap-3 border-b border-hairline px-5 py-3.5">
        <span className="font-mono text-xs tracking-[0.14em] text-secondary">
          {shown.id.toUpperCase()}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${status.pill}`}
        >
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ticket panel"
          className="focus-ring ml-auto grid size-8 place-items-center rounded-pill text-secondary transition-colors hover:bg-sunken hover:text-primary"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
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
        {/* Scan frame. The severity chip rides on the image so the verdict is
            legible before the farmer has read a single word. */}
        <figure className="relative border-b border-hairline">
          <div className="relative aspect-[4/3] w-full bg-sunken">
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
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-pill bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
              <span className={`size-1.5 rounded-full ${bucket.dot}`} />
              {bucket.label}
            </span>
          </div>
          <figcaption className="flex items-center justify-between gap-3 px-5 py-2 font-mono text-[11px] text-secondary">
            <span>{formatCoords(shown.lat, shown.lng)}</span>
            <span>
              {formatClock(shown.createdAt)} · {formatRelative(shown.createdAt)}
            </span>
          </figcaption>
        </figure>

        <div className="space-y-6 px-5 py-5">
          {/* The verdict, given the space it deserves. */}
          <section>
            <p className={FIELD_LABEL}>
              {CROP_LABEL[shown.cropType]} · AI diagnosis
            </p>
            <h2
              className={`mt-2 text-[26px] font-semibold leading-[1.15] tracking-[-0.01em] ${
                healthy ? "text-status-ok" : accent.text
              }`}
            >
              {shown.diagnosis.condition}
            </h2>

            <div className="mt-3.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-sunken">
                <div
                  className={`h-full rounded-pill ${healthy ? "bg-status-ok" : accent.bar}`}
                  style={{
                    width: `${Math.round(shown.diagnosis.confidence * 100)}%`,
                  }}
                />
              </div>
              <span className="font-mono text-sm tabular-nums text-primary">
                {formatConfidence(shown.diagnosis.confidence)}
              </span>
              <span className="text-[11px] text-tertiary">confidence</span>
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

          <section>
            <p className={FIELD_LABEL}>
              {healthy ? "Recommendation" : "Suggested treatment"}
            </p>
            <div className={`mt-1.5 border-l-2 bg-sunken px-4 py-3 ${accent.rule}`}>
              <p className="text-sm leading-relaxed text-primary">
                {shown.diagnosis.suggestedTreatment}
              </p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-tertiary">
              Triage guidance for a grower to verify — not a registered chemical
              prescription.
            </p>
          </section>

          {shown.farmerNotes && (
            <section>
              <p className={FIELD_LABEL}>Your notes</p>
              <p className="mt-1.5 border-l-2 border-status-muted/40 bg-sunken px-4 py-3 text-sm leading-relaxed text-primary">
                {shown.farmerNotes}
              </p>
            </section>
          )}
        </div>
      </div>

      <footer className="border-t border-hairline bg-raised px-5 py-4 pb-safe">
        {confirmed && <ConfirmationStrip status={confirmed} />}

        {error && (
          <p
            role="alert"
            className="mb-3 border-l-2 border-status-alert bg-status-alert/10 px-3 py-2 font-mono text-[11px] text-status-alert"
          >
            {error}
          </p>
        )}

        {mode !== "idle" ? (
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
                  ? { status: "edited", farmerNotes: notes.trim() }
                  : { status: "rejected", farmerNotes: notes.trim() },
              )
            }
          />
        ) : stage === "triage" ? (
          <div className="flex gap-2">
            <PrimaryButton
              busy={pending === "approve"}
              disabled={busy}
              onClick={() =>
                // "All good" needs no work, so acknowledging files it straight
                // to the archive instead of parking it on the to-do list.
                act("approve", { status: healthy ? "completed" : "approved" })
              }
            >
              {healthy ? "Acknowledge" : "Approve"}
            </PrimaryButton>
            <GhostButton
              disabled={busy}
              onClick={() => {
                setNotes(shown.farmerNotes ?? "");
                setMode("edit");
              }}
            >
              Edit
            </GhostButton>
            <DangerButton
              disabled={busy}
              onClick={() => {
                setNotes("");
                setMode("discard");
              }}
            >
              Discard
            </DangerButton>
          </div>
        ) : stage === "task" ? (
          <div className="flex gap-2">
            <PrimaryButton
              busy={pending === "done"}
              disabled={busy}
              onClick={() => act("done", { status: "completed" })}
            >
              Mark done
            </PrimaryButton>
            <DangerButton
              disabled={busy}
              onClick={() => {
                setNotes("");
                setMode("discard");
              }}
            >
              Discard
            </DangerButton>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[12px] leading-relaxed text-tertiary">
              {shown.status === "completed"
                ? "Completed and archived."
                : "Discarded and archived."}
            </p>
            <GhostButton
              disabled={busy}
              onClick={() =>
                // Completed work goes back to the to-do list; something you
                // discarded goes back to triage to be judged again.
                act("reopen", {
                  status: shown.status === "completed" ? "approved" : "new",
                })
              }
            >
              {pending === "reopen" ? "…" : "Reopen"}
            </GhostButton>
          </div>
        )}
      </footer>
    </aside>
  );
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

const BUTTON_BASE =
  "focus-ring rounded-pill px-4 py-2.5 text-[13px] font-semibold transition-[transform,opacity,background-color] duration-150 active:scale-[0.97] disabled:opacity-50";

function PrimaryButton({
  children,
  busy,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${BUTTON_BASE} flex-1 bg-accent text-on-accent hover:opacity-90`}
    >
      {busy ? "Saving…" : children}
    </button>
  );
}

function GhostButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${BUTTON_BASE} border border-hairline text-primary hover:bg-sunken`}
    >
      {children}
    </button>
  );
}

function DangerButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${BUTTON_BASE} border border-status-alert/35 text-status-alert hover:bg-status-alert/10`}
    >
      {children}
    </button>
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
        {editing ? "Your correction" : "Why are you discarding this?"}
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
        className="focus-ring mt-1.5 w-full resize-none rounded-card border border-hairline bg-canvas px-3 py-2.5 text-sm leading-relaxed text-primary placeholder:text-tertiary"
      />
      <p className="mt-1.5 text-[11px] text-tertiary">
        Logged for the next training run — the model does not learn in real time.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || notes.trim().length === 0}
          onClick={onSubmit}
          className={`${BUTTON_BASE} flex-1 text-on-accent ${
            editing ? "bg-accent hover:opacity-90" : "bg-status-alert hover:opacity-90"
          }`}
        >
          {busy ? "Saving…" : editing ? "Save correction" : "Confirm discard"}
        </button>
        <GhostButton disabled={busy} onClick={onCancel}>
          Cancel
        </GhostButton>
      </div>
    </div>
  );
}

/** Tells the farmer where the ticket just went — no guessing on stage. */
function ConfirmationStrip({ status }: { status: Ticket["status"] }) {
  const map: Record<Ticket["status"], { text: string; href?: string; cta?: string }> =
    {
      new: { text: "Back in AI Insights for review.", href: "/ai-insights", cta: "Insights" },
      approved: { text: "Approved — added to your to-do list.", href: "/todo", cta: "To-do" },
      edited: { text: "Correction saved — added to your to-do list.", href: "/todo", cta: "To-do" },
      completed: { text: "Done. Filed in the archive.", href: "/archive", cta: "Archive" },
      rejected: { text: "Discarded. Filed in the archive.", href: "/archive", cta: "Archive" },
    };
  const { text, href, cta } = map[status];
  const muted = status === "rejected";

  return (
    <div
      className={`mb-3 flex items-center gap-2 rounded-card border-l-2 px-3 py-2 text-[12px] ${
        muted
          ? "border-status-muted bg-sunken text-secondary"
          : "border-status-ok bg-status-ok/10 text-status-ok"
      }`}
    >
      <span className="flex-1">{text}</span>
      {href && (
        <a
          href={href}
          className="focus-ring rounded-pill font-mono text-[10px] uppercase tracking-[0.14em] underline underline-offset-2"
        >
          {cta}
        </a>
      )}
    </div>
  );
}
