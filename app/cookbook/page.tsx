"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState, HeartButton } from "@/components/ui";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { useRecipeStore, useHydrated } from "@/lib/store";
import { filterByTab, COOKBOOK_TABS, QUICK_MAX_MINUTES, type CookbookTab } from "@/lib/cookbook";
import { FOLIO, formatFolio, zineMasthead } from "@/lib/folio";

// Cookbook as a Riso zine page (reference: "SCREEN · COOKBOOK"): the full
// browsable recipe library. YOUR COOKBOOK title, ALL/FAVORITES/QUICK filter
// tabs as boxed segments, recipes as zine rows, folio PG. 03. Home keeps its
// featured-plus-grid preview; this is the whole shelf.

const TAB_LABELS: Record<CookbookTab, string> = {
  all: "All",
  favorites: "Favorites",
  quick: "Quick",
};

const EMPTY_COPY: Record<CookbookTab, string> = {
  all: "Nothing simmering yet — your generated recipes will live here.",
  favorites: "No favorites yet — tap a heart to keep a recipe here.",
  quick: `No quick recipes yet — nothing ${QUICK_MAX_MINUTES} minutes or under so far.`,
};

export default function CookbookPage() {
  const hydrated = useHydrated();
  const recipes = useRecipeStore((s) => s.recipes);
  const toggleFavorite = useRecipeStore((s) => s.toggleFavorite);
  const [tab, setTab] = useState<CookbookTab>("all");

  const visible = filterByTab(recipes, tab);
  const emptyLibrary = hydrated && recipes.length === 0;

  return (
    <main>
      {/* zine masthead */}
      <header className="rise flex items-center justify-between">
        <Link
          href="/"
          aria-label="Back to home"
          className="grid h-10 w-10 place-items-center rounded-control border-2 border-ink bg-surface font-bold"
        >
          ←
        </Link>
        <span className="zine-label text-ink-soft">{zineMasthead()}</span>
      </header>

      <section className="rise mt-6" style={{ "--rise-delay": "50ms" } as React.CSSProperties}>
        <h1 className="text-[2.6rem] font-extrabold uppercase leading-[0.95]">
          Your
          <br />
          cookbook
        </h1>
        {/* (#43) Rendered a literal non-breaking space pre-hydration purely
            to hold layout; reserve the line with min-height instead. */}
        <p className="zine-label mt-3 min-h-[1.2em] text-ink-soft">
          {hydrated &&
            (recipes.length === 0
              ? "Every recipe you generate lands here."
              : `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} on the shelf.`)}
        </p>
      </section>

      {/* filter tabs — boxed segments; selected is the plum box. Hidden while
          the library is empty: nothing to filter. Also hidden until hydration,
          since pre-hydration `recipes` is always [] — rendering the bar and
          then pulling it away is the flash this fix exists to remove. */}
      <div
        hidden={!hydrated || emptyLibrary}
        className="rise mt-6 flex gap-1.5"
        role="tablist"
        aria-label="Filter recipes"
        style={{ "--rise-delay": "100ms" } as React.CSSProperties}
      >
        {COOKBOOK_TABS.map((t) => {
          const selected = t === tab;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t)}
              className={`zine-label flex-1 border-2 border-ink px-2 py-2.5 text-center transition-colors ${
                selected ? "bg-accent text-accent-ink" : "bg-transparent text-ink"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          );
        })}
      </div>

      {/* recipe rows */}
      <section className="mt-6">
        {emptyLibrary && (
          <EmptyState
            action={
              <Link
                href="/new"
                className="inline-block border-2 border-ink bg-accent px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-accent-ink shadow-[3px_3px_0_var(--th-ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                + Make your first recipe
              </Link>
            }
          >
            {EMPTY_COPY.all}
          </EmptyState>
        )}

        {hydrated && !emptyLibrary && visible.length === 0 && (
          <EmptyState>{EMPTY_COPY[tab]}</EmptyState>
        )}

        <div className="flex flex-col gap-3">
          {hydrated &&
            visible.map((r, i) => (
              <div
                key={r.id}
                className="rise relative flex gap-3 border-2 border-ink bg-surface p-2.5 shadow-card"
                style={{ "--rise-delay": `${120 + i * 45}ms` } as React.CSSProperties}
              >
                <Link
                  href={`/recipe/${r.id}`}
                  className="flex min-w-0 flex-1 items-stretch gap-3"
                >
                  <div className="w-20 shrink-0 self-start border-[1.5px] border-ink bg-wash">
                    <PlaceholderArt seed={r.artSeed} className="w-full" />
                  </div>
                  <div className="min-w-0 flex-1 pr-8">
                    <span className="zine-label inline-block bg-ink px-2 py-0.5 text-[9px] text-bg">
                      {r.tag}
                    </span>
                    <h2 className="mt-1.5 font-display text-base font-bold uppercase leading-tight">
                      {r.title}
                    </h2>
                    <p className="zine-label mt-1.5 text-[10px] text-ink-soft">
                      {r.timeMinutes}&rsquo; · {Math.round(r.nutrition.perServing.kcal)} kcal
                    </p>
                  </div>
                </Link>
                <div className="absolute right-2 top-2">
                  <HeartButton filled={r.favorite} onClick={() => toggleFavorite(r.id)} />
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* folio */}
      <footer className="mt-12 flex items-center justify-between border-t-2 border-ink pb-4 pt-3">
        <span className="zine-label">✳ Dishcover</span>
        <span className="zine-label text-ink-soft">Pg. {formatFolio(FOLIO.cookbook)}</span>
      </footer>
    </main>
  );
}
