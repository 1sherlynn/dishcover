// The Pantry's canonical form (#42). Staples were stored as raw
// `trim().toLowerCase()`, so "tomatoes" and "tomato" persisted as two
// entries, both went to generation, and quick-add filtered on exact match
// only — a staple you already had still showed up as a suggestion.
//
// Scope, per the issue: a normalisation seam plus a same-item guard, not
// full linguistic normalisation. That means regular English plurals and a
// short stop-list of mass nouns that merely end in -s. Whether the pantry
// should have a controlled vocabulary at all is a design question and is
// deliberately not answered here.

/** Mass nouns / adjectives ending in -s that are not plurals. */
const NOT_PLURAL = new Set([
  "molasses",
  "hummus",
  "couscous",
  "asparagus",
  "watercress",
  "swiss",
  "bass",
  "gas",
  "grass",
  "cress",
  "miso paste",
]);

/** Below this length, stripping a suffix mangles the word rather than folding it. */
const MIN_STEM = 3;

/** Fold one word from plural to singular, best-effort for regular English. */
function singularise(word: string): string {
  if (NOT_PLURAL.has(word) || !word.endsWith("s")) return word;
  if (word.endsWith("ss")) return word; // cress, bass — never a plural marker

  // berries -> berry, anchovies -> anchovy
  if (word.endsWith("ies") && word.length > MIN_STEM + 2) {
    return `${word.slice(0, -3)}y`;
  }
  // tomatoes -> tomato, dishes -> dish, boxes -> box
  if (/(?:ch|sh|s|x|z|o)es$/.test(word) && word.length > MIN_STEM + 1) {
    return word.slice(0, -2);
  }
  // onions -> onion
  if (word.length > MIN_STEM) return word.slice(0, -1);

  return word;
}

/**
 * Canonical form of a staple: trimmed, lowercased, whitespace-collapsed,
 * with the head noun folded to singular. Idempotent.
 */
export function normaliseStaple(name: string): string {
  const clean = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (!clean) return "";
  if (NOT_PLURAL.has(clean)) return clean;

  // Only the last word carries the plural: "sun dried tomatoes".
  const words = clean.split(" ");
  words[words.length - 1] = singularise(words[words.length - 1]);
  return words.join(" ");
}

/**
 * The existing entry that means the same thing as `name`, in whatever
 * surface form it was stored — pantries written before this fix hold
 * plurals, so comparison normalises both sides.
 */
export function findExistingStaple(
  pantry: string[],
  name: string
): string | undefined {
  const target = normaliseStaple(name);
  if (!target) return undefined;
  return pantry.find((entry) => normaliseStaple(entry) === target);
}

/**
 * Add a staple in canonical form, guarding against the same item already
 * being present under another form. Returns the original array unchanged
 * (same reference) when there is nothing to do, so callers can skip a write.
 */
export function addStaple(pantry: string[], name: string): string[] {
  const clean = normaliseStaple(name);
  if (!clean) return pantry;
  if (findExistingStaple(pantry, clean)) return pantry;
  return [...pantry, clean];
}
