import { generateObject, type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import {
  GenerateRequestSchema,
  GeneratedRecipeSchema,
  type GenerateRequest,
} from "@/lib/schemas";
import { mockRecipe } from "@/lib/mock-recipe";
import { createRateGuard } from "@/lib/rate-guard";
import { applyKcalConsistency } from "@/lib/nutrition";

// Thin stateless proxy (ADR-0002): holds the key, rate-limits, caps spend.
// Guardrails are in-memory — per serverless instance, a courtesy barrier for
// a personal+friends deployment, not real abuse protection.

const guard = createRateGuard({
  perIpLimit: Number(process.env.GENERATIONS_PER_10MIN_PER_IP ?? 10),
  dailyCap: Number(process.env.DAILY_GENERATION_CAP ?? 100),
});

// Provider switch (ADR-0003): LLM_PROVIDER picks explicitly; otherwise the
// first configured key wins (groq → google). No key at all → mock mode.
// LLM_MODEL overrides the per-provider default.
function resolveModel(): LanguageModel | null {
  const provider =
    process.env.LLM_PROVIDER ??
    (process.env.GROQ_API_KEY
      ? "groq"
      : process.env.GOOGLE_GENERATIVE_AI_API_KEY
        ? "google"
        : "mock");

  switch (provider) {
    case "groq":
      // default must be a model on Groq's structured-outputs list (json_schema)
      return groq(process.env.LLM_MODEL ?? "openai/gpt-oss-120b");
    case "google":
      return google(process.env.LLM_MODEL ?? "gemini-2.5-flash");
    default:
      return null;
  }
}

function buildPrompt(req: GenerateRequest): { system: string; prompt: string } {
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
3. NEVER use anything from the avoid list. Honor every dietary preference strictly.
4. Require no equipment beyond what the user owns${req.equipment.length ? "" : " (assume a basic stove + oven kitchen)"}.
5. Every ingredient needs a realistic grams equivalent (for "2 tbsp olive oil", grams=27).
6. Per-serving nutrition must be self-consistent: kcal within ±10% of 4·proteinG + 4·carbsG + 9·fatG. Estimate micronutrients honestly.
7. ${macro ? `Aim close to the per-serving macro target (${macro}) with plausible food — never pad with unrealistic quantities. It is a soft target.` : "No macro target was set — just make it balanced and delicious."}
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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "INVALID_REQUEST" }, { status: 422 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { code: "INVALID_REQUEST", issues: parsed.error.issues },
      { status: 422 }
    );
  }
  const req = parsed.data;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const blocked = guard(ip);
  if (blocked) return Response.json({ code: blocked.code }, { status: blocked.status });

  // Mock mode: no key configured → deterministic sample, UI stays testable.
  const model = resolveModel();
  if (!model) {
    await new Promise((r) => setTimeout(r, 1200));
    return Response.json(mockRecipe(req));
  }

  const { system, prompt } = buildPrompt(req);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: GeneratedRecipeSchema,
        system,
        prompt:
          attempt === 0
            ? prompt
            : `${prompt}\n\nYour previous attempt failed schema validation. Follow the schema exactly.`,
      });

      // Self-consistency: recompute kcal from macros, correct if >10% off.
      object.nutrition.perServing = applyKcalConsistency(object.nutrition.perServing);

      return Response.json(object);
    } catch (err) {
      if (attempt === 1) {
        console.error("generation failed", err);
        return Response.json({ code: "GENERATION_FAILED" }, { status: 502 });
      }
    }
  }
  return Response.json({ code: "GENERATION_FAILED" }, { status: 502 });
}
