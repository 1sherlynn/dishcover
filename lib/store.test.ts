// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import type { Recipe } from "./schemas";

// lib/store.ts persists via localStorage at module scope — stub it before import.
function stubLocalStorage() {
  const data = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  } as Storage;
}

function makeRecipe(id: string, favorite = false): Recipe {
  return {
    id,
    createdAt: "2026-07-06T00:00:00.000Z",
    title: `Recipe ${id}`,
    description: "test",
    tag: "Test",
    cuisine: "any",
    difficulty: "easy",
    timeMinutes: 10,
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
    favorite,
    artSeed: 1,
  };
}

let useRecipeStore: typeof import("./store").useRecipeStore;
let usePrefsStore: typeof import("./store").usePrefsStore;
let useDraftStore: typeof import("./store").useDraftStore;
let isDraftNonEmpty: typeof import("./store").isDraftNonEmpty;

const DEFAULT_MEAL_SETTINGS = { guests: 2, time: "medium", cuisine: "any" } as const;

beforeAll(async () => {
  stubLocalStorage();
  ({ useRecipeStore, usePrefsStore, useDraftStore, isDraftNonEmpty } = await import("./store"));
});

beforeEach(() => {
  useRecipeStore.setState({ recipes: [] });
  usePrefsStore.setState({ dietary: [], avoidList: [], equipment: [] });
  useDraftStore.setState({
    ingredients: [],
    macroTarget: undefined,
    mealSettings: DEFAULT_MEAL_SETTINGS,
    allowOtherIngredients: false,
  });
});

describe("recipe store", () => {
  it("adds newest first", () => {
    const s = useRecipeStore.getState();
    s.addRecipe(makeRecipe("one"));
    s.addRecipe(makeRecipe("two"));
    expect(useRecipeStore.getState().recipes.map((r) => r.id)).toEqual(["two", "one"]);
  });

  it("toggles and untoggles favorite", () => {
    useRecipeStore.getState().addRecipe(makeRecipe("one"));
    useRecipeStore.getState().toggleFavorite("one");
    expect(useRecipeStore.getState().recipes[0].favorite).toBe(true);
    useRecipeStore.getState().toggleFavorite("one");
    expect(useRecipeStore.getState().recipes[0].favorite).toBe(false);
  });

  it("removes by id", () => {
    useRecipeStore.getState().addRecipe(makeRecipe("one"));
    useRecipeStore.getState().removeRecipe("one");
    expect(useRecipeStore.getState().recipes).toHaveLength(0);
  });

  it("evicts the oldest non-favorite at the cap, preserving favorites", () => {
    // Fill to the 200 cap; the very first (oldest) recipe is a favorite.
    useRecipeStore.getState().addRecipe(makeRecipe("keeper", true));
    for (let i = 0; i < 199; i++) {
      useRecipeStore.getState().addRecipe(makeRecipe(`r${i}`));
    }
    expect(useRecipeStore.getState().recipes).toHaveLength(200);

    useRecipeStore.getState().addRecipe(makeRecipe("newest"));
    const recipes = useRecipeStore.getState().recipes;

    expect(recipes).toHaveLength(200);
    expect(recipes[0].id).toBe("newest");
    // favorite survived even though it was oldest; oldest NON-favorite (r0) evicted
    expect(recipes.some((r) => r.id === "keeper")).toBe(true);
    expect(recipes.some((r) => r.id === "r0")).toBe(false);
  });
});

describe("prefs store", () => {
  it("starts empty with the theme field reserved", () => {
    const s = usePrefsStore.getState();
    expect(s.dietary).toEqual([]);
    expect(s.avoidList).toEqual([]);
    expect(s.equipment).toEqual([]);
    expect(s.theme).toBe("riso"); // shape reserved per DATA-MODEL.md; wired by a later issue
  });

  it("toggles a dietary preference on and off", () => {
    usePrefsStore.getState().toggleDietary("vegan");
    expect(usePrefsStore.getState().dietary).toEqual(["vegan"]);
    usePrefsStore.getState().toggleDietary("gluten-free");
    expect(usePrefsStore.getState().dietary).toEqual(["vegan", "gluten-free"]);
    usePrefsStore.getState().toggleDietary("vegan");
    expect(usePrefsStore.getState().dietary).toEqual(["gluten-free"]);
  });

  it("toggles equipment on and off", () => {
    usePrefsStore.getState().toggleEquipment("air fryer");
    expect(usePrefsStore.getState().equipment).toEqual(["air fryer"]);
    usePrefsStore.getState().toggleEquipment("air fryer");
    expect(usePrefsStore.getState().equipment).toEqual([]);
  });

  it("canonicalizes avoid entries to trimmed lowercase and dedupes", () => {
    usePrefsStore.getState().addAvoid("  Cilantro ");
    usePrefsStore.getState().addAvoid("cilantro");
    expect(usePrefsStore.getState().avoidList).toEqual(["cilantro"]);
  });

  it("ignores empty avoid entries", () => {
    usePrefsStore.getState().addAvoid("   ");
    expect(usePrefsStore.getState().avoidList).toEqual([]);
  });

  it("removes an avoid entry", () => {
    usePrefsStore.getState().addAvoid("peanuts");
    usePrefsStore.getState().addAvoid("shrimp");
    usePrefsStore.getState().removeAvoid("peanuts");
    expect(usePrefsStore.getState().avoidList).toEqual(["shrimp"]);
  });

  it("persists under dishcover.prefs.v1", () => {
    usePrefsStore.getState().toggleDietary("vegan");
    const raw = localStorage.getItem("dishcover.prefs.v1");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).state.dietary).toEqual(["vegan"]);
  });
});

describe("draft store", () => {
  it("starts empty with default meal settings", () => {
    const s = useDraftStore.getState();
    expect(s.ingredients).toEqual([]);
    expect(s.macroTarget).toBeUndefined();
    expect(s.mealSettings).toEqual(DEFAULT_MEAL_SETTINGS);
    expect(s.allowOtherIngredients).toBe(false);
  });

  it("sets each field independently", () => {
    useDraftStore.getState().setIngredients(["eggs", "spinach"]);
    useDraftStore.getState().setMacroTarget({ proteinG: 30 });
    useDraftStore.getState().setMealSettings({ guests: 4, time: "fast", cuisine: "italian" });
    useDraftStore.getState().setAllowOtherIngredients(true);

    const s = useDraftStore.getState();
    expect(s.ingredients).toEqual(["eggs", "spinach"]);
    expect(s.macroTarget).toEqual({ proteinG: 30 });
    expect(s.mealSettings).toEqual({ guests: 4, time: "fast", cuisine: "italian" });
    expect(s.allowOtherIngredients).toBe(true);
  });

  it("clearDraft resets every field back to defaults", () => {
    useDraftStore.getState().setIngredients(["eggs"]);
    useDraftStore.getState().setMacroTarget({ proteinG: 30 });
    useDraftStore.getState().setMealSettings({ guests: 4, time: "fast", cuisine: "italian" });
    useDraftStore.getState().setAllowOtherIngredients(true);

    useDraftStore.getState().clearDraft();

    const s = useDraftStore.getState();
    expect(s.ingredients).toEqual([]);
    expect(s.macroTarget).toBeUndefined();
    expect(s.mealSettings).toEqual(DEFAULT_MEAL_SETTINGS);
    expect(s.allowOtherIngredients).toBe(false);
  });

  it("persists under dishcover.draft.v1", () => {
    useDraftStore.getState().setIngredients(["eggs"]);
    const raw = localStorage.getItem("dishcover.draft.v1");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).state.ingredients).toEqual(["eggs"]);
  });
});

describe("isDraftNonEmpty", () => {
  const empty = {
    ingredients: [] as string[],
    macroTarget: undefined,
    mealSettings: DEFAULT_MEAL_SETTINGS,
    allowOtherIngredients: false,
  };

  it("is false for a fresh draft", () => {
    expect(isDraftNonEmpty(empty)).toBe(false);
  });

  it("is true when ingredients are captured", () => {
    expect(isDraftNonEmpty({ ...empty, ingredients: ["eggs"] })).toBe(true);
  });

  it("is true when a macro target is set", () => {
    expect(isDraftNonEmpty({ ...empty, macroTarget: { proteinG: 30 } })).toBe(true);
  });

  it("is true when allowOtherIngredients is toggled on", () => {
    expect(isDraftNonEmpty({ ...empty, allowOtherIngredients: true })).toBe(true);
  });

  it("is true when meal settings differ from the defaults", () => {
    expect(
      isDraftNonEmpty({ ...empty, mealSettings: { guests: 3, time: "medium", cuisine: "any" } })
    ).toBe(true);
  });
});
