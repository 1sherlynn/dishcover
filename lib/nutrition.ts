import type { NutritionPerServing } from "./schemas";

/** kcal from macros: 4·protein + 4·carbs + 9·fat (Atwater factors). */
export function kcalFromMacros(n: Pick<NutritionPerServing, "proteinG" | "carbsG" | "fatG">): number {
  return 4 * n.proteinG + 4 * n.carbsG + 9 * n.fatG;
}

/** GENERATION-CONTRACT.md: stated kcal may drift this far from the macro-computed value. */
export const KCAL_TOLERANCE = 0.1;

/**
 * GENERATION-CONTRACT.md self-consistency rule: if stated kcal is >10% off
 * the macro-computed value, trust the macros and correct kcal rather than
 * re-rolling the generation.
 */
export function applyKcalConsistency(n: NutritionPerServing): NutritionPerServing {
  const computed = kcalFromMacros(n);
  if (computed <= 0) return n;
  if (Math.abs(n.kcal - computed) / computed > KCAL_TOLERANCE) {
    return { ...n, kcal: Math.round(computed) };
  }
  return n;
}
