"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartButton } from "@/components/ui";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { useRecipeStore, useHydrated } from "@/lib/store";
import { NutritionPanel } from "@/components/NutritionPanel";
import type { Unit } from "@/lib/schemas";
import { formatFolio, recipeFolio, zineMasthead } from "@/lib/folio";

// Recipe Detail as a Riso zine page (DESIGN-SYSTEM.md §Recipe Detail):
// one scroll, no tabs — framed dish art, sticker + stamp, ticket-stub meta,
// MACROS panel, serves + ingredients, method, micros, folio footer.

// The servings scaler's range. Ingredients rescale within it; nutrition does
// not — see the panel below.
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

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
  const [servings, setServings] = useState<number | null>(null);

  if (!hydrated) return null;
  if (!recipe) {
    return (
      <main className="grid min-h-[60dvh] place-items-center text-center">
        <div>
          <h1 className="text-3xl font-bold uppercase">Recipe not found</h1>
          <Link href="/" className="mt-4 inline-block font-bold text-pop underline">
            Back to my recipes
          </Link>
        </div>
      </main>
    );
  }

  const n = servings ?? recipe.baseServings;
  const factor = n / recipe.baseServings;
  const folio = formatFolio(recipeFolio(recipe.artSeed));

  return (
    <main>
      {/* zine masthead */}
      <header className="rise flex items-center justify-between">
        <Link
          href="/"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-control border-2 border-ink bg-surface font-bold"
        >
          ←
        </Link>
        <span className="zine-label text-ink-soft">{zineMasthead()}</span>
      </header>

      {/* framed dish art */}
      <div className="rise relative mt-5" style={{ "--rise-delay": "60ms" } as React.CSSProperties}>
        <div className="border-2 border-ink bg-surface p-2 shadow-card">
          <div className="border-4 border-dotted border-frame p-1.5">
            <PlaceholderArt seed={recipe.artSeed} className="w-full" />
          </div>
        </div>
        <span className="sticker zine-label absolute -right-2 -top-3">{recipe.tag}</span>
        <span className="stamp zine-label absolute -bottom-3 left-3">
          Serves {n} ✓
        </span>
        <div className="absolute right-3 top-8 flex flex-col gap-2">
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
            className="grid h-10 w-10 place-items-center rounded-control border-2 border-ink bg-surface text-ink-soft transition-colors hover:text-danger"
          >
            🗑
          </button>
        </div>
      </div>

      {/* title */}
      <header className="rise mt-8" style={{ "--rise-delay": "100ms" } as React.CSSProperties}>
        <h1 className="text-[2.4rem] font-extrabold uppercase leading-[0.95]">
          {recipe.title}
        </h1>
        <p className="mt-3 leading-relaxed text-ink-soft">{recipe.description}</p>
      </header>

      {/* ticket-stub meta row */}
      <div
        className="rise mt-5 grid grid-cols-3 gap-3 bg-surface-alt p-3"
        style={{ "--rise-delay": "140ms" } as React.CSSProperties}
      >
        {[
          { value: `${recipe.timeMinutes}'`, label: "time" },
          { value: Math.round(recipe.nutrition.perServing.kcal), label: "kcal / serving" },
          { value: recipe.difficulty, label: "level" },
        ].map(({ value, label }) => (
          <div
            key={label}
            className="border-2 border-dashed border-ink bg-surface px-2 py-2.5 text-center"
          >
            <p className="font-display text-xl font-bold capitalize leading-none">{value}</p>
            <p className="zine-label mt-1 text-[9px] text-ink-soft">{label}</p>
          </div>
        ))}
      </div>

      {/* macros + micros */}
      <section className="mt-8">
        <NutritionPanel recipe={recipe} />
      </section>

      {/* serves + ingredients */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <span className="stamp zine-label">Serves {n}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Fewer servings"
              onClick={() => setServings(Math.max(MIN_SERVINGS, n - 1))}
              className="grid h-10 w-10 place-items-center rounded-control border-2 border-ink bg-surface text-lg font-bold active:translate-y-0.5"
            >
              −
            </button>
            <button
              type="button"
              aria-label="More servings"
              onClick={() => setServings(Math.min(MAX_SERVINGS, n + 1))}
              className="grid h-10 w-10 place-items-center rounded-control border-2 border-ink bg-highlight text-lg font-bold text-white active:translate-y-0.5"
            >
              +
            </button>
          </div>
        </div>
        {/* (#39) Scaling changes how many servings you cook, not how big a
            serving is — so the ingredient list moves and the nutrition above
            correctly does not. Say so at the moment it stops being obvious. */}
        {n !== recipe.baseServings && (
          <p role="status" aria-live="polite" className="mt-3 text-xs font-bold leading-relaxed text-ink-soft">
            Ingredients scaled from {recipe.baseServings} to {n} servings.
            Nutrition above is per serving, so it stays the same.
          </p>
        )}

        <ul className="mt-5">
          {recipe.ingredients.map((ing, i) => (
            <li
              key={`${ing.name}-${i}`}
              className="rise flex items-baseline justify-between gap-3 border-b border-ink/15 py-3"
              style={{ "--rise-delay": `${i * 40}ms` } as React.CSSProperties}
            >
              <span className="font-bold capitalize">
                {ing.name}
                {ing.toBuy && <span className="stamp zine-label ml-2 text-[9px]">to buy</span>}
              </span>
              <span className="grow border-b border-dotted border-ink/30" aria-hidden />
              <span className="whitespace-nowrap font-display text-lg font-bold text-highlight">
                {formatQty(ing.quantity * factor, ing.unit)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* method */}
      <section className="mt-10">
        <h2 className="zine-label">Method · {recipe.steps.length} steps</h2>
        <ol className="mt-3 space-y-3">
          {recipe.steps.map((step, i) => (
            <li
              key={i}
              className="rise flex gap-4 border-2 border-ink bg-surface p-4"
              style={{ "--rise-delay": `${i * 50}ms` } as React.CSSProperties}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center bg-ink font-display font-bold text-bg">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-baseline gap-x-3 text-lg font-bold">
                  {step.title}
                  {step.timerSeconds && (
                    <span className="zine-label border border-ink bg-frame/25 px-2 py-0.5 text-[9px]">
                      ⏱ {Math.round(step.timerSeconds / 60)}&rsquo;
                    </span>
                  )}
                </h3>
                <p className="mt-1 leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* folio */}
      <footer className="mt-10 flex items-center justify-between border-t-2 border-ink pb-6 pt-3">
        <span className="zine-label">✳ Dishcover</span>
        <span className="zine-label text-ink-soft">Pg. {folio}</span>
      </footer>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl px-5 pb-6 pt-3 md:px-6">
        <Link
          href={`/recipe/${recipe.id}/cook`}
          className="block border-2 border-ink bg-accent px-8 py-4 text-center font-display text-lg font-bold uppercase tracking-wider text-accent-ink shadow-[4px_4px_0_var(--th-ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Start cooking ✦
        </Link>
      </div>
    </main>
  );
}
