"use client";

// The one action on the map. Manual only — never a timer during a live demo.
//
// Section 7 asked for "a physical instrument button"; that read as brutalist
// next to the rest of the refreshed UI, so it's now a solid accent FAB with a
// tactile press. Still unmistakably the primary control, and on a phone it's a
// full-width target sitting just above the tab bar.

export default function TriggerScanButton({
  onClick,
  busy,
}: {
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className="focus-ring flex w-full items-center justify-center gap-2.5 rounded-pill bg-accent px-6 py-3.5 text-[15px] font-semibold text-on-accent shadow-[var(--shadow-lg)] transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:cursor-wait disabled:opacity-80 sm:w-auto sm:py-3"
    >
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
      {busy ? "Scanning…" : "Trigger scan"}
    </button>
  );
}
