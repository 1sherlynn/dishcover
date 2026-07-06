import { describe, it, expect } from "vitest";
import { applyKcalConsistency, kcalFromMacros } from "./nutrition";
import type { NutritionPerServing } from "./schemas";

function per(overrides: Partial<NutritionPerServing>): NutritionPerServing {
  return {
    kcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
    satFatG: 0,
    sodiumMg: 0,
    potassiumMg: 0,
    calciumMg: 0,
    ironMg: 0,
    vitaminCMg: 0,
    vitaminDMcg: 0,
    ...overrides,
  };
}

describe("kcalFromMacros", () => {
  it("applies Atwater factors 4/4/9", () => {
    expect(kcalFromMacros({ proteinG: 30, carbsG: 40, fatG: 20 })).toBe(460);
  });
});

describe("applyKcalConsistency", () => {
  it("keeps stated kcal when within 10% of computed", () => {
    // computed = 460; 480 is ~4.3% off
    const n = per({ kcal: 480, proteinG: 30, carbsG: 40, fatG: 20 });
    expect(applyKcalConsistency(n).kcal).toBe(480);
  });

  it("corrects kcal when more than 10% off computed", () => {
    // computed = 460; 600 is ~30% off
    const n = per({ kcal: 600, proteinG: 30, carbsG: 40, fatG: 20 });
    expect(applyKcalConsistency(n).kcal).toBe(460);
  });

  it("leaves all-zero macros untouched (no division by zero)", () => {
    const n = per({ kcal: 120 });
    expect(applyKcalConsistency(n).kcal).toBe(120);
  });

  it("does not mutate the input", () => {
    const n = per({ kcal: 600, proteinG: 30, carbsG: 40, fatG: 20 });
    applyKcalConsistency(n);
    expect(n.kcal).toBe(600);
  });
});
