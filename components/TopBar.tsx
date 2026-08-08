// LANE X — shared chrome. Lanes Y and Z: reuse this on /todo and /insights.
// Spec Section 7: wordmark styled like a system readout + live pill counts.

import Link from "next/link";
import type { Ticket } from "@/lib/types";

const PILLS: { label: string; match: (t: Ticket) => boolean; color: string }[] = [
  { label: "NEW", match: (t) => t.status === "new", color: "var(--color-veraison-500)" },
  {
    label: "APPROVED",
    match: (t) => t.status === "approved" || t.status === "edited",
    color: "var(--color-canopy-600)",
  },
  { label: "COMPLETE", match: (t) => t.status === "completed", color: "var(--color-soil-500)" },
];

const NAV = [
  { href: "/map", label: "MAP" },
  { href: "/todo", label: "TO-DO" },
  { href: "/insights", label: "INSIGHTS" },
];

export default function TopBar({ tickets }: { tickets: Ticket[] }) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-canopy-900/12 bg-mist-50 px-5 py-3">
      <span className="font-mono text-xs tracking-widest text-canopy-900">
        FARMSENTRY <span className="text-soil-500">{"//"}</span> RENWICK-01
      </span>

      <nav className="flex gap-4">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="font-mono text-[11px] tracking-widest text-canopy-700/70 transition-colors hover:text-canopy-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {PILLS.map((pill) => (
          <span
            key={pill.label}
            className="flex items-center gap-2 rounded-full border border-canopy-900/12 px-3 py-1 font-mono text-[11px] tracking-widest text-canopy-900"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: pill.color }}
            />
            {pill.label}
            <span className="tabular-nums text-canopy-700/70">
              {tickets.filter(pill.match).length}
            </span>
          </span>
        ))}
      </div>
    </header>
  );
}
