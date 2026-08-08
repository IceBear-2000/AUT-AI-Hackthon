"use client";

// Three-way segmented control: light / auto / dark.
// "auto" clears the attribute so globals.css falls back to prefers-color-scheme.

import { useSyncExternalStore } from "react";

type Theme = "light" | "system" | "dark";
const STORAGE_KEY = "cropiq-theme";

function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

// The stored theme is external state, so it's read through useSyncExternalStore
// rather than mirrored into an effect. That keeps the server and first client
// render agreeing, and updates other tabs via the storage event for free.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

// Server has no localStorage; "system" is what the CSS already falls back to.
function getServerSnapshot(): Theme {
  return "system";
}

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
        <circle cx="10" cy="10" r="3.6" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M10 2v1.8M10 16.2V18M18 10h-1.8M3.8 10H2M15.7 4.3l-1.3 1.3M5.6 14.4l-1.3 1.3M15.7 15.7l-1.3-1.3M5.6 5.6L4.3 4.3" />
        </g>
      </svg>
    ),
  },
  {
    value: "system",
    label: "Auto",
    icon: (
      <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
        <rect
          x="2.5"
          y="4"
          width="15"
          height="10"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M7 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
        <path
          d="M16 11.7A6.6 6.6 0 0 1 8.3 4a6.6 6.6 0 1 0 7.7 7.7Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function choose(next: Theme) {
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode — the choice still applies for this session.
    }
    // `storage` only fires in *other* tabs, so nudge this one directly.
    listeners.forEach((notify) => notify());
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-pill border border-hairline bg-sunken p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => choose(option.value)}
            className={`focus-ring grid size-7 place-items-center rounded-pill transition-colors ${
              active
                ? "bg-raised text-primary shadow-[var(--shadow-sm)]"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
