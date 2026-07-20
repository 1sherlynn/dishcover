// The zine's folio (#43).
//
// The masthead and page numbers were hardcoded per screen — "Dishcover
// Zine · No.07" and "Pg. 01" copy-pasted across Home, Cookbook, Pantry and
// Settings — while Recipe Detail computed its own from `artSeed % 40`. The
// conceit contradicted itself: a recipe could print No.23 in a zine whose
// every other page said No.07, or claim "Pg. 01" alongside Home.
//
// One issue number, one page map. Recipe pages still vary — that is the
// charm — but they sit in their own range after the standing screens.

/** The issue number, shared by every page of the zine. */
export const ZINE_NO = 7;

export type StandingScreen = "home" | "pantry" | "cookbook" | "new" | "settings";

/**
 * Page number for each standing screen. These are already in print, so they
 * are fixed. Typed as plain numbers rather than `as const` literals: callers
 * compare them against computed folios, which a literal union would reject.
 */
export const FOLIO: Record<StandingScreen, number> = {
  home: 1,
  pantry: 2,
  cookbook: 3,
  new: 4,
  settings: 7,
};

/** The zine's house style for a folio number: two digits, zero-padded. */
export function formatFolio(n: number): string {
  return n.toString().padStart(2, "0");
}

/** The masthead line, identical on every page. */
export function zineMasthead(): string {
  return `Dishcover Zine · No.${formatFolio(ZINE_NO)}`;
}

const LAST_STANDING_PAGE = Math.max(...Object.values(FOLIO));
/** Keeps recipe folios inside two digits: 08..99 given the current map. */
const RECIPE_PAGE_SPAN = 99 - LAST_STANDING_PAGE;

/**
 * The folio for a recipe's own page. Derived from its art seed so it is
 * stable per recipe and varies between them, but always lands after the
 * standing screens so it can never print a page number that already
 * belongs to Home or Settings.
 */
export function recipeFolio(artSeed: number): number {
  const offset = Math.abs(Math.trunc(artSeed)) % RECIPE_PAGE_SPAN;
  return LAST_STANDING_PAGE + 1 + offset;
}
