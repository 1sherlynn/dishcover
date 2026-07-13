"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MacroTarget, MealSettings, Recipe } from "./schemas";

// Device-local persistence only (ADR-0002). Keys per docs/DATA-MODEL.md.

const RECIPE_CAP = 200;

interface RecipeState {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  toggleFavorite: (id: string) => void;
  removeRecipe: (id: string) => void;
}

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set) => ({
      recipes: [],
      addRecipe: (recipe) =>
        set((s) => {
          let next = [recipe, ...s.recipes];
          if (next.length > RECIPE_CAP) {
            // evict oldest non-favorites first
            const idx = next.map((r) => r.favorite).lastIndexOf(false);
            next = next.filter((_, i) => i !== (idx === -1 ? next.length - 1 : idx));
          }
          return { recipes: next };
        }),
      toggleFavorite: (id) =>
        set((s) => ({
          recipes: s.recipes.map((r) =>
            r.id === id ? { ...r, favorite: !r.favorite } : r
          ),
        })),
      removeRecipe: (id) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),
    }),
    {
      name: "dishcover.recipes.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// The Pantry (CONTEXT.md): staples the user always has at home. A standing
// list the generator may draw on freely without re-entry.

interface PantryState {
  pantry: string[]; // ingredient names, canonical lowercase
  addStaple: (name: string) => void;
  removeStaple: (name: string) => void;
}

export const usePantryStore = create<PantryState>()(
  persist(
    (set) => ({
      pantry: [],
      addStaple: (name) =>
        set((s) =>
          s.pantry.includes(name) ? s : { pantry: [...s.pantry, name] }
        ),
      removeStaple: (name) =>
        set((s) => ({ pantry: s.pantry.filter((x) => x !== name) })),
    }),
    {
      name: "dishcover.pantry.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Standing preferences (CONTEXT.md): Dietary Preference, Avoid List,
// Equipment — they join every Generation Request via the Generation Client.
// `theme` is reserved in the persisted shape (docs/DATA-MODEL.md) for a
// later issue; nothing reads it yet.

interface PrefsState {
  dietary: string[]; // from the fixed Dietary Preference chip set
  avoidList: string[]; // free text, canonical lowercase
  equipment: string[]; // from the fixed Equipment chip set
  theme: string;
  toggleDietary: (name: string) => void;
  toggleEquipment: (name: string) => void;
  addAvoid: (name: string) => void;
  removeAvoid: (name: string) => void;
}

const toggle = (list: string[], name: string) =>
  list.includes(name) ? list.filter((x) => x !== name) : [...list, name];

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      dietary: [],
      avoidList: [],
      equipment: [],
      theme: "riso",
      toggleDietary: (name) => set((s) => ({ dietary: toggle(s.dietary, name) })),
      toggleEquipment: (name) =>
        set((s) => ({ equipment: toggle(s.equipment, name) })),
      addAvoid: (name) =>
        set((s) => {
          const clean = name.trim().toLowerCase();
          if (!clean || s.avoidList.includes(clean)) return s;
          return { avoidList: [...s.avoidList, clean] };
        }),
      removeAvoid: (name) =>
        set((s) => ({ avoidList: s.avoidList.filter((x) => x !== name) })),
    }),
    {
      name: "dishcover.prefs.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// The New Recipe Draft (issue #8): the in-progress form, so an accidental
// refresh/navigation doesn't lose captured ingredients or choices. Cleared
// once a generation succeeds.

const DEFAULT_DRAFT_MEAL_SETTINGS: MealSettings = {
  guests: 2,
  time: "medium",
  cuisine: "any",
};

interface DraftState {
  ingredients: string[]; // canonical lowercase, as captured on screen
  macroTarget?: MacroTarget;
  mealSettings: MealSettings;
  allowOtherIngredients: boolean;
  setIngredients: (ingredients: string[]) => void;
  setMacroTarget: (target: MacroTarget | undefined) => void;
  setMealSettings: (settings: MealSettings) => void;
  setAllowOtherIngredients: (on: boolean) => void;
  clearDraft: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      ingredients: [],
      macroTarget: undefined,
      mealSettings: DEFAULT_DRAFT_MEAL_SETTINGS,
      allowOtherIngredients: false,
      setIngredients: (ingredients) => set({ ingredients }),
      setMacroTarget: (macroTarget) => set({ macroTarget }),
      setMealSettings: (mealSettings) => set({ mealSettings }),
      setAllowOtherIngredients: (allowOtherIngredients) => set({ allowOtherIngredients }),
      clearDraft: () =>
        set({
          ingredients: [],
          macroTarget: undefined,
          mealSettings: DEFAULT_DRAFT_MEAL_SETTINGS,
          allowOtherIngredients: false,
        }),
    }),
    {
      name: "dishcover.draft.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/** True once the draft holds anything worth restoring or clearing. */
export function isDraftNonEmpty(state: {
  ingredients: string[];
  macroTarget?: MacroTarget;
  mealSettings: MealSettings;
  allowOtherIngredients: boolean;
}): boolean {
  return (
    state.ingredients.length > 0 ||
    !!state.macroTarget ||
    state.allowOtherIngredients ||
    state.mealSettings.guests !== DEFAULT_DRAFT_MEAL_SETTINGS.guests ||
    state.mealSettings.time !== DEFAULT_DRAFT_MEAL_SETTINGS.time ||
    state.mealSettings.cuisine !== DEFAULT_DRAFT_MEAL_SETTINGS.cuisine
  );
}

/** Gate for store-driven UI so SSR markup never mismatches localStorage. */
import { useSyncExternalStore } from "react";
const subscribeNoop = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}
