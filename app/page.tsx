"use client";

import Link from "next/link";
import { HeartButton } from "@/components/ui";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { useRecipeStore, usePantryStore, useHydrated } from "@/lib/store";

// Home as a Riso zine page (reference: "SCREEN · HOME"): greeting,
// WHAT'S COOKING?, add-recipe CTA, pantry shelf preview, MADE FOR YOU
// with a featured latest recipe, folio footer.

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function ZineRule({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="zine-label shrink-0">{label}</h2>
      <span className="grow border-b border-dotted border-ink/30" aria-hidden />
      {right && <span className="zine-label shrink-0 text-ink-soft">{right}</span>}
    </div>
  );
}

export default function HomePage() {
  const hydrated = useHydrated();
  const recipes = useRecipeStore((s) => s.recipes);
  const toggleFavorite = useRecipeStore((s) => s.toggleFavorite);
  const pantry = usePantryStore((s) => s.pantry);

  const [featured, ...rest] = recipes;

  return (
    <main>
      <header className="rise flex items-baseline justify-between">
        <Link href="/" className="flex items-baseline gap-0.5" aria-label="Dishcover home">
          <span className="font-display text-2xl font-bold tracking-tight">Dishcover</span>
          <span aria-hidden className="h-2 w-2 translate-y-[-2px] rounded-full bg-accent" />
        </Link>
        <span className="zine-label text-ink-soft">Dishcover Zine · No.07</span>
      </header>

      <section className="rise mt-8" style={{ "--rise-delay": "50ms" } as React.CSSProperties}>
        {hydrated && <p className="zine-label text-ink-soft">{greeting()}</p>}
        <h1 className="mt-1 text-[2.6rem] font-extrabold uppercase leading-[0.95]">
          What&rsquo;s
          <br />
          cooking?
        </h1>
        <Link
          href="/new"
          className="mt-6 block border-2 border-ink bg-accent px-8 py-4 text-center font-display text-lg font-bold uppercase tracking-wider text-accent-ink shadow-[4px_4px_0_var(--th-ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          + Add new recipe
        </Link>
      </section>

      <section className="rise mt-10" style={{ "--rise-delay": "100ms" } as React.CSSProperties}>
        <ZineRule
          label="In your pantry"
          right={hydrated ? <>{pantry.length} ✓</> : undefined}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {hydrated && pantry.length === 0 && (
            <Link href="/pantry" className="zine-label border-[1.5px] border-dashed border-ink/60 px-4 py-2">
              + Stock your staples
            </Link>
          )}
          {hydrated &&
            pantry.slice(0, 8).map((name) => (
              <span key={name} className="border-[1.5px] border-dashed border-ink/60 bg-surface px-3 py-1.5 text-sm font-bold">
                {name}
              </span>
            ))}
          {hydrated && pantry.length > 0 && (
            <Link
              href="/pantry"
              className="border-[1.5px] border-ink bg-surface px-3 py-1.5 text-sm font-bold text-pop"
            >
              manage →
            </Link>
          )}
        </div>
      </section>

      <section className="rise mt-10" style={{ "--rise-delay": "150ms" } as React.CSSProperties}>
        <ZineRule label="Made for you" />

        {hydrated && recipes.length === 0 && (
          <p className="mt-4 border-2 border-dashed border-ink/40 px-6 py-10 text-center font-bold text-ink-soft">
            Nothing simmering yet — your generated recipes will live here.
          </p>
        )}

        {hydrated && featured && (
          <div className="relative mt-4">
            <Link
              href={`/recipe/${featured.id}`}
              className="flex items-center gap-4 border-2 border-ink bg-surface-alt p-4 shadow-card transition-transform active:translate-y-0.5"
            >
              <div className="w-24 shrink-0 border-2 border-ink">
                <PlaceholderArt seed={featured.artSeed} className="w-full" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold uppercase leading-tight">
                  {featured.title}
                </h3>
                <p className="zine-label mt-1.5 text-ink-soft">
                  {featured.timeMinutes}&rsquo; · {Math.round(featured.nutrition.perServing.kcal)} kcal
                </p>
              </div>
            </Link>
            <span className="sticker zine-label absolute -right-1 -top-3">Latest</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {hydrated &&
            rest.map((r, i) => (
              <article
                key={r.id}
                className="rise relative border-2 border-ink bg-surface shadow-card"
                style={{ "--rise-delay": `${180 + i * 50}ms` } as React.CSSProperties}
              >
                <Link href={`/recipe/${r.id}`} className="block">
                  <div className="border-b-2 border-ink">
                    <PlaceholderArt seed={r.artSeed} className="w-full" />
                  </div>
                  <div className="px-3 pb-3 pt-2.5">
                    <h3 className="font-display text-sm font-bold uppercase leading-snug">
                      {r.title}
                    </h3>
                    <p className="zine-label mt-1 text-[9px] text-ink-soft">
                      {r.timeMinutes}&rsquo; · {Math.round(r.nutrition.perServing.kcal)} kcal
                    </p>
                  </div>
                </Link>
                <div className="absolute right-1.5 top-1.5">
                  <HeartButton filled={r.favorite} onClick={() => toggleFavorite(r.id)} />
                </div>
              </article>
            ))}
        </div>
      </section>

      <footer className="mt-12 flex items-center justify-between border-t-2 border-ink pb-4 pt-3">
        <span className="zine-label">✳ Dishcover</span>
        <span className="zine-label text-ink-soft">Pg. 01</span>
      </footer>
    </main>
  );
}
