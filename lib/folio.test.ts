import { describe, expect, it } from "vitest";
import { ZINE_NO, FOLIO, formatFolio, zineMasthead, recipeFolio } from "./folio";

// #43: "Dishcover Zine · No.07" and "Pg. 01" were hardcoded across Home,
// Cookbook, Pantry and Settings, while Recipe Detail *computed* its folio
// from `recipe.artSeed % 40` — so the zine conceit contradicted itself
// (a recipe could claim to be issue No.23 of a zine whose every other page
// said No.07). One issue number, one page map, here.

describe("formatFolio", () => {
  it("zero-pads to the zine's two-digit house style", () => {
    expect(formatFolio(1)).toBe("01");
    expect(formatFolio(7)).toBe("07");
  });

  it("leaves numbers that are already two digits alone", () => {
    expect(formatFolio(42)).toBe("42");
  });
});

describe("zineMasthead", () => {
  it("reads as one issue across every page", () => {
    expect(zineMasthead()).toBe(`Dishcover Zine · No.${formatFolio(ZINE_NO)}`);
  });
});

describe("FOLIO", () => {
  it("gives each standing screen a distinct page", () => {
    const pages = Object.values(FOLIO);
    expect(new Set(pages).size).toBe(pages.length);
  });

  it("keeps the page numbers already in print", () => {
    // These shipped; renumbering them would contradict earlier screenshots.
    expect(FOLIO.home).toBe(1);
    expect(FOLIO.pantry).toBe(2);
    expect(FOLIO.cookbook).toBe(3);
    expect(FOLIO.new).toBe(4);
    expect(FOLIO.settings).toBe(7);
  });
});

describe("recipeFolio", () => {
  it("is stable for a given recipe", () => {
    expect(recipeFolio(123)).toBe(recipeFolio(123));
  });

  it("varies between recipes, keeping the zine conceit alive", () => {
    const pages = new Set([0, 1, 2, 3, 40, 77].map(recipeFolio));
    expect(pages.size).toBeGreaterThan(1);
  });

  it("never collides with a standing screen's page", () => {
    // The old `artSeed % 40` could land on 1 and print "Pg. 01" on a
    // recipe — the same folio as Home. Recipe pages sit after the
    // standing set, always.
    const standing = new Set(Object.values(FOLIO));
    for (let seed = 0; seed < 500; seed++) {
      expect(standing.has(recipeFolio(seed))).toBe(false);
    }
  });

  it("stays within two digits so the folio never reflows", () => {
    for (let seed = 0; seed < 500; seed++) {
      expect(formatFolio(recipeFolio(seed))).toMatch(/^\d{2}$/);
    }
  });

  it("handles a zero seed", () => {
    expect(recipeFolio(0)).toBeGreaterThan(Math.max(...Object.values(FOLIO)));
  });
});
