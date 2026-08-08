// Live model endpoint for the camera showcase.
//
// Separate from lib/diagnosis on purpose. That path takes a known cropType and
// reads a file off disk, and it falls back to a recorded result when the model
// is slow — correct for the drone pipeline, wrong here. This page exists to
// prove the model answers, so it never substitutes a canned result for a live
// one: if the call fails, the caller is told it failed.

import Anthropic from "@anthropic-ai/sdk";
import treatments from "@/lib/treatments.json";
import type { CropType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL = "claude-sonnet-5";

// Generous next to the pipeline's 3s: a human is holding a leaf up and watching,
// so waiting beats a wrong answer.
const TIMEOUT_MS = 20_000;

type TreatmentEntry = { symptoms: string; response: string; severity: string };
const library = treatments as Record<CropType, Record<string, TreatmentEntry>>;

export type VisionResult = {
  crop: CropType | "other";
  condition: string;
  confidence: number;
  rationale: string;
  symptoms?: string;
  treatment?: string;
};

function catalogue(): string {
  return (["grape", "apple"] as CropType[])
    .map((crop) => `${crop}: ${Object.keys(library[crop]).map((c) => `"${c}"`).join(", ")}`)
    .join("\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "No ANTHROPIC_API_KEY set. This page calls the model live and will not show a stand-in result.",
      },
      { status: 503 },
    );
  }

  let image: string;
  try {
    const body = (await request.json()) as { image?: string };
    if (!body.image) throw new Error("missing image");
    image = body.image;
  } catch {
    return Response.json({ error: "Send { image: <data URL> }." }, { status: 400 });
  }

  // "data:image/jpeg;base64,XXXX" -> media type + payload
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image);
  if (!match) {
    return Response.json(
      { error: "Image must be a base64 JPEG, PNG or WebP data URL." },
      { status: 400 },
    );
  }
  const [, mediaType, data] = match;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 400,
        system:
          "You are a horticultural triage assistant for New Zealand growers. " +
          "You look at a single leaf or canopy photo and classify it. " +
          "You are a prioritisation tool, not a diagnostic replacement for an agronomist. " +
          "If the photo is not a grape or apple leaf — or is too blurry, too dark or too " +
          'far away to judge — say so with crop "other" rather than guessing. ' +
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
                  "Identify both the crop and the condition in this photo.\n\n" +
                  `Known classes:\n${catalogue()}\n\n` +
                  'If it is not one of those crops, or you cannot tell, use crop "other" ' +
                  'and condition "Unknown".\n\n' +
                  'Respond as {"crop": "grape"|"apple"|"other", "condition": <one of the ' +
                  'classes for that crop, or "Unknown">, "confidence": <0-1 number>, ' +
                  '"rationale": <one short sentence naming the visual evidence you used>}',
              },
            ],
          },
        ],
      },
      { timeout: TIMEOUT_MS },
    );

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("")
      .trim();

    const json = text.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(json) as Partial<VisionResult>;

    const crop: VisionResult["crop"] =
      parsed.crop === "grape" || parsed.crop === "apple" ? parsed.crop : "other";

    // Only accept a condition the content library actually knows, so a
    // hallucinated class can never reach the screen as a confident answer.
    const known = crop === "other" ? [] : Object.keys(library[crop]);
    const condition =
      parsed.condition && known.includes(parsed.condition)
        ? parsed.condition
        : "Unknown";

    const entry =
      crop !== "other" && condition !== "Unknown"
        ? library[crop][condition]
        : undefined;

    const result: VisionResult = {
      crop,
      condition,
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0)),
      rationale: parsed.rationale?.trim() || "No rationale returned.",
      symptoms: entry?.symptoms,
      treatment: entry?.response,
    };

    return Response.json({ result });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "unknown error";
    return Response.json(
      { error: `Model call failed: ${reason}` },
      { status: 502 },
    );
  }
}
