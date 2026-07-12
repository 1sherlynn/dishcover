// @vitest-environment node
import { describe, it, expect } from "vitest";
import { filterByTab, QUICK_MAX_MINUTES, COOKBOOK_TABS } from "./cookbook";
import type { Recipe } from "./schemas";

function makeRecipe(
  id: string,
  opts: { favorite?: boolean; timeMinutes?: number; createdAt?: string } = {}
): Recipe {
  return {
    id,
    createdAt: opts.createdAt ?? "2026-07-06T00:00:00.000Z",
    title: `Recipe ${id}`,
    description: "test",
    tag: "Test",
    cuisine: "any",
    difficulty: "easy",
    timeMinutes: opts.timeMinutes ?? 30,
    baseServings: 2,
    ingredients: [
      { name: "eggs", quantity: 2, unit: "piece", grams: 110, toBuy: false },
    ],
    steps: [
      { title: "A", body: "a" },
      { title: "B", body: "b" },
    ],
    nutrition: {
      perServing: {
        kcal: 100, proteinG: 10, carbsG: 5, fatG: 4, fiberG: 1, sugarG: 1,
        satFatG: 1, sodiumMg: 100, potassiumMg: 100, calciumMg: 10,
        ironMg: 1, vitaminCMg: 1, vitaminDMcg: 0,
      },
      estimated: true,
      macroTarget: undefined,
    },
    favorite: opts.favorite ?? false,
    artSeed: 1,
  };
}

describe("filterByTab", () => {
  it("ALL returns every recipe", () => {
    const recipes = [makeRecipe("a"), makeRecipe("b"), makeRecipe("c")];
    expect(filterByTab(recipes, "all").map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("FAVORITES keeps only favorited recipes", () => {
    const recipes = [
      makeRecipe("a", { favorite: true }),
      makeRecipe("b", { favorite: false }),
      makeRecipe("c", { favorite: true }),
    ];
    expect(filterByTab(recipes, "favorites").map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("QUICK keeps recipes at or under the quick threshold", () => {
    const recipes = [
      makeRecipe("under", { timeMinutes: QUICK_MAX_MINUTES - 1 }),
      makeRecipe("edge", { timeMinutes: QUICK_MAX_MINUTES }),
      makeRecipe("over", { timeMinutes: QUICK_MAX_MINUTES + 1 }),
    ];
    expect(filterByTab(recipes, "quick").map((r) => r.id)).toEqual(["under", "edge"]);
  });

  it("orders results newest first by createdAt regardless of input order", () => {
    const recipes = [
      makeRecipe("old", { createdAt: "2026-01-01T00:00:00.000Z" }),
      makeRecipe("new", { createdAt: "2026-03-01T00:00:00.000Z" }),
      makeRecipe("mid", { createdAt: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(filterByTab(recipes, "all").map((r) => r.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the input array", () => {
    const recipes = [
      makeRecipe("old", { createdAt: "2026-01-01T00:00:00.000Z" }),
      makeRecipe("new", { createdAt: "2026-03-01T00:00:00.000Z" }),
    ];
    const before = recipes.map((r) => r.id);
    filterByTab(recipes, "all");
    expect(recipes.map((r) => r.id)).toEqual(before);
  });

  it("exposes the three tabs in display order", () => {
    expect(COOKBOOK_TABS).toEqual(["all", "favorites", "quick"]);
  });
});
