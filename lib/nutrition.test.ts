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

  it("returns 0 for all-zero macros", () => {
    expect(kcalFromMacros({ proteinG: 0, carbsG: 0, fatG: 0 })).toBe(0);
  });

  it("does not round fractional gram inputs", () => {
    expect(kcalFromMacros({ proteinG: 1.25, carbsG: 1.25, fatG: 1.1 })).toBeCloseTo(19.9, 10);
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

  it("keeps stated kcal exactly at the 10% tolerance boundary", () => {
    // computed = 460; 506 is exactly 10% off (not > tolerance)
    const n = per({ kcal: 506, proteinG: 30, carbsG: 40, fatG: 20 });
    expect(applyKcalConsistency(n).kcal).toBe(506);
  });

  it("corrects kcal just past the 10% tolerance boundary", () => {
    // computed = 460; 507 is just over 10% off
    const n = per({ kcal: 507, proteinG: 30, carbsG: 40, fatG: 20 });
    expect(applyKcalConsistency(n).kcal).toBe(460);
  });

  it("rounds the corrected kcal to the nearest integer", () => {
    // computed = 4*1.25 + 4*1.25 + 9*1.1 = 19.9; stated 100 is far outside tolerance
    const n = per({ kcal: 100, proteinG: 1.25, carbsG: 1.25, fatG: 1.1 });
    expect(applyKcalConsistency(n).kcal).toBe(20);
  });
});
