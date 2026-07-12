import type { Recipe } from "./schemas";

// Cookbook filtering (issue #12). Pure helpers so the browsable library and
// its filter tabs stay testable independent of the store and React.

export const COOKBOOK_TABS = ["all", "favorites", "quick"] as const;
export type CookbookTab = (typeof COOKBOOK_TABS)[number];

/** A recipe is "quick" when it cooks in this many minutes or fewer. */
export const QUICK_MAX_MINUTES = 25;

const matches: Record<CookbookTab, (r: Recipe) => boolean> = {
  all: () => true,
  favorites: (r) => r.favorite,
  quick: (r) => r.timeMinutes <= QUICK_MAX_MINUTES,
};

/**
 * Recipes for the given tab, newest first. Sorting by `createdAt` here means
 * the screen shows newest-first regardless of the store's array order.
 */
export function filterByTab(recipes: Recipe[], tab: CookbookTab): Recipe[] {
  return recipes
    .filter(matches[tab])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
