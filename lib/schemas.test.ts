import { describe, it, expect } from "vitest";
import { GenerateRequestSchema, GeneratedRecipeSchema } from "./schemas";
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

describe("GeneratedRecipeSchema", () => {
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
