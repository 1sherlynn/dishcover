import type { GeneratedRecipe, GenerateRequest } from "./schemas";

// Served when no LLM key is configured, so the full UI stays testable
// (and demos cost nothing). Clearly labeled in the title.

export function mockRecipe(req: GenerateRequest): GeneratedRecipe {
  const stars = req.capturedIngredients.slice(0, 2);
  const starNames = stars.join(" & ") || "pantry";
  return {
    title: `Golden ${starNames[0].toUpperCase()}${starNames.slice(1)} Skillet (sample)`,
    description:
      "A warm one-pan supper built from what you had on hand. This is Dishcover's built-in sample recipe — add an LLM API key to generate for real.",
    tag: "Comfort",
    cuisine: req.mealSettings.cuisine === "any" ? "european" : req.mealSettings.cuisine,
    difficulty: "easy",
    timeMinutes: req.mealSettings.time === "fast" ? 18 : 35,
    baseServings: req.mealSettings.guests,
    ingredients: [
      { name: stars[0] ?? "chicken breast", quantity: 300, unit: "g", grams: 300, toBuy: false },
      { name: stars[1] ?? "spinach", quantity: 200, unit: "g", grams: 200, toBuy: false },
      { name: "olive oil", quantity: 2, unit: "tbsp", grams: 27, toBuy: false },
      { name: "garlic", quantity: 3, unit: "piece", grams: 9, toBuy: false },
      { name: "onions", quantity: 1, unit: "piece", grams: 110, toBuy: false },
      { name: "salt", quantity: 1, unit: "tsp", grams: 6, toBuy: false },
    ],
    steps: [
      { title: "Prepare the ingredients", body: "Rinse and roughly chop everything. Mince the garlic and slice the onion thin." },
      { title: "Warm the pan", body: "Set a wide skillet over medium-high heat and add the olive oil.", timerSeconds: 120 },
      { title: "Build the base", body: "Sweat the onion and garlic until translucent and fragrant.", timerSeconds: 180 },
      { title: "Cook the star", body: `Add the ${stars[0] ?? "main ingredient"} and cook, turning occasionally, until golden.`, timerSeconds: 360 },
      { title: "Bring it together", body: "Fold in the remaining ingredients, season with salt, and let everything mingle for a few minutes.", timerSeconds: 180 },
      { title: "Serve", body: "Taste, adjust the seasoning, and serve straight from the pan while hot." },
    ],
    nutrition: {
      perServing: {
        kcal: 385,
        proteinG: 36,
        carbsG: 12,
        fatG: 21,
        fiberG: 3.5,
        sugarG: 4,
        satFatG: 4.5,
        sodiumMg: 720,
        potassiumMg: 890,
        calciumMg: 95,
        ironMg: 3.2,
        vitaminCMg: 24,
        vitaminDMcg: 0.4,
      },
    },
  };
}
