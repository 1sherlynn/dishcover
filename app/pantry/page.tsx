"use client";

import { useState } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui";
import { usePantryStore, useHydrated } from "@/lib/store";

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

  const add = (name: string) => {
    const clean = name.trim().toLowerCase();
    if (clean) addStaple(clean);
    setDraft("");
  };

  return (
    <main>
      <header className="rise mb-6 flex items-center gap-4">
        <Link
          href="/"
          aria-label="Back to home"
          className="grid h-10 w-10 place-items-center rounded-full bg-surface shadow-card"
        >
          ←
        </Link>
        <h1 className="text-3xl font-semibold">My Pantry</h1>
      </header>

      <section
        className="rise rounded-card bg-surface-alt px-6 py-5"
        style={{ "--rise-delay": "60ms" } as React.CSSProperties}
      >
        <h2 className="text-xl font-semibold">What do you always have at home?</h2>
        <p className="mt-1 text-sm font-semibold text-ink-soft">
          Add staples and spices. Recipes will use what you already have —
          no need to re-type them.
        </p>
      </section>

      <section
        className="rise mt-4 rounded-card bg-surface p-6 shadow-card"
        style={{ "--rise-delay": "120ms" } as React.CSSProperties}
      >
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an ingredient…"
            aria-label="Add a pantry staple"
            className="min-w-0 flex-1 rounded-control border border-ink/15 bg-bg px-5 py-3 font-semibold placeholder:text-ink-soft/70 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Add"
            disabled={!draft.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-xl font-bold text-accent-ink transition-transform enabled:active:scale-90 disabled:opacity-40"
          >
            +
          </button>
        </form>

        {hydrated && pantry.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {pantry.map((name) => (
              <Chip key={name} onRemove={() => removeStaple(name)}>
                {name}
              </Chip>
            ))}
          </div>
        )}

        {hydrated && pantry.length === 0 && (
          <p className="mt-4 text-sm font-semibold text-ink-soft">
            Your pantry is empty — tap a staple below to get started.
          </p>
        )}

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
          Suggestions
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {hydrated &&
            SUGGESTIONS.filter((s) => !pantry.includes(s)).map((s, i) => (
              <Chip key={s} onClick={() => add(s)} delay={160 + i * 35}>
                {s}
              </Chip>
            ))}
        </div>
      </section>
    </main>
  );
}
