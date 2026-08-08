"use client";

// LANE Y — Section 7 layout: a wordmark styled like a system readout, plus
// live pill counts. Self-contained on purpose so it cannot collide with Lane X;
// lift it into app/(dashboard)/layout.tsx later if the team wants it everywhere.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActionable } from "@/components/ticketMeta";
import type { Ticket } from "@/lib/types";

const NAV = [
  { href: "/map", label: "Map" },
  { href: "/todo", label: "To-do" },
  { href: "/insights", label: "Insights" },
];

export default function DashboardHeader({ tickets }: { tickets: Ticket[] }) {
  const pathname = usePathname();

  const counts = [
    {
      label: "New",
      value: tickets.filter((ticket) => ticket.status === "new").length,
      dot: "bg-veraison-500",
    },
    {
      label: "Approved",
      value: tickets.filter(isActionable).length,
      dot: "bg-canopy-600",
    },
    {
      label: "Completed",
      value: tickets.filter((ticket) => ticket.status === "completed").length,
      dot: "bg-canopy-900/30",
    },
  ];

  return (
    <header className="sticky top-0 z-[900] border-b border-canopy-900/10 bg-mist-50/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <Link
          href="/map"
          className="font-mono text-xs tracking-[0.2em] text-canopy-900 transition-colors hover:text-canopy-600"
        >
          FARMSENTRY <span className="text-soil-500">{"//"}</span> RENWICK-01
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-[3px] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? "bg-canopy-900/8 text-canopy-900"
                    : "text-canopy-900/50 hover:text-canopy-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {counts.map((count) => (
            <span
              key={count.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-canopy-900/12 px-2.5 py-1"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${count.dot}`} />
              <span className="font-mono text-xs text-canopy-900">
                {count.value}
              </span>
              <span className="text-[11px] text-canopy-900/55">
                {count.label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
