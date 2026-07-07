// Riso dish art (DESIGN-SYSTEM.md §Dish art): seeded risograph illustrations
// in four archetypes — bowl-with-chopsticks, plated fillet, sesame bowl,
// steak-and-fries. Ink outlines with hand wobble, spot-color fills sitting
// slightly misregistered, halftone dots, steam. Deterministic from artSeed;
// interface unchanged from the previous generator.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The Ink Kit spot inks (raw values by design — this module IS the riso art)
const INK = "#2e2620";
const SPOT = {
  teal: "#1e958a",
  mustard: "#e3a21e",
  moss: "#77ab4c",
  plum: "#b85f87",
  blueberry: "#4e74b8",
  cream: "#f3e7c8",
};

/** Slightly wobbly ellipse path — hand-drawn ink, not a perfect oval. */
function wobblyEllipse(cx: number, cy: number, rx: number, ry: number, rnd: () => number) {
  const pts = 10;
  let d = "";
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const jx = (rnd() - 0.5) * rx * 0.06;
    const jy = (rnd() - 0.5) * ry * 0.08;
    const x = cx + Math.cos(a) * rx + jx;
    const y = cy + Math.sin(a) * ry + jy;
    d += i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + " Z";
}

function Steam({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <path
      d={`M${x} ${y} q 6 -8 0 -15 q -6 -8 0 -15 M${x + 16} ${y + 3} q 6 -8 0 -15 q -6 -8 0 -15`}
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
    />
  );
}

export function PlaceholderArt({ seed, className }: { seed: number; className?: string }) {
  const rnd = mulberry32(seed);
  const archetype = Math.floor(rnd() * 4);
  const htId = `ht-${seed}`;
  const fillColor = [SPOT.mustard, SPOT.moss, SPOT.plum, SPOT.teal][Math.floor(rnd() * 4)];
  const accentColor = [SPOT.teal, SPOT.plum, SPOT.mustard, SPOT.moss][Math.floor(rnd() * 4)];
  // misregistration offset for the spot layer
  const mx = 2 + rnd() * 2;
  const my = -(1 + rnd() * 2);

  const bowl = (
    <g>
      {/* spot fill, misregistered */}
      <g transform={`translate(${mx} ${my})`} opacity="0.9">
        <ellipse cx="160" cy="96" rx="62" ry="16" fill={fillColor} />
        <path d="M100 100 Q160 158 220 100 L214 118 Q160 156 106 118 Z" fill={SPOT.cream} />
      </g>
      {/* halftone inside the bowl */}
      <ellipse cx="160" cy="96" rx="56" ry="13" fill={`url(#${htId})`} />
      {/* ink outlines */}
      <path d={wobblyEllipse(160, 96, 62, 16, rnd)} fill="none" stroke={INK} strokeWidth="3.5" />
      <path
        d="M98 100 Q160 160 222 100"
        fill="none"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M138 158 h44" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      {/* chopsticks */}
      <g stroke={INK} strokeWidth="4" strokeLinecap="round">
        <path d="M150 88 L216 30" />
        <path d="M166 92 L224 40" />
      </g>
      {/* morsels */}
      <ellipse cx="140" cy="90" rx="12" ry="6" fill={accentColor} transform="rotate(-8 140 90)" />
      <ellipse cx="172" cy="93" rx="10" ry="5" fill={fillColor} transform="rotate(6 172 93)" />
      <Steam x={118} y={62} color={accentColor} />
    </g>
  );

  const plate = (
    <g>
      <g transform={`translate(${mx} ${my})`} opacity="0.9">
        <ellipse cx="160" cy="102" rx="78" ry="34" fill={SPOT.cream} />
        <ellipse cx="150" cy="98" rx="30" ry="12" fill={fillColor} />
        <ellipse cx="196" cy="106" rx="14" ry="7" fill={accentColor} />
      </g>
      <ellipse cx="150" cy="98" rx="26" ry="9" fill={`url(#${htId})`} />
      <path d={wobblyEllipse(160, 102, 78, 34, rnd)} fill="none" stroke={INK} strokeWidth="3.5" />
      <path d={wobblyEllipse(160, 102, 56, 22, rnd)} fill="none" stroke={INK} strokeWidth="2" opacity="0.5" />
      {/* fillet hatching */}
      <g stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M136 94 q 6 4 12 1" fill="none" />
        <path d="M146 100 q 6 4 12 1" fill="none" />
      </g>
      {/* fork */}
      <g stroke={INK} strokeWidth="3" strokeLinecap="round">
        <path d="M248 76 v40" />
        <path d="M243 76 v12 M253 76 v12" />
      </g>
      <Steam x={140} y={70} color={accentColor} />
    </g>
  );

  const sesameBowl = (
    <g>
      <g transform={`translate(${mx} ${my})`} opacity="0.9">
        <path d="M96 92 Q160 96 224 92 L212 134 Q160 150 108 134 Z" fill={fillColor} />
        <ellipse cx="160" cy="92" rx="64" ry="14" fill={SPOT.cream} />
      </g>
      <ellipse cx="160" cy="92" rx="58" ry="11" fill={`url(#${htId})`} />
      <path d={wobblyEllipse(160, 92, 64, 14, rnd)} fill="none" stroke={INK} strokeWidth="3.5" />
      <path
        d="M96 94 Q108 140 160 144 Q212 140 224 94"
        fill="none"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* greens + sesame */}
      <g fill={accentColor}>
        <ellipse cx="138" cy="88" rx="10" ry="4" transform="rotate(-14 138 88)" />
        <ellipse cx="178" cy="90" rx="11" ry="4" transform="rotate(10 178 90)" />
      </g>
      <g fill={INK}>
        <circle cx="150" cy="86" r="1.6" />
        <circle cx="162" cy="90" r="1.6" />
        <circle cx="170" cy="84" r="1.6" />
        <circle cx="144" cy="93" r="1.6" />
      </g>
      <Steam x={196} y={64} color={fillColor} />
    </g>
  );

  const steak = (
    <g>
      <g transform={`translate(${mx} ${my})`} opacity="0.9">
        <ellipse cx="160" cy="104" rx="80" ry="34" fill={SPOT.cream} />
        <path d="M112 96 q 14 -18 40 -12 q 18 4 14 20 q -4 14 -28 14 q -26 -2 -26 -22" fill={SPOT.plum} />
        {/* fries */}
        <g fill={SPOT.mustard}>
          <rect x="188" y="80" width="7" height="30" rx="2" transform="rotate(8 191 95)" />
          <rect x="198" y="78" width="7" height="32" rx="2" transform="rotate(-6 201 94)" />
          <rect x="208" y="82" width="7" height="28" rx="2" transform="rotate(14 211 96)" />
        </g>
      </g>
      <path d="M112 96 q 14 -18 40 -12 q 18 4 14 20 q -4 14 -28 14 q -26 -2 -26 -22" fill={`url(#${htId})`} stroke={INK} strokeWidth="3.5" />
      <path d={wobblyEllipse(160, 104, 80, 34, rnd)} fill="none" stroke={INK} strokeWidth="3.5" />
      <g stroke={INK} strokeWidth="2.5" strokeLinecap="round">
        <path d="M186 82 l6 26 M196 80 l4 28 M208 84 l4 24" fill="none" opacity="0.8" />
      </g>
      {/* grill marks */}
      <g stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M124 92 l 22 10 M132 86 l 22 10" />
      </g>
    </g>
  );

  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-hidden="true">
      <defs>
        <pattern id={htId} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.4" fill={INK} opacity="0.25" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill="var(--th-surface-alt)" />
      {[bowl, plate, sesameBowl, steak][archetype]}
    </svg>
  );
}
