"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { nanoid } from "nanoid";
import { Chip, PrimaryButton } from "@/components/ui";
import { useRecipeStore, usePantryStore } from "@/lib/store";
import type { Recipe } from "@/lib/schemas";

const SUGGESTIONS = [
  "chicken breast", "eggs", "spinach", "tomatoes", "salmon",
  "tofu", "mushrooms", "broccoli", "potatoes", "minced beef",
  "bell pepper", "carrots",
];

const SIMMER_LINES = [
  "Consulting the spice rack…",
  "Negotiating with the onions…",
  "Weighing every last gram…",
  "Balancing your macros…",
  "Tasting for seasoning…",
];

export default function NewRecipePage() {
  const router = useRouter();
  const addRecipe = useRecipeStore((s) => s.addRecipe);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"form" | "generating" | "error">("form");
  const [lineIdx, setLineIdx] = useState(0);
  const lineTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const add = (name: string) => {
    const clean = name.trim().toLowerCase();
    if (clean && !ingredients.includes(clean)) {
      setIngredients((xs) => [...xs, clean]);
    }
    setDraft("");
  };

  const generate = async () => {
    setPhase("generating");
    setLineIdx(0);
    lineTimer.current = setInterval(
      () => setLineIdx((i) => (i + 1) % SIMMER_LINES.length),
      2600
    );
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capturedIngredients: ingredients,
          pantry: usePantryStore.getState().pantry,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const generated = await res.json();
      const recipe: Recipe = {
        ...generated,
        id: nanoid(10),
        createdAt: new Date().toISOString(),
        favorite: false,
        artSeed: Math.floor(Math.random() * 2 ** 31),
        nutrition: { ...generated.nutrition, estimated: true as const },
      };
      addRecipe(recipe);
      router.push(`/recipe/${recipe.id}`);
    } catch {
      setPhase("error");
    } finally {
      if (lineTimer.current) clearInterval(lineTimer.current);
    }
  };

  if (phase === "generating") {
    return (
      <main className="fixed inset-0 z-50 grid place-items-center bg-bg">
        <div className="atmosphere" />
        <div className="flex flex-col items-center px-8 text-center">
          <div className="relative grid h-40 w-40 place-items-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="absolute rounded-full border-2 border-accent"
                style={{
                  inset: `${i * 18}px`,
                  animation: `simmer 2.4s ease-in-out ${i * 0.4}s infinite`,
                }}
              />
            ))}
            <span className="font-display text-4xl" aria-hidden>🍳</span>
          </div>
          <h1 className="mt-8 text-3xl font-semibold">Dreaming up your dish</h1>
          <p aria-live="polite" className="mt-2 font-bold text-ink-soft">
            {SIMMER_LINES[lineIdx]}
          </p>
        </div>
      </main>
    );
  }

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
        <h1 className="text-3xl font-semibold">New recipe</h1>
      </header>

      {phase === "error" && (
        <p role="alert" className="rise mb-4 rounded-card bg-danger/10 px-5 py-4 font-bold text-danger">
          The kitchen hiccuped — your ingredients are safe, try again.
        </p>
      )}

      <section
        className="rise rounded-card bg-surface p-6 shadow-card"
        style={{ "--rise-delay": "80ms" } as React.CSSProperties}
      >
        <h2 className="text-xl font-semibold">What have you got?</h2>
        <p className="mt-1 text-sm font-semibold text-ink-soft">
          The stars of your dish — the recipe is built around them.
        </p>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an ingredient…"
            aria-label="Add an ingredient"
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

        {ingredients.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {ingredients.map((name) => (
              <Chip
                key={name}
                onRemove={() => setIngredients((xs) => xs.filter((x) => x !== name))}
              >
                {name}
              </Chip>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
          Suggestions
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !ingredients.includes(s)).map((s, i) => (
            <Chip key={s} onClick={() => add(s)} delay={120 + i * 35}>
              {s}
            </Chip>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl px-5 pb-6 pt-3 md:px-6">
        <PrimaryButton onClick={generate} disabled={ingredients.length === 0}>
          Create my recipe
        </PrimaryButton>
      </div>
    </main>
  );
}
