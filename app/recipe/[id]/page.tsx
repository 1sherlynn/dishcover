"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartButton } from "@/components/ui";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { useRecipeStore, useHydrated } from "@/lib/store";
import { NutritionPanel } from "@/components/NutritionPanel";
import type { Unit } from "@/lib/schemas";

const TABS = ["Ingredients", "Steps", "Nutrition"] as const;
type Tab = (typeof TABS)[number];

function formatQty(quantity: number, unit: Unit): string {
  const q = Math.round(quantity * 4) / 4; // quarter precision for tbsp etc.
  const u = unit === "piece" ? (q === 1 ? "piece" : "piece(s)") : unit;
  return `${q} ${u}`;
}

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const hydrated = useHydrated();
  const recipe = useRecipeStore((s) => s.recipes.find((r) => r.id === id));
  const toggleFavorite = useRecipeStore((s) => s.toggleFavorite);
  const removeRecipe = useRecipeStore((s) => s.removeRecipe);
  const [tab, setTab] = useState<Tab>("Ingredients");
  const [servings, setServings] = useState<number | null>(null);

  if (!hydrated) return null;
  if (!recipe) {
    return (
      <main className="grid min-h-[60dvh] place-items-center text-center">
        <div>
          <h1 className="text-3xl font-semibold">Recipe not found</h1>
          <Link href="/" className="mt-4 inline-block font-bold text-highlight underline">
            Back to my recipes
          </Link>
        </div>
      </main>
    );
  }

  const n = servings ?? recipe.baseServings;
  const factor = n / recipe.baseServings;

  return (
    <main>
      <div className="rise relative -mx-5 -mt-6 md:-mx-6">
        <PlaceholderArt seed={recipe.artSeed} className="h-56 w-full object-cover md:h-64" />
        <div className="absolute inset-x-5 top-5 flex justify-between md:inset-x-6">
          <Link
            href="/"
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full bg-surface/85 shadow-card backdrop-blur"
          >
            ←
          </Link>
          <div className="flex gap-2">
            <HeartButton filled={recipe.favorite} onClick={() => toggleFavorite(recipe.id)} />
            <button
              type="button"
              aria-label="Delete recipe"
              onClick={() => {
                if (confirm("Delete this recipe?")) {
                  removeRecipe(recipe.id);
                  router.push("/");
                }
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-surface/85 text-ink-soft shadow-card backdrop-blur transition-colors hover:text-danger"
            >
              🗑
            </button>
          </div>
        </div>
      </div>

      <header className="rise mt-5" style={{ "--rise-delay": "60ms" } as React.CSSProperties}>
        <span className="rounded-control bg-ink-soft/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
          {recipe.tag}
        </span>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05]">{recipe.title}</h1>
        <p className="mt-3 flex gap-5 font-bold text-ink-soft">
          <span>⏱ {recipe.timeMinutes}&rsquo;</span>
          <span>🔥 {Math.round(recipe.nutrition.perServing.kcal)} kcal</span>
          <span className="capitalize">{recipe.difficulty}</span>
        </p>
        <p className="mt-4 leading-relaxed text-ink-soft">{recipe.description}</p>
      </header>

      <nav
        className="rise mt-6 flex rounded-control bg-surface-alt p-1"
        role="tablist"
        style={{ "--rise-delay": "120ms" } as React.CSSProperties}
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-control px-2 py-3 text-sm font-bold transition-colors ${
              tab === t ? "bg-ink text-bg" : "text-ink-soft"
            }`}
          >
            {t}
            <span className="ml-1.5 opacity-60">
              {t === "Ingredients"
                ? recipe.ingredients.length
                : t === "Steps"
                  ? recipe.steps.length
                  : ""}
            </span>
          </button>
        ))}
      </nav>

      <section className="mt-6 pb-10">
        {tab === "Ingredients" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
                For {n}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Fewer servings"
                  onClick={() => setServings(Math.max(1, n - 1))}
                  className="grid h-10 w-10 place-items-center rounded-full bg-surface text-lg font-bold shadow-card active:scale-90"
                >
                  −
                </button>
                <span className="w-6 text-center font-display text-xl font-semibold">{n}</span>
                <button
                  type="button"
                  aria-label="More servings"
                  onClick={() => setServings(Math.min(12, n + 1))}
                  className="grid h-10 w-10 place-items-center rounded-full bg-surface text-lg font-bold shadow-card active:scale-90"
                >
                  +
                </button>
              </div>
            </div>
            <ul className="mt-4">
              {recipe.ingredients.map((ing, i) => (
                <li
                  key={`${ing.name}-${i}`}
                  className="rise flex items-baseline justify-between gap-3 border-b border-ink/10 py-3.5"
                  style={{ "--rise-delay": `${i * 45}ms` } as React.CSSProperties}
                >
                  <span className="font-display text-lg font-semibold">
                    {formatQty(ing.quantity * factor, ing.unit)}
                  </span>
                  <span className="border-b border-dotted border-ink/20 grow" aria-hidden />
                  <span className="font-semibold text-ink-soft">
                    {ing.name}
                    {ing.toBuy && (
                      <span className="ml-2 rounded-control bg-warn/20 px-2 py-0.5 text-xs font-bold text-ink">
                        to buy
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === "Steps" && (
          <ol className="space-y-3">
            {recipe.steps.map((step, i) => (
              <li
                key={i}
                className="rise flex gap-4 rounded-card bg-surface-alt p-5"
                style={{ "--rise-delay": `${i * 55}ms` } as React.CSSProperties}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-soft font-display font-semibold text-bg">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-baseline gap-x-3 text-lg font-semibold">
                    {step.title}
                    {step.timerSeconds && (
                      <span className="rounded-control bg-surface px-2.5 py-0.5 font-body text-xs font-bold text-ink-soft">
                        ⏱ {Math.round(step.timerSeconds / 60)}&rsquo;
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {tab === "Nutrition" && <NutritionPanel recipe={recipe} />}
      </section>
    </main>
  );
}
