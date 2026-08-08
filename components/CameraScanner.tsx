"use client";

// Point a camera at a real leaf, get the live model's answer.
//
// This is the "prove it" screen: it calls the model directly and shows whatever
// comes back, including "Unknown". It never substitutes a recorded result for a
// live one — if the call fails, it says so.

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisionResult } from "@/app/api/vision/route";

type Phase = "starting" | "live" | "analysing" | "result" | "blocked";

// Long edge sent to the model. Enough detail for leaf lesions, small enough to
// upload fast on venue wifi.
const MAX_EDGE = 1024;

export default function CameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Async so the secure-origin rejection lands in the same catch as a denied
    // permission — and so no state is set synchronously in the effect body.
    const start = async () => {
      // getUserMedia only exists on a secure origin. localhost counts; a phone
      // hitting the laptop's LAN IP over plain http does not, and the API is
      // simply absent there rather than throwing something readable.
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("insecure origin", "InsecureContextError");
      }
      return navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    };

    start()
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPhase("live");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const name = cause instanceof Error ? cause.name : "";
        setPhase("blocked");
        setError(
          name === "InsecureContextError"
            ? "Camera needs a secure origin. Use localhost on this machine, or open the deployed https URL on a phone — a LAN IP over plain http will not work."
            : name === "NotAllowedError"
              ? "Camera permission denied. Allow it via the browser's address-bar icon and reload."
              : name === "NotFoundError"
                ? "No camera found on this device."
                : "Could not start the camera.",
        );
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setShot(dataUrl);
    setResult(null);
    setError(null);
    setPhase("analysing");

    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const body = (await response.json()) as {
        result?: VisionResult;
        error?: string;
      };
      if (!response.ok || !body.result) {
        throw new Error(body.error ?? `Request failed (${response.status})`);
      }
      setResult(body.result);
      setPhase("result");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Model call failed.");
      setPhase("result");
    }
  }, []);

  const again = useCallback(() => {
    setShot(null);
    setResult(null);
    setError(null);
    setPhase("live");
  }, []);

  return (
    <div className="relative flex h-dvh flex-col bg-black">
      {/* Viewfinder, or the frozen frame once captured */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`size-full object-cover ${shot ? "invisible" : ""}`}
        />
        {shot && (
          // eslint-disable-next-line @next/next/no-img-element -- a canvas data URL, not an asset
          <img
            src={shot}
            alt="Captured leaf"
            className="absolute inset-0 size-full object-cover"
          />
        )}

        {phase === "starting" && (
          <p className="absolute inset-0 grid place-items-center font-mono text-xs tracking-[0.14em] text-white/70">
            STARTING CAMERA…
          </p>
        )}

        {phase === "blocked" && (
          <div className="absolute inset-0 grid place-items-center p-8">
            <p className="max-w-sm text-center text-[15px] leading-relaxed text-white/80">
              {error}
            </p>
          </div>
        )}

        {/* Framing guide — gives the presenter something to centre the leaf in */}
        {phase === "live" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <div className="size-[62vmin] max-w-[420px] rounded-[28px] border-2 border-white/35" />
          </div>
        )}

        {phase === "analysing" && (
          <div className="absolute inset-0 grid place-items-center bg-black/45">
            <p className="font-mono text-xs tracking-[0.14em] text-white">
              ASKING THE MODEL…
            </p>
          </div>
        )}
      </div>

      {/* Result / controls */}
      <div className="shrink-0 bg-raised px-5 pb-safe pt-4">
        {phase === "result" ? (
          <ResultPanel result={result} error={error} onAgain={again} />
        ) : (
          <>
            <p className="mb-3 text-center text-[13px] text-secondary">
              Hold a grape or apple leaf in the frame, then capture. The model is
              told nothing — it identifies the crop and the condition itself.
            </p>
            <button
              type="button"
              onClick={capture}
              disabled={phase !== "live"}
              className="focus-ring w-full rounded-pill bg-accent px-6 py-3.5 text-[15px] font-semibold text-on-accent transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
            >
              Capture &amp; analyse
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  error,
  onAgain,
}: {
  result: VisionResult | null;
  error: string | null;
  onAgain: () => void;
}) {
  const healthy = result?.condition === "Healthy";
  const unknown = !result || result.condition === "Unknown";

  return (
    <div>
      {error ? (
        <div className="mb-3 rounded-card border border-status-alert/35 bg-status-alert/10 px-4 py-3">
          <p className="text-[13px] font-semibold text-status-alert">
            No result
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-secondary">
            {error}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-tertiary">
            This screen shows live model output only — it will not fill in a
            stand-in answer.
          </p>
        </div>
      ) : (
        result && (
          <div className="mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tertiary">
              {unknown
                ? "Not a supported leaf"
                : `${result.crop === "grape" ? "Grape" : "Apple"} · live model`}
            </p>
            <h2
              className={`mt-1 text-[24px] font-semibold leading-tight ${
                unknown
                  ? "text-secondary"
                  : healthy
                    ? "text-status-ok"
                    : "text-status-alert"
              }`}
            >
              {unknown ? "Unknown" : result.condition}
            </h2>

            {!unknown && (
              <div className="mt-2.5 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-sunken">
                  <div
                    className={`h-full rounded-pill ${healthy ? "bg-status-ok" : "bg-status-alert"}`}
                    style={{ width: `${Math.round(result.confidence * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-sm tabular-nums text-primary">
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
            )}

            <p className="mt-2.5 text-[13px] leading-relaxed text-secondary">
              {result.rationale}
            </p>

            {result.treatment && (
              <p className="mt-2.5 border-l-2 border-hairline-strong bg-sunken px-3 py-2 text-[13px] leading-relaxed text-primary">
                {result.treatment}
              </p>
            )}
          </div>
        )
      )}

      <button
        type="button"
        onClick={onAgain}
        className="focus-ring w-full rounded-pill border border-hairline px-6 py-3 text-[15px] font-semibold text-primary transition-transform duration-150 active:scale-[0.97]"
      >
        Scan another
      </button>
    </div>
  );
}
