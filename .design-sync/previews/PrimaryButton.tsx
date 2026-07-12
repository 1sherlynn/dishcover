import { PrimaryButton } from "dishcover";

// Riso primary CTA — plum accent slab, 2px ink border, hard offset shadow,
// uppercase display type (DESIGN-SYSTEM.md §Morphology). The canonical action
// button used on Home ("+ ADD NEW RECIPE") and Build a Recipe ("COOK THIS UP ✦").

export function Default() {
  return (
    <div style={{ maxWidth: 360 }}>
      <PrimaryButton>Cook this up ✦</PrimaryButton>
    </div>
  );
}

export function AddNewRecipe() {
  return (
    <div style={{ maxWidth: 360 }}>
      <PrimaryButton>+ Add new recipe</PrimaryButton>
    </div>
  );
}

export function Submit() {
  return (
    <div style={{ maxWidth: 360 }}>
      <PrimaryButton type="submit">Save recipe</PrimaryButton>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ maxWidth: 360 }}>
      <PrimaryButton disabled>Cook this up ✦</PrimaryButton>
    </div>
  );
}
