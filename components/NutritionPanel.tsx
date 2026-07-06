"use client";

import type { Recipe } from "@/lib/schemas";

// The Dishcover differentiator: per-serving macro + micronutrient panel,
// plus target-vs-actual bars for each macro the user set a Macro Target
// for. No-target recipes render the plain panel unchanged.

const MICROS: { key: keyof Recipe["nutrition"]["perServing"]; label: string; unit: string }[] = [
  { key: "fiberG", label: "Fiber", unit: "g" },
  { key: "sugarG", label: "Sugar", unit: "g" },
  { key: "satFatG", label: "Saturated fat", unit: "g" },
  { key: "sodiumMg", label: "Sodium", unit: "mg" },
  { key: "potassiumMg", label: "Potassium", unit: "mg" },
  { key: "calciumMg", label: "Calcium", unit: "mg" },
  { key: "ironMg", label: "Iron", unit: "mg" },
  { key: "vitaminCMg", label: "Vitamin C", unit: "mg" },
  { key: "vitaminDMcg", label: "Vitamin D", unit: "µg" },
];

const MACRO_COLORS = {
  protein: "var(--th-positive)",
  carbs: "var(--th-accent)",
  fat: "var(--th-highlight)",
};

// Macro Targets are soft: color by distance band (DESIGN-SYSTEM.md) —
// within 10% on-target, within 25% near, beyond that far.
function bandColor(actual: number, target: number): string {
  const off = Math.abs(actual - target) / target;
  if (off <= 0.1) return "var(--th-positive)";
  if (off <= 0.25) return "var(--th-warn)";
  return "var(--th-danger)";
}

export function NutritionPanel({ recipe }: { recipe: Recipe }) {
  const n = recipe.nutrition.perServing;
  const kcalFromMacros = 4 * n.proteinG + 4 * n.carbsG + 9 * n.fatG || 1;

  const macros = [
    { label: "Protein", grams: n.proteinG, kcal: 4 * n.proteinG, color: MACRO_COLORS.protein },
    { label: "Carbs", grams: n.carbsG, kcal: 4 * n.carbsG, color: MACRO_COLORS.carbs },
    { label: "Fat", grams: n.fatG, kcal: 9 * n.fatG, color: MACRO_COLORS.fat },
  ];

  const macroTarget = recipe.nutrition.macroTarget;
  const targeted = [
    { label: "Protein", actual: n.proteinG, target: macroTarget?.proteinG },
    { label: "Carbs", actual: n.carbsG, target: macroTarget?.carbsG },
    { label: "Fat", actual: n.fatG, target: macroTarget?.fatG },
  ].filter(
    (m): m is { label: string; actual: number; target: number } =>
      typeof m.target === "number" && m.target > 0
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
          Per serving
        </p>
        <span
          className="rounded-control border border-dashed border-ink-soft/50 px-3 py-1 text-xs font-bold text-ink-soft"
          title="Values are model estimates, not lab measurements"
        >
          ~ Estimated
        </span>
      </div>

      <div className="rise mt-4 rounded-card bg-surface-alt p-6">
        <p className="font-display text-5xl font-semibold">
          {Math.round(n.kcal)}
          <span className="ml-2 font-body text-base font-bold text-ink-soft">kcal</span>
        </p>

        {/* stacked calorie-share bar */}
        <div className="mt-5 flex h-4 overflow-hidden rounded-control" aria-hidden>
          {macros.map((m, i) => (
            <span
              key={m.label}
              className="bar-fill h-full"
              style={{
                width: `${(m.kcal / kcalFromMacros) * 100}%`,
                background: m.color,
                "--rise-delay": `${i * 120}ms`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3">
          {macros.map((m) => (
            <div key={m.label} className="rounded-card bg-surface p-3 text-center">
              <dt className="flex items-center justify-center gap-1.5 text-xs font-bold text-ink-soft">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} aria-hidden />
                {m.label}
              </dt>
              <dd className="mt-1 font-display text-2xl font-semibold">
                {Math.round(m.grams)}g
              </dd>
              <dd className="text-xs font-bold text-ink-soft">
                {Math.round((m.kcal / kcalFromMacros) * 100)}%
              </dd>
            </div>
          ))}
        </dl>

        {targeted.length > 0 && (
          <div className="mt-6 border-t border-ink/10 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
              Vs your Macro Target
            </p>
            <dl className="mt-4 space-y-4">
              {targeted.map(({ label, actual, target }, i) => {
                const color = bandColor(actual, target);
                const scale = Math.max(actual, target) * 1.15 || 1;
                return (
                  <div key={label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs font-bold text-ink-soft">{label}</dt>
                      <dd className="font-display text-lg font-semibold">
                        {Math.round(actual)}g
                        <span className="font-body text-xs font-bold text-ink-soft">
                          {" "}/ {Math.round(target)}g target
                        </span>
                      </dd>
                    </div>
                    <div
                      className="relative mt-1.5 h-3 rounded-control bg-surface"
                      aria-hidden
                    >
                      <span
                        className="bar-fill absolute inset-y-0 left-0 rounded-control"
                        style={{
                          width: `${Math.min((actual / scale) * 100, 100)}%`,
                          background: color,
                          "--rise-delay": `${i * 120}ms`,
                        } as React.CSSProperties}
                      />
                      <span
                        className="absolute -inset-y-1 w-0.5 rounded-full bg-ink/70"
                        style={{ left: `${Math.min((target / scale) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </dl>
            <p className="mt-4 text-xs font-semibold text-ink-soft">
              Soft target — close counts as a win.
            </p>
          </div>
        )}
      </div>

      <dl className="mt-4">
        {MICROS.map(({ key, label, unit }, i) => (
          <div
            key={key}
            className="rise flex items-baseline justify-between gap-3 border-b border-ink/10 py-3"
            style={{ "--rise-delay": `${i * 40}ms` } as React.CSSProperties}
          >
            <dt className="font-semibold">{label}</dt>
            <span className="grow border-b border-dotted border-ink/20" aria-hidden />
            <dd className="font-display text-lg font-semibold">
              {n[key] < 10 ? n[key].toFixed(1) : Math.round(n[key])}
              <span className="ml-1 font-body text-xs font-bold text-ink-soft">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs font-semibold leading-relaxed text-ink-soft">
        Estimates from the recipe model — good for steering a meal, not for
        medical decisions. Database-computed values are on the roadmap.
      </p>
    </div>
  );
}
