"use client";

import { useState } from "react";
import Link from "next/link";
import { usePantryStore, useHydrated } from "@/lib/store";
import { findExistingStaple } from "@/lib/pantry";
import { FOLIO, ZINE_NO, formatFolio } from "@/lib/folio";

// The Pantry as a Riso zine page (reference: "SCREEN · PANTRY"): shelf of
// staples with ink × boxes, quick-add dashed chips, folio footer.

const SUGGESTIONS = [
  "olive oil", "salt", "pepper", "butter", "garlic", "onions",
  "flour", "sugar", "eggs", "milk", "rice", "pasta",
  "soy sauce", "vinegar", "lemon", "tomato paste",
];

export default function PantryPage() {
  const hydrated = useHydrated();
  const pantry = usePantryStore((s) => s.pantry);
  const addStaple = usePantryStore((s) => s.addStaple);
  const removeStaple = usePantryStore((s) => s.removeStaple);
  const [draft, setDraft] = useState("");

  // Normalisation happens in the store (#42); the page just hands over the
  // raw text and clears the field.
  const add = (name: string) => {
    addStaple(name);
    setDraft("");
  };

  return (
    <main>
      <header className="rise flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="grid h-10 w-10 place-items-center rounded-control border-2 border-ink bg-surface font-bold"
          >
            ←
          </Link>
          <h1 className="text-3xl font-extrabold uppercase">The Pantry</h1>
        </div>
        <span className="zine-label hidden text-ink-soft sm:block">No.{formatFolio(ZINE_NO)}</span>
      </header>

      <p
        className="rise mt-4 leading-relaxed text-ink-soft"
        style={{ "--rise-delay": "60ms" } as React.CSSProperties}
      >
        Everything you keep on hand. Recipes lean on these first — so nothing
        goes to waste.
      </p>

      <form
        className="rise mt-6 flex gap-2"
        style={{ "--rise-delay": "100ms" } as React.CSSProperties}
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ADD AN INGREDIENT…"
          aria-label="Add a pantry staple"
          className="min-w-0 flex-1 border-2 border-ink bg-surface px-4 py-3 font-bold placeholder:text-xs placeholder:font-bold placeholder:uppercase placeholder:tracking-[0.18em] placeholder:text-ink-soft/70 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Add"
          disabled={!draft.trim()}
          className="grid h-[50px] w-[50px] shrink-0 place-items-center border-2 border-ink bg-accent text-xl font-bold text-accent-ink transition-transform enabled:active:translate-y-0.5 disabled:opacity-40"
        >
          +
        </button>
      </form>

      <section className="rise mt-8" style={{ "--rise-delay": "140ms" } as React.CSSProperties}>
        <div className="flex items-baseline gap-2">
          <h2 className="zine-label shrink-0">On the shelf</h2>
          <span className="grow border-b border-dotted border-ink/30" aria-hidden />
          <span className="zine-label shrink-0 text-ink-soft">
            {hydrated ? pantry.length : "–"} items
          </span>
        </div>

        {/* (#43) Was a single line of small text where Home and Cookbook both
            use a dashed framed box — the shelf read as broken rather than empty. */}
        {hydrated && pantry.length === 0 && (
          <p className="rise mt-3 border-2 border-dashed border-ink/40 px-6 py-10 text-center font-bold text-ink-soft">
            Bare shelves — tap a staple below to stock up.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {hydrated &&
            pantry.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 border-[1.5px] border-ink bg-surface py-1.5 pl-3 pr-1.5 text-sm font-bold"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeStaple(name)}
                  aria-label={`Remove ${name}`}
                  className="grid h-5 w-5 place-items-center bg-ink text-xs font-bold text-bg transition-transform active:scale-90"
                >
                  ×
                </button>
              </span>
            ))}
        </div>
      </section>

      <section className="rise mt-8" style={{ "--rise-delay": "180ms" } as React.CSSProperties}>
        <h2 className="zine-label">Quick add</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {hydrated &&
            SUGGESTIONS.filter((s) => !findExistingStaple(pantry, s)).map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rise border-[1.5px] border-dashed border-ink/60 bg-surface px-3.5 py-1.5 text-sm font-bold transition-colors hover:border-ink"
                style={{ "--rise-delay": `${200 + i * 30}ms` } as React.CSSProperties}
              >
                <span className="mr-1 text-accent" aria-hidden>+</span>
                {s}
              </button>
            ))}
        </div>
      </section>

      <footer className="mt-12 flex items-center justify-between border-t-2 border-ink pb-4 pt-3">
        <span className="zine-label">✳ Dishcover</span>
        <span className="zine-label text-ink-soft">Pg. {formatFolio(FOLIO.pantry)}</span>
      </footer>
    </main>
  );
}
