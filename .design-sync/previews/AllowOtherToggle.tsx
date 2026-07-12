import { AllowOtherToggle } from "dishcover";

// Allow Other Ingredients (CONTEXT.md) — a per-generation switch on an
// ink-bordered surface card with a hand-written caption. Off: only fridge +
// pantry. On: extras get stamped "to buy". Controlled component.

export function Off() {
  return (
    <div style={{ width: 360 }}>
      <AllowOtherToggle on={false} onChange={() => {}} />
    </div>
  );
}

export function On() {
  return (
    <div style={{ width: 360 }}>
      <AllowOtherToggle on={true} onChange={() => {}} />
    </div>
  );
}
