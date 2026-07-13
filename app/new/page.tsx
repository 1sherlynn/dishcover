"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Chip, PrimaryButton } from "@/components/ui";
import { MacroPresetPicker } from "@/components/MacroPresetPicker";
import {
  MealSettingsPicker,
  AllowOtherToggle,
  type MealSettings,
} from "@/components/MealSettingsPicker";
import { generateRecipe, type GenerationError } from "@/lib/generate-recipe";
import { scanPhoto, type ScanError } from "@/lib/scan-photo";
import { compressImage } from "@/lib/compress-image";
import type { MacroTarget, ScanIngredient } from "@/lib/schemas";

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
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [macroTarget, setMacroTarget] = useState<MacroTarget | undefined>(undefined);
  const [mealSettings, setMealSettings] = useState<MealSettings>({
    guests: 2,
    time: "medium",
    cuisine: "any",
  });
  const [allowOtherIngredients, setAllowOtherIngredients] = useState(false);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"form" | "generating">("form");
  const [error, setError] = useState<GenerationError | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const lineTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [scanState, setScanState] = useState<"idle" | "scanning" | "reviewing">("idle");
  const [scanReview, setScanReview] = useState<ScanIngredient[]>([]);
  const [scanDraft, setScanDraft] = useState("");
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  const add = (name: string) => {
    const clean = name.trim().toLowerCase();
    if (clean && !ingredients.includes(clean)) {
      setIngredients((xs) => [...xs, clean]);
    }
    setDraft("");
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanError(null);
    setScanState("scanning");
    const photo = await compressImage(file);
    const result = await scanPhoto(photo);
    if (result.ok) {
      setScanReview(result.ingredients);
      setScanState("reviewing");
    } else {
      setScanError(result.error);
      setScanState("idle");
    }
  };

  const removeScanItem = (name: string) => {
    setScanReview((xs) => xs.filter((i) => i.name !== name));
  };

  const addManualScanItem = (name: string) => {
    const clean = name.trim().toLowerCase();
    if (clean && !scanReview.some((i) => i.name === clean)) {
      setScanReview((xs) => [...xs, { name: clean, confidence: "high" }]);
    }
    setScanDraft("");
  };

  const cancelScan = () => {
    setScanReview([]);
    setScanState("idle");
  };

  const confirmScan = () => {
    setIngredients((xs) => {
      const merged = [...xs];
      for (const { name } of scanReview) {
        if (!merged.includes(name)) merged.push(name);
      }
      return merged;
    });
    setScanReview([]);
    setScanState("idle");
  };

  const generate = async () => {
    setPhase("generating");
    setError(null);
    setLineIdx(0);
    lineTimer.current = setInterval(
      () => setLineIdx((i) => (i + 1) % SIMMER_LINES.length),
      2600
    );
    const result = await generateRecipe({
      capturedIngredients: ingredients,
      macroTarget,
      mealSettings,
      allowOtherIngredients,
    });
    if (lineTimer.current) clearInterval(lineTimer.current);
    if (result.ok) {
      router.push(`/recipe/${result.recipe.id}`);
    } else {
      setError(result.error);
      setPhase("form");
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
        <h1 className="text-3xl font-extrabold uppercase">Build a recipe</h1>
      </header>

      {error && (
        <p role="alert" className="rise mb-4 border-2 border-danger bg-surface px-5 py-4 font-bold text-danger">
          {error.message}
          {error.retryable && (
            <span className="mt-1 block text-sm font-bold text-ink-soft">
              Your ingredients are still here — hit cook again when ready.
            </span>
          )}
        </p>
      )}

      <section
        className="rise relative border-2 border-ink bg-surface p-5 shadow-card"
        style={{ "--rise-delay": "80ms" } as React.CSSProperties}
      >
        <span className="zine-label absolute -top-3 left-4 bg-highlight px-2.5 py-1 text-white">
          Meal Settings
        </span>
        <div className="mt-2">
          <MealSettingsPicker value={mealSettings} onChange={setMealSettings} />
        </div>
      </section>

      <section className="rise mt-10" style={{ "--rise-delay": "160ms" } as React.CSSProperties}>
        <h2 className="zine-label">Ingredients</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <span className="grid place-items-center border-2 border-ink bg-accent px-2 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-ink">
            ✎ Type
          </span>
          <span
            className="grid place-items-center border-2 border-ink/30 bg-surface px-2 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft/60"
            title="Coming soon"
          >
            ◉ Dictate
          </span>
          <button
            type="button"
            onClick={() => scanInputRef.current?.click()}
            disabled={scanState === "scanning"}
            className="grid place-items-center border-2 border-ink bg-surface px-2 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-ink transition-colors enabled:hover:bg-surface-alt disabled:opacity-60"
          >
            {scanState === "scanning" ? "Reading…" : "⧇ Scan"}
          </button>
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            aria-label="Scan your fridge"
            onChange={handleScanFile}
          />
        </div>
        <p className="mt-2 text-xs font-bold text-ink-soft">
          The stars of your dish — the recipe is built around them.
        </p>

        {scanError && (
          <p role="alert" className="mt-3 border-2 border-danger bg-surface px-4 py-3 text-sm font-bold text-danger">
            {scanError.message}
          </p>
        )}

        {scanState === "reviewing" && (
          <div className="mt-4 border-2 border-dashed border-warn bg-surface p-4">
            <p className="zine-label text-ink-soft">Review scanned ingredients</p>
            <p className="mt-1 text-xs font-bold text-ink-soft">
              Low-confidence items are flagged (?) — remove anything that&apos;s wrong.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {scanReview.length === 0 && (
                <p className="text-xs font-bold text-ink-soft">Nothing left — add one below or cancel.</p>
              )}
              {scanReview.map(({ name, confidence }) => (
                <Chip key={name} flagged={confidence === "low"} onRemove={() => removeScanItem(name)}>
                  {name}
                </Chip>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addManualScanItem(scanDraft);
              }}
            >
              <input
                value={scanDraft}
                onChange={(e) => setScanDraft(e.target.value)}
                placeholder="ADD MANUALLY…"
                aria-label="Add a scanned ingredient manually"
                className="min-w-0 flex-1 border-2 border-ink bg-surface px-4 py-2.5 text-sm font-bold placeholder:text-xs placeholder:font-bold placeholder:uppercase placeholder:tracking-[0.14em] placeholder:text-ink-soft/70 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Add"
                disabled={!scanDraft.trim()}
                className="grid h-[42px] w-[42px] shrink-0 place-items-center border-2 border-ink bg-surface text-lg font-bold text-ink transition-transform enabled:active:translate-y-0.5 disabled:opacity-40"
              >
                +
              </button>
            </form>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={cancelScan}
                className="flex-1 border-2 border-ink bg-surface px-4 py-2.5 text-sm font-bold uppercase tracking-wide"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmScan}
                disabled={scanReview.length === 0}
                className="flex-1 border-2 border-ink bg-accent px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-accent-ink disabled:opacity-40"
              >
                Add {scanReview.length} ingredient{scanReview.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}

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
            placeholder="ADD AN INGREDIENT…"
            aria-label="Add an ingredient"
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

        <p className="zine-label mt-6 text-ink-soft">Suggestions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !ingredients.includes(s)).map((s, i) => (
            <Chip key={s} onClick={() => add(s)} delay={120 + i * 35}>
              {s}
            </Chip>
          ))}
        </div>

        <div className="mt-6">
          <AllowOtherToggle on={allowOtherIngredients} onChange={setAllowOtherIngredients} />
        </div>
      </section>

      <section
        className="rise relative mt-10 border-2 border-ink bg-wash p-5 shadow-card"
        style={{ "--rise-delay": "240ms" } as React.CSSProperties}
      >
        <span className="zine-label absolute -top-3 left-4 bg-pop px-2.5 py-1 text-white">
          Macro Target
        </span>
        <p className="mt-2 text-sm font-bold text-ink-soft">
          Soft — we aim close, never refuse.
        </p>
        <div className="mt-4">
          <MacroPresetPicker onChange={setMacroTarget} />
        </div>
      </section>

      <footer className="mt-10 flex items-center justify-between border-t-2 border-ink pb-4 pt-3">
        <span className="zine-label">✳ Dishcover</span>
        <span className="zine-label text-ink-soft">Pg. 04</span>
      </footer>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl px-5 pb-6 pt-3 md:px-6">
        <PrimaryButton onClick={generate} disabled={ingredients.length === 0}>
          Cook this up ✦
        </PrimaryButton>
      </div>
    </main>
  );
}
