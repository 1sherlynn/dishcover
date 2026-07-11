import type { GeneratedRecipe, GenerateRequest, MacroTarget } from "./schemas";
import { kcalFromMacros, KCAL_TOLERANCE } from "./nutrition";

// Adherence analysis (#7): pure scoring of one generation against its
// request, aggregation across runs, and the markdown report. The eval
// runner (scripts/eval-adherence.ts) is I/O glue around this seam.
//
// Score runGenerationRaw output: runGeneration corrects kcal >10% off its
// macros, which would make the kcal metric structurally unable to fail.

export { KCAL_TOLERANCE };

/** A macro miss beyond this fraction of the target fails the run. Soft target, generous bound. */
export const MACRO_TOLERANCE = 0.2;

// Max minutes per budget. Mirrors the prompt's rule-8 wording in
// lib/generation.ts ("under 20 minutes" / "20-45 minutes") — keep in sync.
const TIME_BUDGET_MAX: Record<GenerateRequest["mealSettings"]["time"], number> = {
  fast: 19,
  medium: 45,
  long: Infinity,
};

type MacroKey = keyof MacroTarget;
const MACRO_KEYS: MacroKey[] = ["proteinG", "carbsG", "fatG"];

export interface RunEvaluation {
  /** Signed fraction off target per targeted macro: -0.25 = 25% under. */
  macroDeltas: Partial<Record<MacroKey, number>>;
  /** |stated kcal − macro-computed kcal| / computed. */
  kcalDeltaPct: number;
  /** Avoid-list terms found in ingredient names or step text. */
  avoidViolations: string[];
  timeViolation: boolean;
  /** No violations, kcal consistent, every targeted macro within tolerance. */
  ok: boolean;
}

export interface EvalRun {
  id: string;
  request: GenerateRequest;
  recipe?: GeneratedRecipe;
  error?: string;
  evaluation?: RunEvaluation;
}

export interface MacroBias {
  mean: number;
  n: number;
}

export interface EvalSummary {
  total: number;
  generated: number;
  failed: number;
  /** Of `failed`: never attempted (daily quota exhausted) — not a quality signal. */
  skipped: number;
  /** Of `failed`: the model's payload failed schema validation on both attempts. */
  schemaFailures: number;
  passed: number;
  macroBias: Partial<Record<MacroKey, MacroBias>>;
  worstMacroMisses: { id: string; macro: MacroKey; delta: number }[];
  worstKcal: { id: string; deltaPct: number }[];
  avoidViolationRuns: { id: string; terms: string[] }[];
  timeViolationRuns: {
    id: string;
    timeMinutes: number;
    budget: GenerateRequest["mealSettings"]["time"];
  }[];
}

/** Per-minute rate limit — worth retrying after a pause. */
export const isRateLimitError = (err: unknown) =>
  /rate.?limit|tokens per minute|TPM|429|413/i.test(String((err as Error)?.cause ?? err));

/** Daily budget (TPD) exhaustion — terminal until the quota resets. */
export const isDailyBudgetError = (err: unknown) =>
  /tokens per day|TPD/i.test(String((err as Error)?.cause ?? err));

export function evaluateRun(request: GenerateRequest, recipe: GeneratedRecipe): RunEvaluation {
  const per = recipe.nutrition.perServing;

  const macroDeltas: Partial<Record<MacroKey, number>> = {};
  for (const key of MACRO_KEYS) {
    const target = request.macroTarget?.[key];
    if (typeof target === "number" && target > 0) {
      macroDeltas[key] = (per[key] - target) / target;
    }
  }

  const computedKcal = kcalFromMacros(per);
  const kcalDeltaPct = computedKcal > 0 ? Math.abs(per.kcal - computedKcal) / computedKcal : 0;

  const haystack = [
    ...recipe.ingredients.map((i) => i.name),
    ...recipe.steps.map((s) => `${s.title} ${s.body}`),
  ]
    .join(" \n ")
    .toLowerCase();
  // Match word forms too: avoiding "peanuts" must flag "peanut butter".
  const avoidViolations = request.avoidList.filter((term) => {
    const t = term.toLowerCase();
    const stems = [t, t.replace(/es$/, ""), t.replace(/s$/, "")].filter((s) => s.length >= 3);
    return stems.some((stem) => haystack.includes(stem));
  });

  const timeViolation = recipe.timeMinutes > TIME_BUDGET_MAX[request.mealSettings.time];

  const ok =
    avoidViolations.length === 0 &&
    !timeViolation &&
    kcalDeltaPct <= KCAL_TOLERANCE &&
    Object.values(macroDeltas).every((d) => Math.abs(d) <= MACRO_TOLERANCE);

  return { macroDeltas, kcalDeltaPct, avoidViolations, timeViolation, ok };
}

export function summarize(runs: EvalRun[]): EvalSummary {
  const generated = runs.filter(
    (r): r is EvalRun & { recipe: GeneratedRecipe; evaluation: RunEvaluation } =>
      !!r.recipe && !!r.evaluation
  );

  const macroBias: Partial<Record<MacroKey, MacroBias>> = {};
  const misses: EvalSummary["worstMacroMisses"] = [];
  for (const key of MACRO_KEYS) {
    const deltas = generated
      .filter((r) => r.evaluation.macroDeltas[key] !== undefined)
      .map((r) => ({ id: r.id, delta: r.evaluation.macroDeltas[key]! }));
    if (deltas.length > 0) {
      macroBias[key] = {
        mean: deltas.reduce((sum, d) => sum + d.delta, 0) / deltas.length,
        n: deltas.length,
      };
      misses.push(...deltas.map((d) => ({ id: d.id, macro: key, delta: d.delta })));
    }
  }
  misses.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const worstKcal = generated
    .map((r) => ({ id: r.id, deltaPct: r.evaluation.kcalDeltaPct }))
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, 3);

  const failedRuns = runs.filter((r) => !r.recipe);
  return {
    total: runs.length,
    generated: generated.length,
    failed: failedRuns.length,
    skipped: failedRuns.filter((r) => /\bTPD\b|daily token budget/i.test(r.error ?? "")).length,
    schemaFailures: failedRuns.filter((r) => /schema/i.test(r.error ?? "")).length,
    passed: generated.filter((r) => r.evaluation.ok).length,
    macroBias,
    worstMacroMisses: misses.slice(0, 3),
    worstKcal,
    avoidViolationRuns: generated
      .filter((r) => r.evaluation.avoidViolations.length > 0)
      .map((r) => ({ id: r.id, terms: r.evaluation.avoidViolations })),
    timeViolationRuns: generated
      .filter((r) => r.evaluation.timeViolation)
      .map((r) => ({
        id: r.id,
        timeMinutes: r.recipe.timeMinutes,
        budget: r.request.mealSettings.time,
      })),
  };
}

export interface ReportMeta {
  model: string;
  startedAt: string;
  durationMs: number;
  tuningLog: string[];
}

const pct = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
const signedPct = (fraction: number) => (fraction > 0 ? `+${pct(fraction)}` : pct(fraction));

export function renderReport(summary: EvalSummary, runs: EvalRun[], meta: ReportMeta): string {
  const lines: string[] = [
    "# Macro-adherence report",
    "",
    `- **Model**: ${meta.model}`,
    `- **Started**: ${meta.startedAt}`,
    `- **Duration**: ${Math.round(meta.durationMs / 1000)}s`,
    `- **Runs**: ${summary.total} · generated ${summary.generated} · failed ${summary.failed} (skipped ${summary.skipped}, schema-invalid ${summary.schemaFailures}) · passed ${summary.passed}`,
    "",
    "## Macro bias (mean signed delta vs target)",
    "",
    "| Macro | Mean delta | Runs |",
    "|---|---|---|",
  ];

  for (const [macro, bias] of Object.entries(summary.macroBias)) {
    lines.push(`| ${macro} | ${signedPct(bias.mean)} | ${bias.n} |`);
  }
  if (Object.keys(summary.macroBias).length === 0) {
    lines.push("| — | no targeted runs | 0 |");
  }

  lines.push(
    "",
    "## Worst offenders",
    "",
    ...summary.worstMacroMisses.map(
      (m) => `- macro miss: \`${m.id}\` ${m.macro} ${signedPct(m.delta)}`
    ),
    ...summary.worstKcal.map((k) => `- kcal drift: \`${k.id}\` ${pct(k.deltaPct)}`),
    "",
    "## Violations",
    "",
    `- Avoid-list: ${
      summary.avoidViolationRuns.length === 0
        ? "none"
        : summary.avoidViolationRuns.map((v) => `\`${v.id}\` (${v.terms.join(", ")})`).join(", ")
    }`,
    `- Time budget: ${
      summary.timeViolationRuns.length === 0
        ? "none"
        : summary.timeViolationRuns
            .map((v) => `\`${v.id}\` (${v.timeMinutes}m on ${v.budget})`)
            .join(", ")
    }`,
    "",
    "## Per-run detail",
    "",
    "| Run | Outcome | Macro deltas | kcal drift | Time |",
    "|---|---|---|---|---|"
  );

  for (const run of runs) {
    if (!run.recipe || !run.evaluation) {
      lines.push(`| \`${run.id}\` | ✗ failed: ${run.error ?? "unknown"} | — | — | — |`);
      continue;
    }
    const deltas =
      Object.entries(run.evaluation.macroDeltas)
        .map(([k, d]) => `${k} ${signedPct(d)}`)
        .join(", ") || "—";
    lines.push(
      `| \`${run.id}\` | ${run.evaluation.ok ? "✓" : "✗"} | ${deltas} | ${pct(
        run.evaluation.kcalDeltaPct
      )} | ${run.recipe.timeMinutes}m/${run.request.mealSettings.time} |`
    );
  }

  lines.push("", "## Prompt tuning log", "", ...meta.tuningLog.map((entry) => `- ${entry}`), "");
  return lines.join("\n");
}
