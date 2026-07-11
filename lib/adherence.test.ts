// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GenerateRequestSchema } from "./schemas";
import { mockRecipe } from "./mock-recipe";
import { kcalFromMacros } from "./nutrition";
import {
  evaluateRun,
  summarize,
  renderReport,
  isRateLimitError,
  isDailyBudgetError,
  MACRO_TOLERANCE,
  type EvalRun,
} from "./adherence";

// The adherence analysis seam (#7): pure scoring of one generation against
// its request, plus aggregation and the markdown report. The eval runner is
// I/O glue around these functions.

const request = (overrides: object = {}) =>
  GenerateRequestSchema.parse({ capturedIngredients: ["chicken breast"], ...overrides });

/** A recipe whose kcal agrees exactly with its macros. */
function consistentRecipe(req = request(), macros?: { proteinG: number; carbsG: number; fatG: number }) {
  const recipe = mockRecipe(req);
  const m = macros ?? { proteinG: 36, carbsG: 12, fatG: 21 };
  recipe.nutrition.perServing = {
    ...recipe.nutrition.perServing,
    ...m,
    kcal: kcalFromMacros(m),
  };
  return recipe;
}

describe("evaluateRun", () => {
  it("computes signed deltas only for targeted macros", () => {
    const req = request({ macroTarget: { proteinG: 48 } });
    const recipe = consistentRecipe(req, { proteinG: 36, carbsG: 12, fatG: 21 });
    const result = evaluateRun(req, recipe);
    expect(result.macroDeltas.proteinG).toBeCloseTo(-0.25); // 36 vs 48 → 25% under
    expect(result.macroDeltas.carbsG).toBeUndefined();
    expect(result.macroDeltas.fatG).toBeUndefined();
  });

  it("reports kcal deviation from the Atwater-computed value", () => {
    const req = request();
    const recipe = consistentRecipe(req);
    expect(evaluateRun(req, recipe).kcalDeltaPct).toBeCloseTo(0);

    recipe.nutrition.perServing.kcal = Math.round(
      kcalFromMacros(recipe.nutrition.perServing) * 1.08
    );
    expect(evaluateRun(req, recipe).kcalDeltaPct).toBeCloseTo(0.08, 1);
  });

  it("flags avoid-list terms appearing in ingredients or steps", () => {
    const req = request({ avoidList: ["cilantro", "peanuts"] });
    const recipe = consistentRecipe(req);
    recipe.ingredients[0] = { ...recipe.ingredients[0], name: "cilantro" };
    recipe.steps[0] = { ...recipe.steps[0], body: "Garnish with crushed peanuts." };
    expect(evaluateRun(req, recipe).avoidViolations).toEqual(["cilantro", "peanuts"]);
  });

  it("catches avoid terms in other word forms (singular/compound)", () => {
    // Review finding: plain substring missed "peanut butter" when avoiding
    // "peanuts" — a false negative in the exact metric the eval reports.
    const req = request({ avoidList: ["peanuts", "mushrooms"] });
    const recipe = consistentRecipe(req);
    recipe.ingredients[0] = { ...recipe.ingredients[0], name: "peanut butter" };
    recipe.steps[0] = { ...recipe.steps[0], body: "Add the sliced mushroom." };
    expect(evaluateRun(req, recipe).avoidViolations).toEqual(["peanuts", "mushrooms"]);
  });

  it("passes a clean run: no violations, empty deltas without a target", () => {
    const req = request({ avoidList: ["cilantro"] });
    const result = evaluateRun(req, consistentRecipe(req));
    expect(result.avoidViolations).toEqual([]);
    expect(result.macroDeltas).toEqual({});
    expect(result.timeViolation).toBe(false);
    expect(result.ok).toBe(true);
  });

  it.each([
    ["fast", 25, true],
    ["fast", 20, true], // prompt says "under 20 minutes" — 20 is a miss
    ["fast", 19, false],
    ["medium", 46, true],
    ["medium", 45, false],
    ["long", 120, false],
  ] as const)("time budget %s with %i min → violation %s", (time, minutes, violation) => {
    const req = request({ mealSettings: { guests: 2, time, cuisine: "any" } });
    const recipe = consistentRecipe(req);
    recipe.timeMinutes = minutes;
    expect(evaluateRun(req, recipe).timeViolation).toBe(violation);
  });

  it("fails ok when a macro misses beyond tolerance", () => {
    const req = request({ macroTarget: { proteinG: 48 } });
    const recipe = consistentRecipe(req, { proteinG: 36, carbsG: 12, fatG: 21 });
    const result = evaluateRun(req, recipe);
    expect(Math.abs(result.macroDeltas.proteinG!)).toBeGreaterThan(MACRO_TOLERANCE);
    expect(result.ok).toBe(false);
  });
});

describe("summarize", () => {
  const runFor = (
    id: string,
    overrides: object,
    mutate?: (r: ReturnType<typeof consistentRecipe>) => void
  ): EvalRun => {
    const req = request(overrides);
    const recipe = consistentRecipe(req);
    mutate?.(recipe);
    return { id, request: req, recipe, evaluation: evaluateRun(req, recipe) };
  };

  it("aggregates counts, per-macro bias, and worst offenders", () => {
    const runs: EvalRun[] = [
      // protein 36 vs 45 → -0.2; vs 30 → +0.2 → mean bias 0
      runFor("under", { macroTarget: { proteinG: 45 } }),
      runFor("over", { macroTarget: { proteinG: 30 } }),
      runFor("clean", {}),
      { id: "dead", request: request(), error: "generation failed after retry" },
    ];
    const s = summarize(runs);
    expect(s.total).toBe(4);
    expect(s.generated).toBe(3);
    expect(s.failed).toBe(1);
    expect(s.macroBias.proteinG?.n).toBe(2);
    expect(s.macroBias.proteinG?.mean).toBeCloseTo(0);
    expect(s.worstMacroMisses[0]).toMatchObject({ id: "under", macro: "proteinG" });
  });

  it("separates quota skips and schema failures from generic failures", () => {
    const runs: EvalRun[] = [
      runFor("good", {}),
      { id: "quota", request: request(), error: "skipped: daily token budget (TPD) exhausted" },
      { id: "invalid", request: request(), error: "response did not match schema" },
      { id: "net", request: request(), error: "fetch failed" },
    ];
    const s = summarize(runs);
    expect(s.failed).toBe(3);
    expect(s.skipped).toBe(1);
    expect(s.schemaFailures).toBe(1);
  });

  it("collects avoid and time violations by run id", () => {
    const runs: EvalRun[] = [
      runFor(
        "dirty",
        { avoidList: ["cilantro"], mealSettings: { guests: 2, time: "fast", cuisine: "any" } },
        (r) => {
          r.ingredients[0] = { ...r.ingredients[0], name: "cilantro" };
          r.timeMinutes = 30;
        }
      ),
    ];
    const s = summarize(runs);
    expect(s.avoidViolationRuns).toEqual([{ id: "dirty", terms: ["cilantro"] }]);
    expect(s.timeViolationRuns).toEqual([{ id: "dirty", timeMinutes: 30, budget: "fast" }]);
    expect(s.passed).toBe(0);
  });
});

describe("renderReport", () => {
  it("renders counts, bias, violations, and the tuning log as markdown", () => {
    const req = request({ macroTarget: { proteinG: 45 } });
    const recipe = consistentRecipe(req);
    const runs: EvalRun[] = [
      { id: "hp-fast", request: req, recipe, evaluation: evaluateRun(req, recipe) },
    ];
    const md = renderReport(summarize(runs), runs, {
      model: "openai/gpt-oss-120b",
      startedAt: "2026-07-11T03:00:00Z",
      durationMs: 90_000,
      tuningLog: ["2026-07-11: baseline run, no prompt change yet."],
    });
    expect(md).toContain("# Macro-adherence report");
    expect(md).toContain("openai/gpt-oss-120b");
    expect(md).toContain("hp-fast");
    expect(md).toContain("proteinG");
    expect(md).toContain("baseline run");
  });

  it("reports quota skips and schema failures in the headline counts", () => {
    const runs: EvalRun[] = [
      { id: "quota", request: request(), error: "skipped: daily token budget (TPD) exhausted" },
      { id: "invalid", request: request(), error: "response did not match schema" },
    ];
    const md = renderReport(summarize(runs), runs, {
      model: "m",
      startedAt: "2026-07-11T03:00:00Z",
      durationMs: 1000,
      tuningLog: [],
    });
    expect(md).toMatch(/skipped 1/);
    expect(md).toMatch(/schema-invalid 1/);
  });
});

describe("error classification (drives the runner's retry vs abort)", () => {
  it("recognizes per-minute rate limits as retryable", () => {
    expect(isRateLimitError(new Error("tokens per minute (TPM): Limit 8000"))).toBe(true);
    expect(isRateLimitError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isRateLimitError(new Error("response did not match schema"))).toBe(false);
  });

  it("recognizes daily budget exhaustion as terminal", () => {
    expect(isDailyBudgetError(new Error("tokens per day (TPD): Limit 100000"))).toBe(true);
    expect(isDailyBudgetError(new Error("tokens per minute (TPM)"))).toBe(false);
  });

  it("reads the cause when the error is wrapped (GenerationFailedError)", () => {
    const wrapped = new Error("generation failed after retry");
    (wrapped as Error & { cause: unknown }).cause = new Error("tokens per day (TPD)");
    expect(isDailyBudgetError(wrapped)).toBe(true);
  });
});
