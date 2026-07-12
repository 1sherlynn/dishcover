import { PlaceholderArt } from "dishcover";

// Seeded riso dish art — four archetypes (bowl-with-chopsticks, plated fillet,
// sesame bowl, steak-and-fries) drawn deterministically from `seed`: ink
// outlines with hand wobble, misregistered spot fills, halftone dots, steam.
// Which archetype appears is a function of the seed, so cells are labelled by
// seed rather than by dish.

function Framed({ seed }: { seed: number }) {
  return (
    <div
      style={{
        width: 220,
        border: "2px solid var(--th-ink)",
        borderRadius: "var(--th-radius-card)",
        overflow: "hidden",
        boxShadow: "var(--th-shadow-card)",
      }}
    >
      <PlaceholderArt seed={seed} className="block h-auto w-full" />
    </div>
  );
}

export function Framed_OnRecipeDetail() {
  return <Framed seed={7} />;
}

export function SeededRange() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 120px)", gap: 12 }}>
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <PlaceholderArt
          key={s}
          seed={s}
          className="block h-auto w-full"
        />
      ))}
    </div>
  );
}
