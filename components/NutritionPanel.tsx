"use client";

import type { Recipe } from "@/lib/schemas";

// Riso Nutrition Breakdown (DESIGN-SYSTEM.md §Recipe Detail): the MACROS
// panel on a teal wash — kcal donut in spot inks, per-macro rows with square
// swatches and "42g / 40g" target values, a hand-written verdict when a
// Macro Target was set — followed by the micronutrient dotted list with an
// ~ESTIMATED stamp.

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

// Macro Targets are soft: distance bands per DESIGN-SYSTEM.md
function band(actual: number, target: number): "positive" | "warn" | "danger" {
  const off = Math.abs(actual - target) / target;
  return off <= 0.1 ? "positive" : off <= 0.25 ? "warn" : "danger";
}

const BAND_COLOR = {
  positive: "var(--th-positive)",
  warn: "var(--th-warn)",
  danger: "var(--th-danger)",
};

const VERDICT = {
  positive: "right on target ✦",
  warn: "close enough to call it ✦",
  danger: "we'll aim closer next time ✦",
};

function Donut({ shares, kcal }: { shares: number[]; kcal: number }) {
  const C = 2 * Math.PI * 40;
  const colors = ["var(--th-highlight)", "var(--th-warn)", "var(--th-positive)"];
  let offset = 0;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {shares.map((s, i) => {
          const dash = `${s * C} ${C}`;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={colors[i]}
              strokeWidth="13"
              strokeDasharray={dash}
              strokeDashoffset={-offset * C}
            />
          );
          offset += s;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-2xl font-bold leading-none">{Math.round(kcal)}</p>
          <p className="zine-label mt-0.5 text-[9px] text-ink-soft">kcal</p>
        </div>
      </div>
    </div>
  );
}

export function NutritionPanel({ recipe }: { recipe: Recipe }) {
  const n = recipe.nutrition.perServing;
  const kcalFromMacros = 4 * n.proteinG + 4 * n.carbsG + 9 * n.fatG || 1;
  const macroTarget = recipe.nutrition.macroTarget;

  const macros = [
    { label: "Protein", grams: n.proteinG, kcal: 4 * n.proteinG, color: "var(--th-highlight)", target: macroTarget?.proteinG },
    { label: "Carbs", grams: n.carbsG, kcal: 4 * n.carbsG, color: "var(--th-warn)", target: macroTarget?.carbsG },
    { label: "Fat", grams: n.fatG, kcal: 9 * n.fatG, color: "var(--th-positive)", target: macroTarget?.fatG },
  ];

  const targeted = macros.filter((m) => typeof m.target === "number" && m.target! > 0);
  const worst = targeted.length
    ? targeted.reduce<"positive" | "warn" | "danger">((acc, m) => {
        const b = band(m.grams, m.target!);
        const rank = { positive: 0, warn: 1, danger: 2 };
        return rank[b] > rank[acc] ? b : acc;
      }, "positive")
    : null;

  return (
    <div>
      {/* MACROS panel on teal wash */}
      <div className="rise relative border-2 border-ink bg-wash p-5 shadow-card">
        <span className="zine-label absolute -top-3 left-4 bg-pop px-2.5 py-1 text-white">
          Macros · per serving
        </span>

        <div className="mt-2 flex items-center gap-5">
          <Donut shares={macros.map((m) => m.kcal / kcalFromMacros)} kcal={n.kcal} />
          <dl className="min-w-0 flex-1">
            {macros.map((m) => (
              <div
                key={m.label}
                className="flex items-baseline justify-between gap-2 border-b border-ink/15 py-2 last:border-b-0"
              >
                <dt className="zine-label flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 border border-ink"
                    style={{ background: m.color }}
                    aria-hidden
                  />
                  {m.label}
                </dt>
                <dd className="whitespace-nowrap font-display text-xl font-bold">
                  {Math.round(m.grams)}g
                  {typeof m.target === "number" && m.target > 0 && (
                    <span
                      className="ml-1 font-body text-xs font-bold"
                      style={{ color: BAND_COLOR[band(m.grams, m.target)] }}
                    >
                      / {Math.round(m.target)}g
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {worst && (
          <p className="font-hand mt-3 text-xl leading-none text-highlight">
            {VERDICT[worst]}
          </p>
        )}
      </div>

      {/* micronutrients */}
      {/* (#39) These are per serving like the macros above, and equally
          invariant when the servings scaler moves. The MACROS panel says so;
          this list said nothing, which is half a label. */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="zine-label">Common micronutrients · per serving</h2>
        <span className="stamp zine-label text-[9px]">~ Estimated</span>
      </div>
      <dl className="mt-2">
        {MICROS.map(({ key, label, unit }, i) => (
          <div
            key={key}
            className="rise flex items-baseline justify-between gap-3 border-b border-ink/15 py-2.5"
            style={{ "--rise-delay": `${i * 35}ms` } as React.CSSProperties}
          >
            <dt className="font-bold">{label}</dt>
            <span className="grow border-b border-dotted border-ink/30" aria-hidden />
            <dd className="font-display text-lg font-bold">
              {n[key] < 10 ? n[key].toFixed(1) : Math.round(n[key])}
              <span className="ml-1 font-body text-xs font-bold text-ink-soft">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs font-bold leading-relaxed text-ink-soft">
        Estimates from the recipe model — good for steering a meal, not for
        medical decisions.
      </p>
    </div>
  );
}
