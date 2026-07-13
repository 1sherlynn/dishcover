// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { MockLanguageModelV2 } from "ai/test";

// Scan (CONTEXT.md): a photo of the fridge/pantry → reviewed Captured
// Ingredients. Mirrors lib/generation.ts's shape but is its own module
// (vision is a distinct concern — see ADR-0003).

let decodeImage: typeof import("./scan").decodeImage;
let canonicalizeIngredients: typeof import("./scan").canonicalizeIngredients;
let runScan: typeof import("./scan").runScan;
let ScanFailedError: typeof import("./scan").ScanFailedError;
let MAX_IMAGE_BYTES: typeof import("./scan").MAX_IMAGE_BYTES;

beforeAll(async () => {
  ({ decodeImage, canonicalizeIngredients, runScan, ScanFailedError, MAX_IMAGE_BYTES } =
    await import("./scan"));
});

function base64OfSize(bytes: number): string {
  return Buffer.alloc(bytes, 1).toString("base64");
}

describe("decodeImage", () => {
  it("accepts a raw base64 payload, defaulting to image/jpeg", () => {
    const image = decodeImage(base64OfSize(100));
    expect(image).not.toBeNull();
    expect(image?.mediaType).toBe("image/jpeg");
  });

  it("extracts the media type and payload from a data URL", () => {
    const image = decodeImage(`data:image/webp;base64,${base64OfSize(100)}`);
    expect(image).not.toBeNull();
    expect(image?.mediaType).toBe("image/webp");
  });

  it("rejects a payload larger than the 1MB contract", () => {
    const image = decodeImage(base64OfSize(MAX_IMAGE_BYTES + 1));
    expect(image).toBeNull();
  });

  it("accepts a payload right at the 1MB ceiling", () => {
    const image = decodeImage(base64OfSize(MAX_IMAGE_BYTES));
    expect(image).not.toBeNull();
  });

  it("rejects an empty payload", () => {
    expect(decodeImage("")).toBeNull();
    expect(decodeImage("data:image/jpeg;base64,")).toBeNull();
  });

  it("rejects a media type outside the JPEG/WebP contract", () => {
    expect(decodeImage(`data:image/gif;base64,${base64OfSize(100)}`)).toBeNull();
    expect(decodeImage(`data:text/plain;base64,${base64OfSize(100)}`)).toBeNull();
  });
});

describe("canonicalizeIngredients (internal seam — food items only, canonical lowercase, deduplicated)", () => {
  it("lowercases and trims names", () => {
    const result = canonicalizeIngredients({
      ingredients: [{ name: "  Spinach ", confidence: "high" }],
    });
    expect(result.ingredients).toEqual([{ name: "spinach", confidence: "high" }]);
  });

  it("deduplicates by canonical name, keeping high confidence if any occurrence was high", () => {
    const result = canonicalizeIngredients({
      ingredients: [
        { name: "Eggs", confidence: "low" },
        { name: "eggs", confidence: "high" },
      ],
    });
    expect(result.ingredients).toEqual([{ name: "eggs", confidence: "high" }]);
  });

  it("drops entries that are empty after trimming", () => {
    const result = canonicalizeIngredients({
      ingredients: [{ name: "   ", confidence: "high" }, { name: "milk", confidence: "high" }],
    });
    expect(result.ingredients).toEqual([{ name: "milk", confidence: "high" }]);
  });
});

describe("runScan", () => {
  function objectModel(object: unknown) {
    return new MockLanguageModelV2({
      doGenerate: async () => ({
        finishReason: "stop" as const,
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        content: [{ type: "text" as const, text: JSON.stringify(object) }],
        warnings: [],
      }),
    });
  }

  it("returns a canonicalized scan result on success", async () => {
    const model = objectModel({ ingredients: [{ name: "Tomatoes", confidence: "high" }] });
    const result = await runScan({ data: base64OfSize(10), mediaType: "image/jpeg" }, model);
    expect(result.ingredients).toEqual([{ name: "tomatoes", confidence: "high" }]);
  });

  it("wraps a failed generation in ScanFailedError", async () => {
    const model = new MockLanguageModelV2({
      doGenerate: async () => ({
        finishReason: "stop" as const,
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        content: [{ type: "text" as const, text: "not json" }],
        warnings: [],
      }),
    });
    await expect(
      runScan({ data: base64OfSize(10), mediaType: "image/jpeg" }, model)
    ).rejects.toBeInstanceOf(ScanFailedError);
  });
});
