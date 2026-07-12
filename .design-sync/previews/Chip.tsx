import { Chip } from "dishcover";

// Riso chip — 2px ink border, near-square control radius. Selected chips fill
// plum (accent) with paper text; add-chips use a dashed border + plum "+";
// removable chips carry an ink "×" box. Used for pantry items, suggestions,
// and macro presets across the zine.

export function Selected() {
  return <Chip selected>Chicken thigh</Chip>;
}

export function Unselected() {
  return <Chip>Basmati rice</Chip>;
}

export function Removable() {
  return (
    <Chip onRemove={() => {}}>Cherry tomatoes</Chip>
  );
}

export function AddChip() {
  return (
    <Chip onClick={() => {}}>Garlic</Chip>
  );
}

export function Row() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Chip selected>Eggs</Chip>
      <Chip>Spinach</Chip>
      <Chip onRemove={() => {}}>Feta</Chip>
      <Chip onClick={() => {}}>Olive oil</Chip>
    </div>
  );
}
