"use client";

import Link from "next/link";
import { AppHeader, HeartButton } from "@/components/ui";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { useRecipeStore, usePantryStore, useHydrated } from "@/lib/store";

export default function HomePage() {
  const hydrated = useHydrated();
  const recipes = useRecipeStore((s) => s.recipes);
  const toggleFavorite = useRecipeStore((s) => s.toggleFavorite);
  const pantry = usePantryStore((s) => s.pantry);

  return (
    <main>
      <AppHeader />

      <section
        className="rise relative overflow-hidden rounded-card bg-surface-alt px-7 py-9"
        style={{ "--rise-delay": "60ms" } as React.CSSProperties}
      >
        <h1 className="max-w-[14ch] text-4xl font-semibold leading-[1.08] md:text-5xl">
          What&rsquo;s in your kitchen tonight?
        </h1>
        <p className="mt-3 max-w-[36ch] font-semibold text-ink-soft">
          Tell Dishcover what you have — get a recipe with honest nutrition,
          down to the milligram.
        </p>
        <Link
          href="/new"
          className="mt-6 inline-block rounded-control bg-accent px-7 py-3.5 text-lg font-bold text-accent-ink shadow-card transition-all hover:brightness-105 active:scale-[0.98]"
        >
          New recipe →
        </Link>
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="absolute -right-6 -top-8 h-40 w-40 opacity-60 md:h-48 md:w-48"
        >
          <circle cx="50" cy="55" r="28" fill="none" stroke="var(--th-accent)" strokeWidth="2.5" />
          <ellipse cx="50" cy="55" rx="18" ry="17" fill="none" stroke="var(--th-highlight)" strokeWidth="1.5" opacity="0.7" />
          <path d="M42 30 q 5 -6 0 -12 M52 28 q 5 -6 0 -12 M62 30 q 5 -6 0 -12" fill="none" stroke="var(--th-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
      </section>

      <Link
        href="/pantry"
        className="rise mt-4 flex items-center justify-between gap-4 rounded-card bg-surface px-6 py-5 shadow-card transition-all hover:brightness-[1.02] active:scale-[0.99]"
        style={{ "--rise-delay": "100ms" } as React.CSSProperties}
      >
        <div>
          <p className="text-sm font-bold text-ink-soft">Manage my</p>
          <p className="font-display text-2xl font-semibold tracking-tight">
            Pantry
          </p>
          {hydrated && (
            <p className="mt-1 text-xs font-bold text-ink-soft">
              {pantry.length > 0
                ? `${pantry.length} staple${pantry.length === 1 ? "" : "s"} always on hand`
                : "Staples your recipes can always use"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <svg aria-hidden viewBox="0 0 100 60" className="h-14 w-24 opacity-80">
            <rect x="8" y="22" width="20" height="30" rx="5" fill="none" stroke="var(--th-accent)" strokeWidth="2.5" />
            <path d="M10 30 h16" stroke="var(--th-accent)" strokeWidth="2" strokeLinecap="round" />
            <rect x="12" y="15" width="12" height="7" rx="2" fill="none" stroke="var(--th-accent)" strokeWidth="2" />
            <ellipse cx="52" cy="42" rx="14" ry="10" fill="none" stroke="var(--th-highlight)" strokeWidth="2.5" />
            <path d="M52 32 q -3 -8 4 -12 M52 32 q 5 -6 10 -4" fill="none" stroke="var(--th-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            <circle cx="83" cy="38" r="12" fill="none" stroke="var(--th-ink)" strokeWidth="2.5" opacity="0.6" />
            <path d="M78 34 q 5 -4 10 0" fill="none" stroke="var(--th-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          </svg>
          <span aria-hidden className="text-xl font-bold text-ink-soft">
            ›
          </span>
        </div>
      </Link>

      <section className="mt-10">
        <h2
          className="rise text-2xl font-semibold"
          style={{ "--rise-delay": "140ms" } as React.CSSProperties}
        >
          My recipes
        </h2>

        {hydrated && recipes.length === 0 && (
          <p
            className="rise mt-4 rounded-card border border-dashed border-ink/20 px-6 py-10 text-center font-semibold text-ink-soft"
            style={{ "--rise-delay": "200ms" } as React.CSSProperties}
          >
            Nothing simmering yet. Your generated recipes will live here.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {hydrated &&
            recipes.map((r, i) => (
              <article
                key={r.id}
                className="rise group relative overflow-hidden rounded-card bg-surface shadow-card"
                style={{ "--rise-delay": `${200 + i * 60}ms` } as React.CSSProperties}
              >
                <Link href={`/recipe/${r.id}`} className="block">
                  <PlaceholderArt seed={r.artSeed} className="aspect-[8/5] w-full" />
                  <div className="px-4 pb-4 pt-3">
                    <h3 className="font-display text-base font-semibold leading-snug">
                      {r.title}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-ink-soft">
                      {r.timeMinutes}&rsquo; · {Math.round(r.nutrition.perServing.kcal)} kcal
                    </p>
                  </div>
                </Link>
                <div className="absolute right-2 top-2">
                  <HeartButton filled={r.favorite} onClick={() => toggleFavorite(r.id)} />
                </div>
              </article>
            ))}
        </div>
      </section>
    </main>
  );
}
