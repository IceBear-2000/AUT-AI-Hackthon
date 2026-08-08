"use client";

// The single piece of chrome for every dashboard screen.
//
// Replaces three competing headers (Lane X's TopBar, Lane Y's DashboardHeader
// and Lane Z's inline one), which differed in width, sticky behaviour, nav
// casing and pill colour.
//
// Phone-first: navigation lives in a thumb-reachable bottom tab bar, because
// farmers use this standing in a block holding a phone one-handed. The desktop
// breakpoint promotes the same routes into the top bar and hides the tabs.

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { useTicketStore } from "@/components/TicketsProvider";
import { isActionable } from "@/components/ticketMeta";
import type { Ticket } from "@/lib/types";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: (tickets: Ticket[]) => number;
};

const TABS: Tab[] = [
  {
    href: "/map",
    label: "Map",
    badge: (tickets) => tickets.filter((t) => t.status === "new").length,
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path
          d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="2.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/todo",
    label: "To-do",
    badge: (tickets) => tickets.filter(isActionable).length,
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path
          d="M4 7.5 6 9.5 10 5.5M4 17l2 2 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 8h7M13 17h7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "Insights",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path
          d="M5 19V11M12 19V5M19 19v-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

/** Live counts, shown on desktop where there's room for them. */
function StatusPills({ tickets }: { tickets: Ticket[] }) {
  const pills = [
    {
      label: "New",
      value: tickets.filter((t) => t.status === "new").length,
      color: "var(--status-new)",
    },
    {
      label: "Approved",
      value: tickets.filter(isActionable).length,
      color: "var(--status-ok)",
    },
    {
      label: "Done",
      value: tickets.filter((t) => t.status === "completed").length,
      color: "var(--status-muted)",
    },
  ];

  return (
    <div className="hidden items-center gap-1.5 lg:flex">
      {pills.map((pill) => (
        <span
          key={pill.label}
          className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-sunken px-2.5 py-1"
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: pill.color }}
          />
          <span className="font-mono text-xs tabular-nums text-primary">
            {pill.value}
          </span>
          <span className="text-[11px] text-secondary">{pill.label}</span>
        </span>
      ))}
    </div>
  );
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-2 -top-1 min-w-4 rounded-pill bg-status-new px-1 text-center font-mono text-[10px] leading-4 text-on-accent tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tickets } = useTicketStore();

  return (
    <div className="flex h-dvh flex-col">
      <header className="glass sticky top-0 z-[1100] shrink-0 rounded-none border-x-0 border-t-0 px-4 py-2.5 sm:px-5">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4">
          <Link
            href="/map"
            aria-label="CropIQ — Renwick-01"
            className="focus-ring flex shrink-0 items-center gap-2 rounded-lg"
          >
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-[9px] bg-accent text-on-accent"
            >
              {/* Outlined leaf with a midrib — stays legible at 16px, where a
                  filled glyph collapses into a blob. */}
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                <path
                  d="M4.6 15.4c0-6 4.8-10.8 10.8-10.8 0 6-4.8 10.8-10.8 10.8Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.6 14.4 13 7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            {/* Brand keeps its real casing; the site code stays instrument-style. */}
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-primary">
              CropIQ
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-tertiary">
              {"// RENWICK-01"}
            </span>
          </Link>

          {/* Desktop nav. On phones this is the bottom tab bar instead. */}
          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`focus-ring rounded-pill px-3 py-1.5 text-[13px] transition-colors ${
                    active
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <StatusPills tickets={tickets} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative min-h-0 flex-1">{children}</main>

      {/* Thumb-reachable primary navigation. Hidden once there's room up top. */}
      <nav
        aria-label="Primary"
        className="glass pb-safe sticky bottom-0 z-[1100] shrink-0 rounded-none border-x-0 border-b-0 md:hidden"
      >
        <div className="flex items-stretch">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            const count = tab.badge?.(tickets) ?? 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                  active ? "text-accent" : "text-tertiary"
                }`}
              >
                <span className="relative">
                  {tab.icon}
                  <Badge count={count} />
                </span>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
