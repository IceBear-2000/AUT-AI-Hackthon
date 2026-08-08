// Shared chrome + shared ticket store for every dashboard screen.
// Each page used to bring its own header and its own fetch; now they inherit
// both, so the three screens can't drift apart again.

import AppShell from "@/components/AppShell";
import { TicketsProvider } from "@/components/TicketsProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TicketsProvider>
      <AppShell>{children}</AppShell>
    </TicketsProvider>
  );
}
