// Live model showcase. Deliberately outside the (dashboard) group: no tab bar,
// no header, nothing but the viewfinder — this is a "prove the model is real"
// takeover, not part of the farm workflow.

import Link from "next/link";
import CameraScanner from "@/components/CameraScanner";

export const metadata = {
  title: "CropIQ — test the model",
};

export default function ScanPage() {
  return (
    <div className="relative">
      <CameraScanner />

      <Link
        href="/map"
        aria-label="Close"
        className="focus-ring absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
      >
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </Link>
    </div>
  );
}
