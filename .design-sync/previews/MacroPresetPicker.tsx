import { MacroPresetPicker } from "dishcover";

// Macro Preset picker (CONTEXT.md) — dashed preset chips (Balanced, High
// Protein, Low Carb, Keto-ish, Custom, None); picking one reveals three
// editable per-serving gram fields. Presets are entry points, not fixed modes,
// so every gram stays editable. Self-managed state (starts on "None"); the
// revealed gram fields are an interaction state, shown after a preset is
// tapped in the live app.

export function Default() {
  return (
    <div style={{ width: 380 }}>
      <MacroPresetPicker onChange={() => {}} />
    </div>
  );
}
