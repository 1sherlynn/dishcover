import { describe, expect, it } from "vitest";
import { normaliseStaple, findExistingStaple, addStaple } from "./pantry";

// #42: the pantry stored raw `trim().toLowerCase()`, so "tomatoes" and
// "tomato" both persisted, both went to generation, and the quick-add grid
// filtered on exact match only. The seam is a canonical form plus a
// same-item guard at add time. Full linguistic normalisation is out of
// scope (see the issue) — this handles the regular English plurals that
// actually show up in a pantry.

describe("normaliseStaple", () => {
  it("trims and lowercases", () => {
    expect(normaliseStaple("  Olive Oil  ")).toBe("olive oil");
  });

  it("collapses internal whitespace", () => {
    expect(normaliseStaple("tomato    paste")).toBe("tomato paste");
  });

  it("folds regular -s plurals to singular", () => {
    expect(normaliseStaple("onions")).toBe("onion");
    expect(normaliseStaple("carrots")).toBe("carrot");
  });

  it("folds -es plurals after a sibilant", () => {
    expect(normaliseStaple("tomatoes")).toBe("tomato");
    expect(normaliseStaple("potatoes")).toBe("potato");
    expect(normaliseStaple("dishes")).toBe("dish");
    expect(normaliseStaple("boxes")).toBe("box");
  });

  it("folds -ies plurals to -y", () => {
    expect(normaliseStaple("berries")).toBe("berry");
    expect(normaliseStaple("anchovies")).toBe("anchovy");
  });

  it("normalises only the head noun of a multi-word staple", () => {
    // "sun dried tomatoes" -> the last word carries the plural
    expect(normaliseStaple("sun dried tomatoes")).toBe("sun dried tomato");
  });

  it("leaves mass nouns ending in -s alone", () => {
    // these are not plurals; folding them would produce nonsense
    expect(normaliseStaple("molasses")).toBe("molasses");
    expect(normaliseStaple("hummus")).toBe("hummus");
    expect(normaliseStaple("couscous")).toBe("couscous");
    expect(normaliseStaple("swiss")).toBe("swiss");
  });

  it("does not fold short words down to nothing", () => {
    expect(normaliseStaple("as")).toBe("as");
    expect(normaliseStaple("is")).toBe("is");
  });

  it("is idempotent", () => {
    const once = normaliseStaple("Tomatoes");
    expect(normaliseStaple(once)).toBe(once);
  });

  it("returns empty for blank input", () => {
    expect(normaliseStaple("   ")).toBe("");
  });
});

describe("findExistingStaple", () => {
  it("finds an entry stored in a different surface form", () => {
    expect(findExistingStaple(["tomato", "salt"], "Tomatoes")).toBe("tomato");
  });

  it("finds an entry when the stored form is the plural", () => {
    // pantries written before this fix hold plurals; the guard must still match
    expect(findExistingStaple(["tomatoes", "salt"], "tomato")).toBe("tomatoes");
  });

  it("returns undefined when genuinely absent", () => {
    expect(findExistingStaple(["salt"], "pepper")).toBeUndefined();
  });

  it("does not confuse distinct staples that share a prefix", () => {
    expect(findExistingStaple(["oregano"], "orange")).toBeUndefined();
  });
});

describe("addStaple", () => {
  it("adds a new staple in canonical form", () => {
    expect(addStaple(["salt"], "  Tomatoes ")).toEqual(["salt", "tomato"]);
  });

  it("is a no-op when the same item is already there in another form", () => {
    const pantry = ["tomato"];
    expect(addStaple(pantry, "tomatoes")).toBe(pantry); // same reference
  });

  it("is a no-op for blank input", () => {
    const pantry = ["salt"];
    expect(addStaple(pantry, "  ")).toBe(pantry);
  });

  it("does not mutate the input", () => {
    const pantry = ["salt"];
    addStaple(pantry, "pepper");
    expect(pantry).toEqual(["salt"]);
  });
});
