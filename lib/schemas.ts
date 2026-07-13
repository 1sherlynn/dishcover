import { z } from "zod";

// Schemas mirror docs/DATA-MODEL.md. GeneratedRecipeSchema is what the LLM
// must return (GENERATION-CONTRACT.md); Recipe adds client-owned fields.

export const UnitSchema = z.enum(["g", "ml", "piece", "tbsp", "tsp", "pinch"]);

export const RecipeIngredientSchema = z.object({
  name: z.string().min(1).describe("canonical lowercase ingredient name"),
  quantity: z.number().positive(),
  unit: UnitSchema,
  grams: z
    .number()
    .positive()
    .describe("realistic gram (or ml) equivalent of the quantity"),
  toBuy: z
    .boolean()
    .describe("true only if the user would need to buy this ingredient"),
});

export const RecipeStepSchema = z.object({
  title: z.string().min(1).describe("short imperative title, e.g. 'Cook the chicken'"),
  body: z.string().min(1),
  // Groq models emit `null` for steps without a timer; treat it as "no timer"
  // rather than a failed generation.
  timerSeconds: z
    .number()
    .int()
    .positive()
    .nullish()
    .transform((v) => v ?? undefined)
    .describe("only when the step has a real wait/cook duration"),
});

export const NutritionPerServingSchema = z.object({
  kcal: z.number().positive(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative(),
  sugarG: z.number().nonnegative(),
  satFatG: z.number().nonnegative(),
  sodiumMg: z.number().nonnegative(),
  potassiumMg: z.number().nonnegative(),
  calciumMg: z.number().nonnegative(),
  ironMg: z.number().nonnegative(),
  vitaminCMg: z.number().nonnegative(),
  vitaminDMcg: z.number().nonnegative(),
});

export const MacroTargetSchema = z.object({
  proteinG: z.number().positive().optional(),
  carbsG: z.number().positive().optional(),
  fatG: z.number().positive().optional(),
});

export const GeneratedRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).describe("2-3 warm, appetizing sentences"),
  tag: z.string().min(1).describe("one-word vibe, e.g. 'Fresh', 'Comfort', 'Zingy'"),
  cuisine: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  timeMinutes: z.number().int().positive(),
  baseServings: z.number().int().positive(),
  ingredients: z.array(RecipeIngredientSchema).min(1),
  steps: z.array(RecipeStepSchema).min(2),
  nutrition: z.object({
    perServing: NutritionPerServingSchema,
  }),
});

export const RecipeSchema = GeneratedRecipeSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  favorite: z.boolean(),
  artSeed: z.number(),
  nutrition: z.object({
    perServing: NutritionPerServingSchema,
    estimated: z.literal(true),
    macroTarget: MacroTargetSchema.optional(),
  }),
});

export const GenerateRequestSchema = z.object({
  capturedIngredients: z.array(z.string().min(1)).min(1).max(30),
  pantry: z.array(z.string()).max(100).default([]),
  avoidList: z.array(z.string()).max(100).default([]),
  dietary: z.array(z.string()).max(20).default([]),
  equipment: z.array(z.string()).max(20).default([]),
  mealSettings: z
    .object({
      guests: z.number().int().min(1).max(8),
      time: z.enum(["fast", "medium", "long"]),
      cuisine: z.string(),
    })
    .default({ guests: 2, time: "medium", cuisine: "any" }),
  macroTarget: MacroTargetSchema.optional(),
  allowOtherIngredients: z.boolean().default(false),
});

export type Unit = z.infer<typeof UnitSchema>;
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;
export type RecipeStep = z.infer<typeof RecipeStepSchema>;
export type NutritionPerServing = z.infer<typeof NutritionPerServingSchema>;
export type MacroTarget = z.infer<typeof MacroTargetSchema>;
export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// Scan (GENERATION-CONTRACT.md POST /api/scan): fridge/pantry photo →
// reviewed Captured Ingredients.

export const ScanRequestSchema = z.object({
  image: z.string().min(1).describe("base64 JPEG/WebP, optionally a data: URL"),
});

export const ScanIngredientSchema = z.object({
  name: z.string().min(1).describe("canonical lowercase food item name"),
  confidence: z.enum(["high", "low"]),
});

export const ScanResultSchema = z.object({
  ingredients: z.array(ScanIngredientSchema),
});

export type ScanRequest = z.infer<typeof ScanRequestSchema>;
export type ScanIngredient = z.infer<typeof ScanIngredientSchema>;
export type ScanResult = z.infer<typeof ScanResultSchema>;
