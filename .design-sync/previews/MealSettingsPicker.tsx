import { MealSettingsPicker } from "dishcover";

// Meal Settings (CONTEXT.md) — the per-generation knobs: a boxed guests
// stepper (−/+ ink boxes, + on teal), a Time segmented row, and Cuisine chips.
// Selected options fill plum; unselected use dashed ink borders. Controlled;
// values flow into the Generation Request via the screen.

export function Default() {
  return (
    <div style={{ width: 380 }}>
      <MealSettingsPicker
        value={{ guests: 2, time: "medium", cuisine: "italian" }}
        onChange={() => {}}
      />
    </div>
  );
}

export function DinnerParty() {
  return (
    <div style={{ width: 380 }}>
      <MealSettingsPicker
        value={{ guests: 6, time: "long", cuisine: "mediterranean" }}
        onChange={() => {}}
      />
    </div>
  );
}
