// LANE X — the screen the judges stare at for the whole demo.
// Client-only: react-leaflet touches window on import, so the map page loads
// this with dynamic(..., { ssr: false }).

"use client";

import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import { DEMO_FARM_CENTER, DEMO_WAYPOINTS } from "@/lib/droneSimulator";
import type { Ticket } from "@/lib/types";

/**
 * Spec Section 7 pin colours. A "new" ticket that the model flagged as diseased
 * is the urgent case, so it gets alert; a new healthy scan is just awaiting
 * review, so it gets veraison. Actioned tickets go canopy, rejected go soil.
 */
function pinColor(ticket: Ticket): string {
  // Semantic tokens, so pins stay legible when the theme flips. These land in
  // an inline style on an HTML span, where var() resolves normally.
  if (ticket.status === "rejected") return "var(--status-muted)";
  if (ticket.status !== "new") return "var(--status-ok)";
  return ticket.diagnosis.condition === "Healthy"
    ? "var(--status-new)"
    : "var(--status-alert)";
}

function pinIcon(color: string, selected: boolean, ping: boolean): L.DivIcon {
  const ring = ping
    ? `<span class="farm-pin-ring pin-ping" style="--pin:${color}"></span>`
    : "";
  return L.divIcon({
    className: "farm-pin",
    html: `${ring}<span class="farm-pin-dot"${selected ? ' data-selected="true"' : ""} style="--pin:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// Anchored well above the waypoint so the drone reads as hovering over the
// block rather than sitting on top of the pin it just created.
const droneIcon = L.divIcon({
  className: "drone-marker",
  html:
    `<img class="drone-craft" src="/drone.svg" alt="" draggable="false" />` +
    `<span class="drone-sweep"></span><span class="drone-tether"></span>`,
  iconSize: [44, 44],
  iconAnchor: [22, 62],
});

/**
 * Several tickets share the exact same waypoint, so raw coordinates would stack
 * pins on top of each other and the map would look emptier than it is. Fan the
 * duplicates out on a golden-angle spiral — deterministic, so pins don't jump
 * between renders.
 */
function spreadPositions(tickets: Ticket[]): Map<string, [number, number]> {
  const seen = new Map<string, number>();
  const out = new Map<string, [number, number]>();

  for (const ticket of tickets) {
    const key = `${ticket.lat},${ticket.lng}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);

    if (n === 0) {
      out.set(ticket.id, [ticket.lat, ticket.lng]);
      continue;
    }
    // Golden angle spreads evenly with no clumping. The radius stays well
    // under the 0.004deg waypoint spacing, so a pin never drifts into the
    // neighbouring block.
    const angle = n * 2.399;
    const radius = 0.00055 * Math.sqrt(n);
    out.set(ticket.id, [
      ticket.lat + Math.sin(angle) * radius * 0.75,
      ticket.lng + Math.cos(angle) * radius,
    ]);
  }
  return out;
}

export default function MapView({
  tickets,
  selectedId,
  pingTicketId,
  droneWaypointIndex,
  onSelect,
}: {
  tickets: Ticket[];
  selectedId: string | null;
  pingTicketId: string | null;
  droneWaypointIndex: number;
  onSelect: (ticket: Ticket) => void;
}) {
  const positions = spreadPositions(tickets);
  const drone = DEMO_WAYPOINTS[droneWaypointIndex] ?? DEMO_FARM_CENTER;

  return (
    <MapContainer
      center={[DEMO_FARM_CENTER.lat, DEMO_FARM_CENTER.lng]}
      zoom={15}
      scrollWheelZoom
      className="size-full"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      {/* The survey grid the drone flies — makes the scan read as a route, not scattered dots. */}
      <Polyline
        positions={DEMO_WAYPOINTS.map((w) => [w.lat, w.lng] as [number, number])}
        pathOptions={{
          // Literal hex, not a CSS var: Leaflet writes stroke as an SVG
          // presentation attribute, and those don't resolve var(). Picked as a
          // mid soil tone that holds up against both the light and dark tiles.
          color: "#a8794e",
          weight: 1.5,
          opacity: 0.6,
          dashArray: "6 8",
        }}
      />

      {tickets.map((ticket) => {
        const color = pinColor(ticket);
        return (
          <Marker
            key={ticket.id}
            position={positions.get(ticket.id) ?? [ticket.lat, ticket.lng]}
            icon={pinIcon(color, ticket.id === selectedId, ticket.id === pingTicketId)}
            zIndexOffset={ticket.id === pingTicketId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(ticket) }}
          />
        );
      })}

      <Marker
        position={[drone.lat, drone.lng]}
        icon={droneIcon}
        interactive={false}
        zIndexOffset={2000}
      />
    </MapContainer>
  );
}
