import { generateObject, type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import {
  GeneratedRecipeSchema,
  type GeneratedRecipe,
  type GenerateRequest,
} from "./schemas";
import { applyKcalConsistency } from "./nutrition";

// The Generator (CONTEXT.md): turns a Generation Request into a Recipe,
// honoring the standing rules. The model is injected — the seam has two
// adapters: a live provider in production, MockLanguageModelV2 in tests
// (ADR-0003). Recipe-specific by design; Scan gets its own module.

export class GenerationFailedError extends Error {
  constructor(cause?: unknown) {
    super("generation failed after retry");
    this.name = "GenerationFailedError";
    this.cause = cause;
  }
}

// Provider switch (ADR-0003): LLM_PROVIDER picks explicitly; otherwise the
// first configured key wins (groq → google). No key at all → null (the
// route serves the built-in sample instead — mock mode stays outside the
// Generator's seam). Groq default must support json_schema output.
export function resolveModel(): LanguageModel | null {
  const provider =
    process.env.LLM_PROVIDER ??
    (process.env.GROQ_API_KEY
      ? "groq"
      : process.env.GOOGLE_GENERATIVE_AI_API_KEY
        ? "google"
        : "mock");

  switch (provider) {
    case "groq":
      return groq(process.env.LLM_MODEL ?? "openai/gpt-oss-120b");
    case "google":
      return google(process.env.LLM_MODEL ?? "gemini-2.5-flash");
    default:
      return null;
  }
}

/** Internal seam: the Generator's rules as prompt text. Exported for its tests. */
export function buildPrompt(req: GenerateRequest): { system: string; prompt: string } {
  const time =
    req.mealSettings.time === "fast"
      ? "under 20 minutes"
      : req.mealSettings.time === "medium"
        ? "20-45 minutes"
        : "45+ minutes is fine";

  const macro = req.macroTarget
    ? Object.entries(req.macroTarget)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k.replace("G", "")} ~${v}g`)
        .join(", ")
    : null;

  const system = `You are Dishcover's recipe developer: a warm, pragmatic home-cooking expert with a nutritionist's rigor.

Rules (non-negotiable):
1. Build the dish AROUND the captured ingredients — they are the stars.
2. The pantry list is freely available support. ${req.allowOtherIngredients ? "You may add a FEW extra ingredients beyond captured+pantry, but every extra must have toBuy=true." : "Use ONLY captured ingredients + pantry (plus water). Every ingredient gets toBuy=false."}
3. NEVER use anything from the avoid list. Honor every dietary preference strictly — it outranks rule 1: if a captured ingredient conflicts with a dietary preference or the avoid list, SUBSTITUTE a compliant alternative that keeps the spirit of the dish. Never refuse to generate.
4. Require no equipment beyond what the user owns${req.equipment.length ? "" : " (assume a basic stove + oven kitchen)"}.
5. Every ingredient needs a realistic grams equivalent (for "2 tbsp olive oil", grams=27).
6. Per-serving nutrition must be self-consistent: kcal within ±10% of 4·proteinG + 4·carbsG + 9·fatG. Estimate micronutrients honestly.
7. ${macro ? `Aim close to the per-serving macro target (${macro}) with plausible food — never pad with unrealistic quantities. Close means from both sides: to overshoot a macro is as much a miss as to undershoot it. If the available ingredients cannot plausibly reach a macro, land on the closest plausible value. It is a soft target.` : "No macro target was set — just make it balanced and delicious."}
8. Respect the time budget. Add timerSeconds only to steps with a real wait/cook duration.
9. Write ingredient names in canonical lowercase. The recipe title is in Title Case. Steps get short imperative titles.`;

  const prompt = `Create one recipe.

Captured ingredients (the stars): ${req.capturedIngredients.join(", ")}
Pantry staples available: ${req.pantry.length ? req.pantry.join(", ") : "none listed"}
Avoid list: ${req.avoidList.length ? req.avoidList.join(", ") : "none"}
Dietary preferences: ${req.dietary.length ? req.dietary.join(", ") : "none"}
Equipment owned: ${req.equipment.length ? req.equipment.join(", ") : "basic stove and oven"}
Servings: ${req.mealSettings.guests} · Time budget: ${time} · Cuisine: ${req.mealSettings.cuisine}`;

  return { system, prompt };
}

/**
 * The attempts loop without the kcal correction — what the model actually
 * said. The adherence eval (#7) scores this; product code wants
 * runGeneration.
 */
export async function runGenerationRaw(
  request: GenerateRequest,
  model: LanguageModel
): Promise<GeneratedRecipe> {
  const { system, prompt } = buildPrompt(request);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: GeneratedRecipeSchema,
        // Reasoning models (gpt-oss on Groq) spend hidden reasoning tokens
        // from this budget before emitting JSON; the provider default is too
        // small and truncates the recipe mid-payload (finishReason 'length').
        // Ceiling: Groq's free tier pre-checks prompt + maxOutputTokens
        // against an 8000 TPM limit, so this plus the prompt must stay under.
        maxOutputTokens: 6000,
        system,
        prompt:
          attempt === 0
            ? prompt
            : `${prompt}\n\nYour previous attempt failed schema validation. Follow the schema exactly.`,
      });

      return object;
    } catch (err) {
      lastError = err;
    }
  }
  throw new GenerationFailedError(lastError);
}

export async function runGeneration(
  request: GenerateRequest,
  model: LanguageModel
): Promise<GeneratedRecipe> {
  const object = await runGenerationRaw(request, model);
  object.nutrition.perServing = applyKcalConsistency(object.nutrition.perServing);
  return object;
}
