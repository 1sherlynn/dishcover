"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Recipe } from "./schemas";

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
