import { describe, it, expect } from "vitest";
import {
  GenerateRequestSchema,
  GeneratedRecipeSchema,
  RecipeStepSchema,
} from "./schemas";
import { mockRecipe } from "./mock-recipe";

describe("GenerateRequestSchema", () => {
  it("fills documented defaults for a minimal request", () => {
    const parsed = GenerateRequestSchema.parse({
      capturedIngredients: ["eggs"],
    });
    expect(parsed.pantry).toEqual([]);
    expect(parsed.avoidList).toEqual([]);
    expect(parsed.mealSettings).toEqual({ guests: 2, time: "medium", cuisine: "any" });
    expect(parsed.allowOtherIngredients).toBe(false);
  });

  it("rejects an empty captured-ingredients list", () => {
    expect(
      GenerateRequestSchema.safeParse({ capturedIngredients: [] }).success
    ).toBe(false);
  });

  it("rejects out-of-range guests", () => {
    expect(
      GenerateRequestSchema.safeParse({
        capturedIngredients: ["eggs"],
        mealSettings: { guests: 9, time: "fast", cuisine: "any" },
      }).success
    ).toBe(false);
  });

  it("accepts a partial macro target", () => {
    const parsed = GenerateRequestSchema.parse({
      capturedIngredients: ["eggs"],
      macroTarget: { proteinG: 40 },
    });
    expect(parsed.macroTarget).toEqual({ proteinG: 40 });
  });
});

describe("RecipeStepSchema", () => {
  it("normalizes a null timerSeconds to undefined (model says 'no timer')", () => {
    const parsed = RecipeStepSchema.parse({
      title: "Rest the chicken",
      body: "Let it sit off the heat.",
      timerSeconds: null,
    });
    expect(parsed.timerSeconds).toBeUndefined();
  });

  it("keeps accepting an omitted timerSeconds", () => {
    const parsed = RecipeStepSchema.parse({
      title: "Plate up",
      body: "Divide between bowls.",
    });
    expect(parsed.timerSeconds).toBeUndefined();
  });

  it("keeps a real timer value intact", () => {
    const parsed = RecipeStepSchema.parse({
      title: "Simmer the sauce",
      body: "Low heat, lid off.",
      timerSeconds: 600,
    });
    expect(parsed.timerSeconds).toBe(600);
  });

  it("still rejects a non-positive timer", () => {
    expect(
      RecipeStepSchema.safeParse({
        title: "Simmer",
        body: "Low heat.",
        timerSeconds: 0,
      }).success
    ).toBe(false);
  });
});

describe("GeneratedRecipeSchema", () => {
  it("accepts a recipe whose steps carry timerSeconds: null", () => {
    const recipe = mockRecipe(
      GenerateRequestSchema.parse({ capturedIngredients: ["eggs"] })
    );
    const withNullTimers = {
      ...recipe,
      steps: recipe.steps.map((s) => ({ timerSeconds: null, ...s })),
    };
    expect(GeneratedRecipeSchema.safeParse(withNullTimers).success).toBe(true);
  });

  it("accepts the built-in mock recipe (contract fixture)", () => {
    const recipe = mockRecipe(
      GenerateRequestSchema.parse({ capturedIngredients: ["chicken breast", "spinach"] })
    );
    expect(GeneratedRecipeSchema.safeParse(recipe).success).toBe(true);
  });

  it("rejects an ingredient without a grams equivalent (ADR-0001)", () => {
    const recipe = mockRecipe(
      GenerateRequestSchema.parse({ capturedIngredients: ["eggs"] })
    );
    const broken = {
      ...recipe,
      ingredients: [{ name: "eggs", quantity: 2, unit: "piece", toBuy: false }],
    };
    expect(GeneratedRecipeSchema.safeParse(broken).success).toBe(false);
  });
});
