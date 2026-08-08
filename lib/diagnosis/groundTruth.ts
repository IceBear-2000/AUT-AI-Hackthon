// LANE Z — the labels that came with the images.
//
// Every file in public/sample-images/ was pulled from a named PlantVillage class
// folder, so we know what each one actually is. That gives the verification run
// (Section 10 task 3) something to score the model against, and gives the cache
// generator a correct answer to fall back on.

import { readdirSync } from "node:fs";
import path from "node:path";
import type { CropType } from "@/lib/types";

/** Filename stem -> the crop, and the exact condition key used in treatments.json. */
const CLASSES: Record<string, { cropType: CropType; condition: string }> = {
  "grape-black-rot": { cropType: "grape", condition: "Black Rot" },
  "grape-esca": { cropType: "grape", condition: "Esca (Black Measles)" },
  "grape-leaf-blight": {
    cropType: "grape",
    condition: "Leaf Blight (Isariopsis Leaf Spot)",
  },
  "grape-healthy": { cropType: "grape", condition: "Healthy" },
  "apple-scab": { cropType: "apple", condition: "Apple Scab" },
  "apple-black-rot": {
    cropType: "apple",
    condition: "Black Rot (Frogeye Leaf Spot)",
  },
  "apple-cedar-rust": { cropType: "apple", condition: "Cedar Apple Rust" },
  "apple-healthy": { cropType: "apple", condition: "Healthy" },
};

export type LabelledImage = {
  imageUrl: string;
  cropType: CropType;
  /** treatments.json key — not the display label. */
  condition: string;
  stem: string;
};

/** "grape-black-rot-03.jpg" -> the "grape-black-rot" class. Longest match wins,
 *  so "apple-black-rot" is never mistaken for "black-rot". */
function classify(filename: string): LabelledImage | undefined {
  const base = path.basename(filename, path.extname(filename));
  const stem = Object.keys(CLASSES)
    .filter((key) => base.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  if (!stem) return undefined;
  return { imageUrl: `/sample-images/${filename}`, stem, ...CLASSES[stem] };
}

const IMAGE_DIR = path.join(process.cwd(), "public", "sample-images");

/**
 * Every image the demo can possibly surface, labelled. Reading the directory
 * rather than a hardcoded list means the cache can never drift out of sync with
 * what is actually on disk — the Section 10 task 4 requirement.
 */
export function labelledImages(): LabelledImage[] {
  return readdirSync(IMAGE_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map(classify)
    .filter((entry): entry is LabelledImage => entry !== undefined);
}

export function classCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const image of labelledImages()) {
    counts[image.stem] = (counts[image.stem] ?? 0) + 1;
  }
  return counts;
}
