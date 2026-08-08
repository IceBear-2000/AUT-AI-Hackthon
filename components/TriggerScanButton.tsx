// LANE X — Spec Section 7: "styled like a physical instrument button, not a
// generic rounded CTA". Manual trigger only, never a timer during a live demo.

"use client";

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
      className="group flex items-center gap-3 border-2 border-canopy-900 bg-mist-50 px-5 py-3 font-mono text-xs tracking-widest text-canopy-900 shadow-[3px_3px_0_0_var(--color-canopy-900)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:cursor-wait disabled:opacity-70"
    >
      <span
        className={`size-2.5 rounded-full ${busy ? "animate-pulse bg-veraison-500" : "bg-alert-600"}`}
      />
      {busy ? "SCANNING…" : "TRIGGER SCAN"}
    </button>
  );
}
