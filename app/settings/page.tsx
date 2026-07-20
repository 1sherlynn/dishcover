"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrefsStore, useHydrated } from "@/lib/store";
import { FOLIO, ZINE_NO, formatFolio } from "@/lib/folio";

// Settings as a Riso zine page (PRODUCT-SPEC §7): the standing preferences —
// Dietary Preferences, Avoid List, Equipment — that join every generation.
// Theme picker is a later issue.

const DIETARY = [
  "vegan", "vegetarian", "pescatarian", "gluten-free", "dairy-free",
  "nut-free", "ketogenic", "diabetic-friendly", "low sodium",
];

const EQUIPMENT = [
  "stove", "oven", "microwave", "air fryer", "blender",
  "rice cooker", "slow cooker", "pressure cooker", "grill",
];

function SectionRule({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="zine-label shrink-0">{label}</h2>
      <span className="grow border-b border-dotted border-ink/30" aria-hidden />
      {right && <span className="zine-label shrink-0 text-ink-soft">{right}</span>}
    </div>
  );
}

function ToggleChip({
  name,
  selected,
  onToggle,
}: {
  name: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`border-[1.5px] px-3.5 py-1.5 text-sm font-bold transition-colors ${
        selected
          ? "border-ink bg-accent text-accent-ink"
          : "border-ink/60 bg-surface hover:border-ink"
      }`}
    >
      {selected && (
        <span className="mr-1" aria-hidden>
          ✓
        </span>
      )}
      {name}
    </button>
  );
}

export default function SettingsPage() {
  const hydrated = useHydrated();
  const dietary = usePrefsStore((s) => s.dietary);
  const avoidList = usePrefsStore((s) => s.avoidList);
  const equipment = usePrefsStore((s) => s.equipment);
  const toggleDietary = usePrefsStore((s) => s.toggleDietary);
  const toggleEquipment = usePrefsStore((s) => s.toggleEquipment);
  const addAvoid = usePrefsStore((s) => s.addAvoid);
  const removeAvoid = usePrefsStore((s) => s.removeAvoid);
  const [draft, setDraft] = useState("");

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
          <h1 className="text-3xl font-extrabold uppercase">Settings</h1>
        </div>
        <span className="zine-label hidden text-ink-soft sm:block">No.{formatFolio(ZINE_NO)}</span>
      </header>

      <p
        className="rise mt-4 leading-relaxed text-ink-soft"
        style={{ "--rise-delay": "60ms" } as React.CSSProperties}
      >
        Your standing preferences. Every recipe Dishcover cooks up respects
        these — no need to repeat yourself.
      </p>

      <section className="rise mt-8" style={{ "--rise-delay": "100ms" } as React.CSSProperties}>
        <SectionRule
          label="Dietary preferences"
          right={hydrated ? <>{dietary.length} set</> : undefined}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {hydrated &&
            DIETARY.map((name) => (
              <ToggleChip
                key={name}
                name={name}
                selected={dietary.includes(name)}
                onToggle={() => toggleDietary(name)}
              />
            ))}
        </div>
      </section>

      <section className="rise mt-8" style={{ "--rise-delay": "140ms" } as React.CSSProperties}>
        <SectionRule
          label="Avoid list"
          right={hydrated ? <>{avoidList.length} items</> : undefined}
        />
        <p className="mt-2 text-sm font-bold text-ink-soft">
          Ingredients that never make it onto the plate.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addAvoid(draft);
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ADD AN INGREDIENT TO AVOID…"
            aria-label="Add an ingredient to avoid"
            className="min-w-0 flex-1 border-2 border-ink bg-surface px-4 py-3 font-bold placeholder:text-xs placeholder:font-bold placeholder:uppercase placeholder:tracking-[0.18em] placeholder:text-ink-soft/70 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Add to avoid list"
            disabled={!draft.trim()}
            className="grid h-[50px] w-[50px] shrink-0 place-items-center border-2 border-ink bg-accent text-xl font-bold text-accent-ink transition-transform enabled:active:translate-y-0.5 disabled:opacity-40"
          >
            +
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {hydrated &&
            avoidList.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 border-[1.5px] border-ink bg-surface py-1.5 pl-3 pr-1.5 text-sm font-bold"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeAvoid(name)}
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
        <SectionRule
          label="Equipment"
          right={hydrated ? <>{equipment.length} set</> : undefined}
        />
        <p className="mt-2 text-sm font-bold text-ink-soft">
          What your kitchen has — recipes only call for gear you own.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {hydrated &&
            EQUIPMENT.map((name) => (
              <ToggleChip
                key={name}
                name={name}
                selected={equipment.includes(name)}
                onToggle={() => toggleEquipment(name)}
              />
            ))}
        </div>
      </section>

      <footer className="mt-12 flex items-center justify-between border-t-2 border-ink pb-4 pt-3">
        <span className="zine-label">✳ Dishcover</span>
        <span className="zine-label text-ink-soft">Pg. {formatFolio(FOLIO.settings)}</span>
      </footer>
    </main>
  );
}
