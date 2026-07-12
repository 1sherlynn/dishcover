import { NutritionPanel } from "dishcover";

// Nutrition Breakdown (DESIGN-SYSTEM.md §Recipe Detail) — the MACROS panel on a
// teal wash: kcal donut in spot inks, per-macro rows with square swatches, and
// (when a Macro Target was set) "42g / 40g" target values plus a hand-written
// verdict. Followed by the micronutrient dotted list with an ~ESTIMATED stamp.

const perServing = {
  kcal: 520,
  proteinG: 38,
  carbsG: 42,
  fatG: 22,
  fiberG: 6,
  sugarG: 8,
  satFatG: 5,
  sodiumMg: 680,
  potassiumMg: 720,
  calciumMg: 90,
  ironMg: 3.2,
  vitaminCMg: 24,
  vitaminDMcg: 11,
};

const baseRecipe = {
  id: "demo-1",
  createdAt: "2026-07-11T00:00:00.000Z",
  favorite: false,
  artSeed: 7,
  title: "Miso-Glazed Salmon Bowl",
  description: "A glossy miso-glazed fillet over rice with quick-pickled cucumber.",
  tag: "Umami",
  cuisine: "japanese",
  difficulty: "easy" as const,
  timeMinutes: 30,
  baseServings: 2,
  ingredients: [],
  steps: [],
};

export function WithMacroTarget() {
  const recipe = {
    ...baseRecipe,
    nutrition: {
      perServing,
      estimated: true as const,
      macroTarget: { proteinG: 40, carbsG: 40, fatG: 20 },
    },
  };
  return (
    <div style={{ width: 420 }}>
      <NutritionPanel recipe={recipe} />
    </div>
  );
}

export function NoTarget() {
  const recipe = {
    ...baseRecipe,
    nutrition: { perServing, estimated: true as const },
  };
  return (
    <div style={{ width: 420 }}>
      <NutritionPanel recipe={recipe} />
    </div>
  );
}
