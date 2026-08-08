"use client";

// The one action on the map. Manual only — never a timer during a live demo.
//
// While a sweep runs the button becomes the progress indicator: the fill tracks
// the drone across the survey path, so the wait reads as work being done rather
// than as the app hanging. On a phone it's a full-width target above the tabs.

export default function TriggerAnalysisButton({
  onClick,
  busy,
  done,
  total,
}: {
  onClick: () => void;
  busy: boolean;
  done: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      aria-label={busy ? `Analysing, ${done} of ${total} points` : "Trigger analysis"}
      className="focus-ring relative w-full overflow-hidden rounded-pill bg-accent text-[15px] font-semibold text-on-accent shadow-[var(--shadow-lg)] transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:cursor-progress sm:w-auto"
    >
      {/* Progress fill. Sits under the label, inside the pill. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-white/22 transition-[width] duration-300 ease-out"
        style={{ width: busy ? `${pct}%` : "0%" }}
      />

      <span className="relative flex items-center justify-center gap-2.5 px-6 py-3.5 sm:py-3">
        <span className="relative grid size-4 place-items-center">
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
            <circle
              cx="10"
              cy="10"
              r="7.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              opacity="0.55"
            />
            <circle
              cx="10"
              cy="10"
              r="3.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle cx="10" cy="10" r="1.4" fill="currentColor" />
          </svg>
          {busy && (
            <span className="absolute inset-0 animate-ping rounded-full border border-white/70" />
          )}
        </span>
        {busy ? (
          <>
            Analysing
            <span className="font-mono text-[13px] tabular-nums opacity-90">
              {done}/{total}
            </span>
          </>
        ) : (
          "Trigger analysis"
        )}
      </span>
    </button>
  );
}
