"use client";

import type { MealSettings } from "@/lib/schemas";

// Meal Settings (CONTEXT.md): the per-generation knobs — Guests, Time,
// Cuisine — plus the Allow Other Ingredients toggle. Values flow into the
// Generation Request via the screen; this component never talks to stores.
// Patterns per DESIGN-SYSTEM.md: boxed stepper (Recipe Detail serves) and
// dashed chips (suggestions / macro presets).

const TIMES: { value: MealSettings["time"]; label: string; range: string }[] = [
  { value: "fast", label: "Fast", range: "<20m" },
  { value: "medium", label: "Medium", range: "20–45m" },
  { value: "long", label: "Long", range: "45m+" },
];

const CUISINES = [
  "any", "latin", "mediterranean", "american", "nordic",
  "african", "european", "asian", "italian", "middle eastern",
];

const MIN_GUESTS = 1;
const MAX_GUESTS = 8;

export function MealSettingsPicker({
  value,
  onChange,
}: {
  value: MealSettings;
  onChange: (next: MealSettings) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="zine-label">Guests</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Fewer guests"
            onClick={() => onChange({ ...value, guests: Math.max(MIN_GUESTS, value.guests - 1) })}
            className="grid h-10 w-10 place-items-center rounded-control border-2 border-ink bg-surface text-lg font-bold active:translate-y-0.5"
          >
            −
          </button>
          <span
            aria-live="polite"
            className="grid h-10 w-10 place-items-center font-display text-xl font-bold"
          >
            {value.guests}
          </span>
          <button
            type="button"
            aria-label="More guests"
            onClick={() => onChange({ ...value, guests: Math.min(MAX_GUESTS, value.guests + 1) })}
            className="grid h-10 w-10 place-items-center rounded-control border-2 border-ink bg-highlight text-lg font-bold text-white active:translate-y-0.5"
          >
            +
          </button>
        </div>
      </div>

      <p className="zine-label mt-5 text-ink-soft">Time</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {TIMES.map(({ value: time, label, range }) => (
          <button
            key={time}
            type="button"
            onClick={() => onChange({ ...value, time })}
            aria-pressed={value.time === time}
            className={`rounded-control border-[1.5px] px-2 py-2 transition-colors ${
              value.time === time
                ? "border-ink bg-accent text-accent-ink"
                : "border-dashed border-ink/60 bg-surface text-ink"
            }`}
          >
            <span className="block text-sm font-bold">{label}</span>
            <span
              className={`block text-[10px] font-bold tracking-[0.14em] ${
                value.time === time ? "text-accent-ink/80" : "text-ink-soft"
              }`}
            >
              {range}
            </span>
          </button>
        ))}
      </div>

      <p className="zine-label mt-5 text-ink-soft">Cuisine</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CUISINES.map((cuisine) => (
          <button
            key={cuisine}
            type="button"
            onClick={() => onChange({ ...value, cuisine })}
            aria-pressed={value.cuisine === cuisine}
            className={`rounded-control border-[1.5px] px-3.5 py-1.5 text-sm font-bold capitalize transition-colors ${
              value.cuisine === cuisine
                ? "border-ink bg-accent text-accent-ink"
                : "border-dashed border-ink/60 bg-surface text-ink"
            }`}
          >
            {cuisine}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AllowOtherToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-2 border-ink bg-surface px-5 py-4 shadow-card">
      <div>
        <span id="allow-other-label" className="block font-bold">
          Allow other ingredients?
        </span>
        <span className="font-hand mt-0.5 block text-lg leading-none text-highlight">
          {on ? "extras get stamped “to buy”" : "only your fridge + pantry"}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="allow-other-label"
        onClick={() => onChange(!on)}
        className={`relative h-8 w-14 shrink-0 rounded-control border-2 border-ink transition-colors ${
          on ? "bg-accent" : "bg-surface-alt"
        }`}
      >
        <span
          aria-hidden
          className={`absolute left-0.5 top-0.5 h-[22px] w-[22px] rounded-control transition-transform ${
            on ? "translate-x-6 bg-bg" : "bg-ink"
          }`}
        />
      </button>
    </div>
  );
}
