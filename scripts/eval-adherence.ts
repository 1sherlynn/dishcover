import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveModel, runGenerationRaw } from "../lib/generation";
import { GenerateRequestSchema, type GenerateRequest } from "../lib/schemas";
import {
  evaluateRun,
  isDailyBudgetError,
  isRateLimitError,
  renderReport,
  summarize,
  type EvalRun,
} from "../lib/adherence";

// Macro-adherence eval (#7): fires a varied request matrix at the Generator
// seam (runGeneration with the live model — no dev server needed) and writes
// a markdown quality report. This is the tool for tuning the generation
// prompt; scoring lives in lib/adherence.ts.
//
// Run: npm run eval:adherence            (~22 min for all 20 on Groq free tier)
//      EVAL_LIMIT=3 npm run eval:adherence   (smoke run)
//
// Pacing: Groq's free tier allows 8000 TPM and pre-checks
// prompt + maxOutputTokens (~7.2k per request), so request starts are
// spaced EVAL_DELAY_MS apart (default 65s → one request per TPM window).
// The tier also has a DAILY budget (TPD): roughly two full runs a day.
// When TPD is hit the runner skips the remaining cases and still writes
// the report, marking them failed-as-skipped.

const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 65_000);
const OUTPUT_DIR = path.join(process.cwd(), "eval-output");

// Dated, append-only log of prompt changes driven by this eval. Rendered
// into every report so results are read against the prompt they measured.
const TUNING_LOG = [
  "2026-07-11: baseline — first full run against the Phase-2 prompt (rules 1-9, maxOutputTokens 6000). Result: 11/20 passed; carbs -32.9% mean (dominated by carb-less captures with an EMPTY pantry — unrepresentative, the standing pantry joins every real request), protein overshooting up to +48%.",
  "2026-07-11: change 1 — rule 7 now names the overshoot (two-sided adherence, 'closest plausible' when ingredients can't reach a macro); eval cases (except *-pantryless-*) now carry STAPLE_PANTRY so carb targets are physically reachable, matching real requests.",
  "2026-07-11: post-change run hit the free tier's DAILY budget (TPD) after 8 cases. Comparable window (runs 1-6): baseline 4/6 → post-change 5/6; hp-fast-chicken, the +47% protein overshoot that motivated change 1, now passes. Full 20-run confirmation pending quota reset.",
  "2026-07-11: eval v2 (post-review) — kcal drift now measured PRE-correction via runGenerationRaw (was structurally unable to fail); avoid matching catches word forms (peanuts → peanut butter); fast budget strictly <20m per the prompt; TPD skips and schema failures broken out of the failed count. Earlier kcal/avoid numbers are not comparable.",
];

/** Realistic standing pantry — real requests always carry one (gatherStandingInputs). */
const STAPLE_PANTRY = [
  "olive oil", "salt", "black pepper", "garlic", "onions",
  "rice", "pasta", "flour", "butter", "soy sauce",
];

const HIGH_PROTEIN = { proteinG: 45 };
const LOW_CARB = { proteinG: 40, carbsG: 15 };
const BALANCED = { proteinG: 30, carbsG: 45, fatG: 20 };

const meal = (
  time: GenerateRequest["mealSettings"]["time"],
  cuisine = "any",
  guests = 2
) => ({ guests, time, cuisine });

/** ~20 varied cases: macro targets × dietary × avoid lists × time budgets. */
const CASES: { id: string; request: unknown }[] = [
  { id: "hp-fast-chicken", request: { capturedIngredients: ["chicken breast", "broccoli"], macroTarget: HIGH_PROTEIN, mealSettings: meal("fast") } },
  { id: "hp-medium-beef-avoid", request: { capturedIngredients: ["minced beef", "bell pepper"], macroTarget: HIGH_PROTEIN, avoidList: ["cilantro", "peanuts"], mealSettings: meal("medium", "latin") } },
  { id: "hp-vegan-tofu", request: { capturedIngredients: ["tofu", "spinach"], macroTarget: HIGH_PROTEIN, dietary: ["vegan"], mealSettings: meal("medium", "asian") } },
  { id: "hp-long-salmon", request: { capturedIngredients: ["salmon", "potatoes"], macroTarget: HIGH_PROTEIN, mealSettings: meal("long", "nordic", 4) } },
  { id: "hp-fast-eggs-glutenfree", request: { capturedIngredients: ["eggs", "mushrooms"], macroTarget: HIGH_PROTEIN, dietary: ["gluten-free"], mealSettings: meal("fast") } },
  { id: "lc-fast-salmon", request: { capturedIngredients: ["salmon", "spinach"], macroTarget: LOW_CARB, mealSettings: meal("fast") } },
  { id: "lc-medium-chicken-avoid", request: { capturedIngredients: ["chicken breast", "carrots"], macroTarget: LOW_CARB, avoidList: ["mushrooms"], mealSettings: meal("medium") } },
  { id: "lc-vegan-tofu", request: { capturedIngredients: ["tofu", "broccoli"], macroTarget: LOW_CARB, dietary: ["vegan"], mealSettings: meal("medium", "asian") } },
  { id: "lc-long-beef", request: { capturedIngredients: ["minced beef", "tomatoes"], macroTarget: LOW_CARB, mealSettings: meal("long", "mediterranean") } },
  { id: "bal-fast-eggs", request: { capturedIngredients: ["eggs", "tomatoes"], macroTarget: BALANCED, mealSettings: meal("fast") } },
  { id: "bal-medium-chicken-guests4", request: { capturedIngredients: ["chicken breast", "potatoes"], macroTarget: BALANCED, mealSettings: meal("medium", "european", 4) } },
  { id: "bal-vegan-avoid", request: { capturedIngredients: ["tofu", "carrots"], macroTarget: BALANCED, dietary: ["vegan"], avoidList: ["peanuts", "sesame"], mealSettings: meal("medium", "asian") } },
  { id: "bal-long-salmon-allowother", request: { capturedIngredients: ["salmon"], macroTarget: BALANCED, allowOtherIngredients: true, mealSettings: meal("long") } },
  { id: "none-fast-mushrooms", request: { capturedIngredients: ["mushrooms", "spinach"], mealSettings: meal("fast") } },
  { id: "none-medium-beef", request: { capturedIngredients: ["minced beef", "potatoes"], mealSettings: meal("medium", "american") } },
  { id: "none-vegan-avoid", request: { capturedIngredients: ["broccoli", "tofu"], dietary: ["vegan"], avoidList: ["cilantro"], mealSettings: meal("medium") } },
  { id: "none-long-chicken-guests6", request: { capturedIngredients: ["chicken breast", "carrots", "potatoes"], mealSettings: meal("long", "middle eastern", 6) } },
  { id: "hp-fast-conflict-vegan-chicken", request: { capturedIngredients: ["chicken breast"], macroTarget: HIGH_PROTEIN, dietary: ["vegan"], mealSettings: meal("fast") } },
  { id: "lc-fast-pantryless-allowother", request: { capturedIngredients: ["eggs"], macroTarget: LOW_CARB, allowOtherIngredients: true, mealSettings: meal("fast", "italian") } },
  { id: "bal-medium-avoid-many", request: { capturedIngredients: ["salmon", "bell pepper"], macroTarget: BALANCED, avoidList: ["cilantro", "peanuts", "mushrooms"], mealSettings: meal("medium") } },
];

/** Next.js loads .env.local itself; this script runs outside Next, so mirror it. */
function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  loadEnvLocal();
  const model = resolveModel();
  if (!model) {
    console.error("No LLM key configured (GROQ_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY) — nothing to eval.");
    process.exit(1);
  }
  const modelId = typeof model === "string" ? model : model.modelId;

  const limit = Number(process.env.EVAL_LIMIT ?? CASES.length);
  const cases = CASES.slice(0, limit);
  const startedAt = new Date();
  console.log(`Eval: ${cases.length} runs against ${modelId}, ~${Math.round((cases.length * DELAY_MS) / 60_000)} min\n`);

  const runs: EvalRun[] = [];
  let dailyBudgetGone = false;
  for (const [index, { id, request }] of cases.entries()) {
    const parsed = GenerateRequestSchema.parse(
      id.includes("pantryless")
        ? request
        : { pantry: STAPLE_PANTRY, ...(request as object) }
    );

    if (dailyBudgetGone) {
      runs.push({ id, request: parsed, error: "skipped: daily token budget (TPD) exhausted" });
      continue;
    }
    if (index > 0) await sleep(DELAY_MS);

    let run: EvalRun = { id, request: parsed };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Raw (pre-kcal-correction) output — the metric the eval exists for.
        const recipe = await runGenerationRaw(parsed, model);
        run = { id, request: parsed, recipe, evaluation: evaluateRun(parsed, recipe) };
        break;
      } catch (err) {
        if (isDailyBudgetError(err)) {
          dailyBudgetGone = true;
          console.log("  daily token budget (TPD) exhausted — skipping remaining cases");
          run = { id, request: parsed, error: "daily token budget (TPD) exhausted" };
          break;
        }
        if (isRateLimitError(err) && attempt < 2) {
          console.log(`  ${id}: rate-limited, waiting ${DELAY_MS / 1000}s…`);
          await sleep(DELAY_MS);
          continue;
        }
        run = { id, request: parsed, error: String((err as Error)?.cause ?? err).slice(0, 200) };
        break;
      }
    }

    runs.push(run);
    const verdict = run.recipe ? (run.evaluation?.ok ? "✓ ok" : "✗ off-target") : `✗ ${run.error}`;
    console.log(`[${index + 1}/${cases.length}] ${id}: ${verdict}`);
  }

  const report = renderReport(summarize(runs), runs, {
    model: modelId,
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    tuningLog: TUNING_LOG,
  });

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const reportPath = path.join(OUTPUT_DIR, "adherence-report.md");
  writeFileSync(reportPath, report);
  writeFileSync(path.join(OUTPUT_DIR, "adherence-runs.json"), JSON.stringify(runs, null, 2));

  console.log(`\n${report}\nWritten to ${reportPath}`);
  const summary = summarize(runs);
  process.exitCode = summary.failed > 0 || summary.passed < summary.generated ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
