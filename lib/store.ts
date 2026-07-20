"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MacroTarget, MealSettings, Recipe } from "./schemas";
import { addStaple as addStapleTo } from "./pantry";
import { createGuardedStorage } from "./storage-guard";

// Device-local persistence only (ADR-0002). Keys per docs/DATA-MODEL.md.

const RECIPE_CAP = 200;

/** The persisted store keys, per docs/DATA-MODEL.md. */
export const STORE_KEYS = {
  recipes: "dishcover.recipes.v1",
  pantry: "dishcover.pantry.v1",
  prefs: "dishcover.prefs.v1",
  draft: "dishcover.draft.v1",
} as const;

export type StoreKey = (typeof STORE_KEYS)[keyof typeof STORE_KEYS];

// Storage health (#40). localStorage has no room left and the write just
// failed — the data is still in memory for this session, but it will not
// survive a reload. RECIPE_CAP above bounds the recipe *count*; this is
// about bytes, which run out first. Not itself persisted: writing it
// could fail too.
interface StorageHealthState {
  /** The store key whose last write was rejected for want of quota. */
  failedKey: string | null;
  reportQuotaExceeded: (key: string) => void;
  clearQuotaError: () => void;
}

export const useStorageHealth = create<StorageHealthState>()((set) => ({
  failedKey: null,
  reportQuotaExceeded: (key) => set({ failedKey: key }),
  clearQuotaError: () => set({ failedKey: null }),
}));

/**
 * localStorage for a persisted store, with quota failures routed to the
 * health store instead of disappearing. Every persisted store uses this.
 */
const guardedLocalStorage = () =>
  createGuardedStorage(localStorage, (key) =>
    useStorageHealth.getState().reportQuotaExceeded(key)
  );

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
      name: STORE_KEYS.recipes,
      version: 1,
      storage: createJSONStorage(guardedLocalStorage),
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
      // Normalisation and the same-item guard live in lib/pantry.ts (#42);
      // addStapleTo returns the same array reference when there's nothing
      // to do, so an already-held staple costs no write.
      addStaple: (name) =>
        set((s) => {
          const pantry = addStapleTo(s.pantry, name);
          return pantry === s.pantry ? s : { pantry };
        }),
      removeStaple: (name) =>
        set((s) => ({ pantry: s.pantry.filter((x) => x !== name) })),
    }),
    {
      name: STORE_KEYS.pantry,
      // v2 (#42): staples are stored in canonical singular form. Pantries
      // written at v1 hold plurals ("tomatoes"), so fold them once on read
      // rather than normalising on every comparison forever. Deduping is
      // part of the migration: "tomato" and "tomatoes" collapse to one.
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as PantryState;
        if (version >= 2) return state;
        return {
          ...state,
          pantry: (state?.pantry ?? []).reduce<string[]>(
            (acc, name) => addStapleTo(acc, name),
            []
          ),
        };
      },
      storage: createJSONStorage(guardedLocalStorage),
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
      name: STORE_KEYS.prefs,
      version: 1,
      storage: createJSONStorage(guardedLocalStorage),
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
      name: STORE_KEYS.draft,
      version: 1,
      storage: createJSONStorage(guardedLocalStorage),
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
