// AI diagnosis layer — built. Lane Z tunes the images and cache.
// Public surface is one function: diagnose(imageUrl, cropType) => Promise<Diagnosis>
// Lanes X, Y and the API import this and nothing else from here.

import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { CropType, Diagnosis } from "@/lib/types";
import treatments from "@/lib/treatments.json";
// Pre-computed results for every demo image (Spec Section 10 task 4 / Section 11).
// Regenerate with `npx tsx lib/diagnosis/verify.ts --write` after changing images.
import cache from "./cache.json";

const MODEL = "claude-sonnet-5";

// Spec Section 11: if the live call is slow, fall back rather than stall the demo.
const TIMEOUT_MS = 3000;

type TreatmentEntry = { symptoms: string; response: string; severity: string };
type TreatmentLibrary = Record<CropType, Record<string, TreatmentEntry>>;

const library = treatments as TreatmentLibrary;
const cachedDiagnoses = cache as Record<string, Diagnosis>;

export function conditionsFor(cropType: CropType): string[] {
  return Object.keys(library[cropType]);
}

/** Display label: "Healthy" stays bare, everything else gets crop-prefixed once.
 *  Matches the crop name anywhere, not just at the start — otherwise
 *  "Cedar Apple Rust" comes out as "Apple Cedar Apple Rust". */
export function label(cropType: CropType, condition: string): string {
  if (condition === "Healthy") return "Healthy";
  const crop = cropType === "grape" ? "Grape" : "Apple";
  return condition.includes(crop) ? condition : `${crop} ${condition}`;
}

/**
 * Section 8, task 2: the model picks the condition, but the treatment text comes
 * from treatments.json — consistent copy, and it matches what the UI shows.
 */
function buildDiagnosis(
  cropType: CropType,
  condition: string,
  confidence: number,
): Diagnosis {
  const entry = library[cropType][condition] ?? library[cropType]["Healthy"];
  return {
    condition: label(cropType, condition),
    confidence: Math.max(0, Math.min(1, confidence)),
    suggestedTreatment: entry.response,
  };
}

// The API takes raster formats only. The placeholder SVGs are gone, but this
// keeps an unsupported file from turning into an opaque 400 mid-demo.
const MEDIA_TYPES: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function imageToBase64(
  imageUrl: string,
): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }> {
  // imageUrl is a public/ path such as "/sample-images/grape-black-rot-01.jpg"
  const filePath = path.join(process.cwd(), "public", imageUrl);
  const mediaType = MEDIA_TYPES[path.extname(filePath).toLowerCase()];
  if (!mediaType) {
    throw new Error(`unsupported image format: ${imageUrl}`);
  }
  const buffer = await readFile(filePath);
  return { data: buffer.toString("base64"), mediaType };
}

async function callModel(
  imageUrl: string,
  cropType: CropType,
): Promise<Diagnosis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const { data, mediaType } = await imageToBase64(imageUrl);
  const allowed = conditionsFor(cropType);
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system:
      "You are a horticultural triage assistant for New Zealand growers. " +
      "You look at a single leaf or canopy image and classify it. " +
      "You are a prioritisation tool, not a diagnostic replacement for an agronomist. " +
      "Reply with JSON only, no prose and no markdown fences.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
              data,
            },
          },
          {
            type: "text",
            text:
              `This is a ${cropType} image from an aerial scan.\n` +
              `Classify it as exactly one of: ${allowed.map((c) => `"${c}"`).join(", ")}.\n` +
              `Respond as {"condition": <one of the above>, "confidence": <0-1 number>}.`,
          },
        ],
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("")
    .trim();

  const json = text.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(json) as { condition?: string; confidence?: number };

  // Deliberately throw rather than defaulting to "Healthy". On a disease-triage
  // tool, silently turning an unreadable response into "no disease" is the one
  // failure direction that loses a crop — better to fall back to the cached
  // answer for this exact image, which diagnose() does on any throw.
  if (!parsed.condition || !allowed.includes(parsed.condition)) {
    throw new Error(`unrecognised condition from model: ${text.slice(0, 120)}`);
  }

  return buildDiagnosis(cropType, parsed.condition, parsed.confidence ?? 0.5);
}

/**
 * The same live call, with no timeout and no cache fallback — so the Section 10
 * task 3 verification measures the model, not the safety net. Not used at runtime.
 */
export async function diagnoseLive(
  imageUrl: string,
  cropType: CropType,
): Promise<Diagnosis> {
  return callModel(imageUrl, cropType);
}

/**
 * Live model call first, pre-cached result as the safety net (Section 11).
 * Never throws — a demo that shows a wrong-but-plausible card beats a blank one.
 */
export async function diagnose(
  imageUrl: string,
  cropType: CropType,
): Promise<Diagnosis> {
  const fallback =
    cachedDiagnoses[imageUrl] ?? buildDiagnosis(cropType, "Healthy", 0.5);

  try {
    return await Promise.race([
      callModel(imageUrl, cropType),
      new Promise<Diagnosis>((_, reject) =>
        setTimeout(() => reject(new Error("diagnose timeout")), TIMEOUT_MS),
      ),
    ]);
  } catch (error) {
    console.warn(
      `[diagnosis] falling back to cache for ${imageUrl}:`,
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}
