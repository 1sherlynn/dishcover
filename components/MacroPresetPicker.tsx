"use client";

import { useState } from "react";
import type { MacroTarget } from "@/lib/schemas";

// MacroPresetPicker (DESIGN-SYSTEM.md inventory): Macro Preset chips that
// reveal three editable per-serving gram fields. Presets are entry points,
// not fixed modes (CONTEXT.md) — every gram stays editable, and a Macro
// Target is always soft. Values are per serving; guest count never scales
// them.

const MACROS = [
  { key: "proteinG", label: "Protein" },
  { key: "carbsG", label: "Carbs" },
  { key: "fatG", label: "Fat" },
] as const;

type MacroKey = (typeof MACROS)[number]["key"];
type Fields = Record<MacroKey, string>;

// Suggested per-serving grams per preset; Custom starts empty, None clears.
const PRESETS: { name: string; grams: MacroTarget | null }[] = [
  { name: "Balanced", grams: { proteinG: 30, carbsG: 45, fatG: 20 } },
  { name: "High Protein", grams: { proteinG: 45, carbsG: 30, fatG: 15 } },
  { name: "Low Carb", grams: { proteinG: 40, carbsG: 15, fatG: 25 } },
  { name: "Keto-ish", grams: { proteinG: 30, carbsG: 10, fatG: 35 } },
  { name: "Custom", grams: {} },
  { name: "None", grams: null },
];

const EMPTY: Fields = { proteinG: "", carbsG: "", fatG: "" };

function toTarget(fields: Fields): MacroTarget | undefined {
  const target: MacroTarget = {};
  for (const { key } of MACROS) {
    const grams = Number(fields[key]);
    if (fields[key].trim() !== "" && Number.isFinite(grams) && grams > 0) {
      target[key] = grams;
    }
  }
  return Object.keys(target).length > 0 ? target : undefined;
}

export function MacroPresetPicker({
  onChange,
}: {
  onChange: (target: MacroTarget | undefined) => void;
}) {
  const [preset, setPreset] = useState("None");
  const [fields, setFields] = useState<Fields>(EMPTY);

  const pick = (name: string) => {
    setPreset(name);
    const grams = PRESETS.find((p) => p.name === name)?.grams ?? null;
    const next: Fields =
      grams === null
        ? EMPTY
        : {
            proteinG: grams.proteinG?.toString() ?? "",
            carbsG: grams.carbsG?.toString() ?? "",
            fatG: grams.fatG?.toString() ?? "",
          };
    setFields(next);
    onChange(grams === null ? undefined : toTarget(next));
  };

  const edit = (key: MacroKey, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    onChange(toTarget(next));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ name }, i) => (
          <button
            key={name}
            type="button"
            onClick={() => pick(name)}
            aria-pressed={preset === name}
            className={`rise border-[1.5px] px-3.5 py-1.5 text-sm font-bold transition-colors ${
              preset === name
                ? "border-ink bg-accent text-accent-ink"
                : "border-dashed border-ink/60 bg-surface text-ink"
            }`}
            style={{ "--rise-delay": `${i * 35}ms` } as React.CSSProperties}
          >
            {name}
          </button>
        ))}
      </div>

      {preset !== "None" && (
        <div key={preset} className="rise mt-4">
          <div className="grid grid-cols-3 gap-2">
            {MACROS.map(({ key, label }) => (
              <label key={key} className="block">
                <span className="zine-label text-[9px] text-ink-soft">{label}</span>
                <span className="relative mt-1.5 block">
                  <input
                    value={fields[key]}
                    onChange={(e) => edit(key, e.target.value)}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="—"
                    aria-label={`${label} target in grams per serving`}
                    className="w-full border-2 border-ink bg-surface py-2 pl-3 pr-7 font-display text-lg font-bold placeholder:text-ink-soft/70 focus:border-accent focus:outline-none"
                  />
                  <span
                    aria-hidden
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-soft"
                  >
                    g
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="font-hand mt-3 text-lg leading-none text-highlight">
            per serving, whatever the guest count
          </p>
        </div>
      )}
    </div>
  );
}
