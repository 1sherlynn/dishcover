import { HeartButton } from "dishcover";

// Riso favorite toggle — ink-bordered square box; the heart fills plum (accent)
// when favorited, ink-soft outline when not. Used on Recipe Detail and cards.

export function Empty() {
  return <HeartButton filled={false} onClick={() => {}} />;
}

export function Filled() {
  return <HeartButton filled onClick={() => {}} />;
}
