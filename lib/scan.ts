import { generateObject, type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { ScanResultSchema, type ScanResult } from "./schemas";

// Scan (CONTEXT.md): turns a fridge/pantry photo into reviewed Captured
// Ingredients. Recipe generation gets lib/generation.ts; vision is a
// distinct concern (ADR-0003) with its own model resolution, so Scan gets
// its own module rather than branching inside the Generator.

export class ScanFailedError extends Error {
  constructor(cause?: unknown) {
    super("scan failed");
    this.name = "ScanFailedError";
    this.cause = cause;
  }
}

export const MAX_IMAGE_BYTES = 1_048_576; // 1MB decoded (GENERATION-CONTRACT.md)

export interface ScanImage {
  data: string; // base64 payload, no data: URL prefix
  mediaType: string;
}

const DATA_URL_RE = /^data:([\w.+-]+\/[\w.+-]+);base64,(.*)$/s;

// GENERATION-CONTRACT.md: "base64 JPEG/WebP" only.
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/webp"]);

/** Internal seam: accepts a raw base64 payload or a data: URL, enforces the size and format contract. */
export function decodeImage(input: string): ScanImage | null {
  const match = DATA_URL_RE.exec(input);
  const mediaType = match?.[1] ?? "image/jpeg";
  const data = match ? match[2] : input;

  if (!ALLOWED_MEDIA_TYPES.has(mediaType)) return null;
  if (!data) return null;

  let byteLength: number;
  try {
    byteLength = Buffer.from(data, "base64").length;
  } catch {
    return null;
  }
  if (byteLength === 0 || byteLength > MAX_IMAGE_BYTES) return null;

  return { data, mediaType };
}

// Provider switch (ADR-0003), mirrors lib/generation.ts's resolveModel but
// with a scan-specific model: Groq's default text model has no vision.
export function resolveScanModel(): LanguageModel | null {
  const provider =
    process.env.LLM_PROVIDER ??
    (process.env.GROQ_API_KEY
      ? "groq"
      : process.env.GOOGLE_GENERATIVE_AI_API_KEY
        ? "google"
        : "mock");

  switch (provider) {
    case "groq":
      return groq(process.env.SCAN_LLM_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct");
    case "google":
      return google(process.env.SCAN_LLM_MODEL ?? "gemini-2.5-flash");
    default:
      return null;
  }
}

/** Internal seam: food items only, canonical lowercase, deduplicated. Exported for its tests. */
export function canonicalizeIngredients(result: ScanResult): ScanResult {
  const byName = new Map<string, "high" | "low">();
  for (const { name, confidence } of result.ingredients) {
    const clean = name.trim().toLowerCase();
    if (!clean) continue;
    const existing = byName.get(clean);
    byName.set(clean, existing === "high" ? "high" : confidence);
  }
  return { ingredients: [...byName].map(([name, confidence]) => ({ name, confidence })) };
}

const SYSTEM = `You identify food items in a photo of a fridge or pantry for Dishcover, a recipe app.

Rules:
1. List only food items and ingredients — no containers, appliances, or non-food objects.
2. Use canonical lowercase names (e.g. "bell pepper", not "Bell Peppers" or "red bell pepper (2)").
3. Mark confidence "low" for anything partially hidden, blurry, or ambiguous; "high" for anything clearly identifiable.
4. Do not guess at brand names or precise varieties — name the food generically.`;

export async function runScan(image: ScanImage, model: LanguageModel): Promise<ScanResult> {
  try {
    const { object } = await generateObject({
      model,
      schema: ScanResultSchema,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What food items are visible in this photo?" },
            { type: "image", image: image.data, mediaType: image.mediaType },
          ],
        },
      ],
    });
    return canonicalizeIngredients(object);
  } catch (err) {
    throw new ScanFailedError(err);
  }
}
