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
let usePantryStore: typeof import("./store").usePantryStore;
let useStorageHealth: typeof import("./store").useStorageHealth;
let STORE_KEYS: typeof import("./store").STORE_KEYS;

const DEFAULT_MEAL_SETTINGS = { guests: 2, time: "medium", cuisine: "any" } as const;

beforeAll(async () => {
  stubLocalStorage();
  ({
    useRecipeStore,
    usePrefsStore,
    useDraftStore,
    usePantryStore,
    useStorageHealth,
    STORE_KEYS,
    isDraftNonEmpty,
  } = await import("./store"));
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
  usePantryStore.setState({ pantry: [] });
  useStorageHealth.setState({ failedKey: null });
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

// #42: the store is where normalisation actually has to bite — lib/pantry.ts
// being correct is not enough if the store bypasses it.
describe("pantry store", () => {
  it("stores a staple in canonical form", () => {
    usePantryStore.getState().addStaple("  Tomatoes ");

    expect(usePantryStore.getState().pantry).toEqual(["tomato"]);
  });

  it("does not add the same item twice under different forms", () => {
    const s = usePantryStore.getState();
    s.addStaple("tomatoes");
    s.addStaple("tomato");
    s.addStaple("TOMATO");

    expect(usePantryStore.getState().pantry).toEqual(["tomato"]);
  });

  it("ignores blank input", () => {
    usePantryStore.getState().addStaple("   ");

    expect(usePantryStore.getState().pantry).toEqual([]);
  });

  it("removes a staple", () => {
    const s = usePantryStore.getState();
    s.addStaple("salt");
    s.removeStaple("salt");

    expect(usePantryStore.getState().pantry).toEqual([]);
  });
});

// #40: quota failures used to vanish. These cover the wiring — that the
// guard is actually installed on the persisted stores and reports through
// the health store — which the lib/storage-guard.ts unit tests cannot see.
describe("storage health", () => {
  it("starts clean", () => {
    expect(useStorageHealth.getState().failedKey).toBeNull();
  });

  it("records the key whose write was rejected", () => {
    useStorageHealth.getState().reportQuotaExceeded(STORE_KEYS.recipes);

    expect(useStorageHealth.getState().failedKey).toBe(STORE_KEYS.recipes);
  });

  it("can be dismissed", () => {
    useStorageHealth.getState().reportQuotaExceeded(STORE_KEYS.pantry);
    useStorageHealth.getState().clearQuotaError();

    expect(useStorageHealth.getState().failedKey).toBeNull();
  });

  it("reports a real quota failure from a persisted store write", () => {
    // Make the backing store reject exactly the way a full one does. The
    // guard is wired at module scope, so patching the stub's setItem
    // exercises the real path from store.setState to the banner's state.
    const realSetItem = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = (key: string) => {
      if (key.startsWith("dishcover.")) {
        const err = new Error("full");
        err.name = "QuotaExceededError";
        throw err;
      }
    };

    try {
      usePantryStore.getState().addStaple("saffron");
    } finally {
      globalThis.localStorage.setItem = realSetItem;
    }

    // The staple survives in memory for this session...
    expect(usePantryStore.getState().pantry).toEqual(["saffron"]);
    // ...and the failure is no longer silent.
    expect(useStorageHealth.getState().failedKey).toBe(STORE_KEYS.pantry);
  });
});
