"use client";

import { useEffect, useState } from "react";

// The time-of-day greeting (#43). It used to read the clock at render
// only, so a tab left open past noon kept saying "Good morning" all day.
//
// The rule lives in a pure function that takes its clock as an argument;
// the hook re-renders exactly on the boundary where the wording changes,
// rather than polling on an interval.

const NOON = 12;
const EVENING = 18;

/** The greeting for a given moment. */
export function greetingAt(now: Date): string {
  const h = now.getHours();
  return h < NOON ? "Good morning" : h < EVENING ? "Good afternoon" : "Good evening";
}

/**
 * Milliseconds until the greeting next changes wording — the coming noon,
 * 18:00, or midnight. Always strictly positive, so a timer built on it can
 * never fire immediately and spin.
 */
export function msUntilNextGreeting(now: Date): number {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  const h = now.getHours();
  next.setHours(h < NOON ? NOON : h < EVENING ? EVENING : 24);
  return next.getTime() - now.getTime();
}

/** The current greeting, re-rendering when it goes stale. */
export function useGreeting(): string {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Read the clock after mount only: the server has no business guessing
    // the user's time of day, and doing so would mismatch on hydration.
    const tick = () => setNow(new Date());
    tick();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const current = new Date();
      timer = setTimeout(() => {
        tick();
        schedule();
      }, msUntilNextGreeting(current));
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return now ? greetingAt(now) : "";
}
