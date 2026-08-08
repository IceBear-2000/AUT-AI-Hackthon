import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "FarmSentry — crop disease triage",
  description:
    "AI-powered crop disease triage for NZ growers. Drone scans flag problems on a map, AI suggests a diagnosis, the farmer approves.",
};

// Farmers open this outdoors on a phone: fit the viewport to the device and let
// content sit under the notch so the map can run edge to edge.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1310" },
  ],
};

// Runs before first paint, so a dark-mode user never sees a white flash.
// Only pins the attribute for an explicit choice — "system" falls through to
// the prefers-color-scheme rules in globals.css.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('farmsentry-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full bg-canvas font-sans text-primary">
        {children}
      </body>
    </html>
  );
}
