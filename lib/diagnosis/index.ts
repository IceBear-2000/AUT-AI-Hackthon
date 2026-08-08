// TRACK A — AI diagnosis layer.
// Public surface is one function: diagnose(imageUrl, cropType) => Promise<Diagnosis>
// Track C imports this and nothing else from here.

import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { CropType, Diagnosis } from "@/lib/types";
import treatments from "@/lib/treatments.json";
// Pre-computed results for every demo image (Spec Section 8 task 3 / Section 11).
// Track A: refresh this after swapping in real PlantVillage images.
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

/** Display label: "Healthy" stays bare, everything else gets crop-prefixed once. */
export function label(cropType: CropType, condition: string): string {
  if (condition === "Healthy") return "Healthy";
  const crop = cropType === "grape" ? "Grape" : "Apple";
  return condition.startsWith(crop) ? condition : `${crop} ${condition}`;
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

async function imageToBase64(
  imageUrl: string,
): Promise<{ data: string; mediaType: string }> {
  // imageUrl is a public/ path such as "/sample-images/grape-black-rot-01.svg"
  const filePath = path.join(process.cwd(), "public", imageUrl);
  const buffer = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mediaType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { data: buffer.toString("base64"), mediaType };
}

async function callModel(
  imageUrl: string,
  cropType: CropType,
): Promise<Diagnosis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  // The shipped sample images are SVG placeholders; the API only takes raster
  // formats. Track A: drop real PlantVillage .jpg files in and this goes live.
  if (imageUrl.endsWith(".svg")) {
    throw new Error("placeholder SVG — swap in real PlantVillage images");
  }

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

  const condition =
    parsed.condition && allowed.includes(parsed.condition)
      ? parsed.condition
      : "Healthy";

  return buildDiagnosis(cropType, condition, parsed.confidence ?? 0.5);
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
