// Theme-aware generative placeholder art (no AI images in MVP — PRODUCT-SPEC).
// Hearth style: hand-drawn ingredient doodles scattered on a cream blob.
// Deterministic from the recipe's artSeed so cards never reshuffle.

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

const PALETTE = ["#2e4633", "#e8542f", "#f5a83c", "#b98a6f", "#7fa06b"];

type Doodle = (cx: number, cy: number, s: number, c: string, key: number) => React.ReactNode;

const doodles: Doodle[] = [
  // leaf
  (cx, cy, s, c, key) => (
    <g key={key} transform={`translate(${cx} ${cy}) rotate(${(cx * 7) % 360})`}>
      <path
        d={`M0 ${-s} Q ${s} 0 0 ${s} Q ${-s} 0 0 ${-s} Z`}
        fill="none" stroke={c} strokeWidth={s / 5}
      />
      <line x1={0} y1={-s * 0.6} x2={0} y2={s * 0.6} stroke={c} strokeWidth={s / 7} />
    </g>
  ),
  // onion-ish bulb
  (cx, cy, s, c, key) => (
    <g key={key} transform={`translate(${cx} ${cy})`}>
      <circle r={s * 0.8} fill="none" stroke={c} strokeWidth={s / 5} />
      <path d={`M0 ${-s * 0.8} Q ${s * 0.35} ${-s * 1.3} 0 ${-s * 1.5}`} fill="none" stroke={c} strokeWidth={s / 6} />
    </g>
  ),
  // pepper dots
  (cx, cy, s, c, key) => (
    <g key={key} fill={c}>
      <circle cx={cx} cy={cy} r={s / 4} />
      <circle cx={cx + s * 0.8} cy={cy + s * 0.4} r={s / 5} />
      <circle cx={cx - s * 0.5} cy={cy + s * 0.7} r={s / 6} />
    </g>
  ),
  // steam squiggle
  (cx, cy, s, c, key) => (
    <path
      key={key}
      d={`M${cx} ${cy} q ${s * 0.5} ${-s * 0.6} 0 ${-s * 1.2} q ${-s * 0.5} ${-s * 0.6} 0 ${-s * 1.2}`}
      fill="none" stroke={c} strokeWidth={s / 5} strokeLinecap="round"
    />
  ),
  // carrot triangle
  (cx, cy, s, c, key) => (
    <g key={key} transform={`translate(${cx} ${cy}) rotate(${(cy * 11) % 360})`}>
      <path d={`M0 ${-s} L ${s * 0.45} ${s * 0.7} Q 0 ${s * 1.1} ${-s * 0.45} ${s * 0.7} Z`} fill="none" stroke={c} strokeWidth={s / 5} strokeLinejoin="round" />
    </g>
  ),
];

export function PlaceholderArt({ seed, className }: { seed: number; className?: string }) {
  const rnd = mulberry32(seed);
  const blobRot = rnd() * 360;
  const items = Array.from({ length: 7 }, (_, i) => {
    const angle = (i / 7) * Math.PI * 2 + rnd() * 0.8;
    const dist = 52 + rnd() * 62;
    return {
      cx: 160 + Math.cos(angle) * dist * 1.35,
      cy: 100 + Math.sin(angle) * dist * 0.72,
      s: 9 + rnd() * 9,
      color: PALETTE[Math.floor(rnd() * PALETTE.length)],
      kind: Math.floor(rnd() * doodles.length),
    };
  });

  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-hidden="true">
      <rect width="320" height="200" fill="var(--th-surface-alt)" />
      <g transform={`rotate(${blobRot} 160 100)`}>
        <ellipse cx="160" cy="100" rx="98" ry="64" fill="var(--th-surface)" opacity="0.9" />
      </g>
      <ellipse cx="160" cy="104" rx="64" ry="40" fill="none" stroke="var(--th-ink)" strokeWidth="3" opacity="0.85" />
      <ellipse cx="160" cy="104" rx="46" ry="28" fill="none" stroke="var(--th-ink)" strokeWidth="1.6" opacity="0.4" />
      {items.map((d, i) => doodles[d.kind](d.cx, d.cy, d.s, d.color, i))}
    </svg>
  );
}
