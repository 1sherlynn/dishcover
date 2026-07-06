// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { MockLanguageModelV2 } from "ai/test";
import { GenerateRequestSchema } from "./schemas";
import { mockRecipe } from "./mock-recipe";
import { kcalFromMacros } from "./nutrition";

// The Generator's rules and retry flow, exercised without HTTP or a paid
// model call. MockLanguageModelV2 is the second adapter that makes the
// model seam real (ADR-0003).

let runGeneration: typeof import("./generation").runGeneration;
let buildPrompt: typeof import("./generation").buildPrompt;
let GenerationFailedError: typeof import("./generation").GenerationFailedError;

beforeAll(async () => {
  ({ runGeneration, buildPrompt, GenerationFailedError } = await import("./generation"));
});

const baseRequest = (overrides: object = {}) =>
  GenerateRequestSchema.parse({ capturedIngredients: ["chicken breast"], ...overrides });

function textModel(texts: string[]) {
  let call = 0;
  const model = new MockLanguageModelV2({
    doGenerate: async () => ({
      finishReason: "stop" as const,
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      content: [{ type: "text" as const, text: texts[Math.min(call++, texts.length - 1)] }],
      warnings: [],
    }),
  });
  return { model, calls: () => call };
}

describe("buildPrompt (internal seam — the Generator's rules)", () => {
  it("forbids the Avoid List and demands strict Dietary Preferences", () => {
    const { system } = buildPrompt(
      baseRequest({ avoidList: ["cilantro"], dietary: ["vegan"] })
    );
    expect(system).toMatch(/NEVER use anything from the avoid list/i);
    const { prompt } = buildPrompt(
      baseRequest({ avoidList: ["cilantro"], dietary: ["vegan"] })
    );
    expect(prompt).toContain("cilantro");
    expect(prompt).toContain("vegan");
  });

  it("restricts to captured + pantry when Allow Other Ingredients is off", () => {
    const { system } = buildPrompt(baseRequest({ allowOtherIngredients: false }));
    expect(system).toMatch(/ONLY captured ingredients \+ pantry/);
    expect(system).not.toContain("toBuy=true");
  });

  it("permits marked extras when Allow Other Ingredients is on", () => {
    const { system } = buildPrompt(baseRequest({ allowOtherIngredients: true }));
    expect(system).toContain("toBuy=true");
  });

  it("states the Macro Target as soft, with values", () => {
    const { system } = buildPrompt(baseRequest({ macroTarget: { proteinG: 45 } }));
    expect(system).toMatch(/soft target/i);
    expect(system).toContain("45g");
  });

  it("maps the fast time budget to under 20 minutes", () => {
    const { prompt } = buildPrompt(
      baseRequest({ mealSettings: { guests: 2, time: "fast", cuisine: "any" } })
    );
    expect(prompt).toContain("under 20 minutes");
  });
});

describe("runGeneration", () => {
  it("returns a schema-valid recipe on the first attempt", async () => {
    const recipe = mockRecipe(baseRequest());
    const { model, calls } = textModel([JSON.stringify(recipe)]);
    const result = await runGeneration(baseRequest(), model);
    expect(result.title).toBe(recipe.title);
    expect(calls()).toBe(1);
  });

  it("corrects kcal that disagrees with the macros by more than 10%", async () => {
    const recipe = mockRecipe(baseRequest());
    recipe.nutrition.perServing.kcal = 9999; // wildly off
    const { model } = textModel([JSON.stringify(recipe)]);
    const result = await runGeneration(baseRequest(), model);
    expect(result.nutrition.perServing.kcal).toBe(
      Math.round(kcalFromMacros(recipe.nutrition.perServing))
    );
  });

  it("retries once after an invalid payload, then succeeds", async () => {
    const recipe = mockRecipe(baseRequest());
    const { model, calls } = textModel(["this is not json", JSON.stringify(recipe)]);
    const result = await runGeneration(baseRequest(), model);
    expect(result.title).toBe(recipe.title);
    expect(calls()).toBe(2);
  });

  it("throws GenerationFailedError after two invalid attempts", async () => {
    const { model, calls } = textModel(["nope", "still nope"]);
    await expect(runGeneration(baseRequest(), model)).rejects.toBeInstanceOf(
      GenerationFailedError
    );
    expect(calls()).toBe(2);
  });
});
