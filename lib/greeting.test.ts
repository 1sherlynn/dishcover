import { describe, expect, it } from "vitest";
import { greetingAt, msUntilNextGreeting } from "./greeting";

// #43: greeting() read `new Date().getHours()` at render only, so a tab
// left open past noon kept saying "Good morning" all day. The pure
// function takes its clock as an argument; the hook (see useGreeting)
// schedules a re-render on the boundary using msUntilNextGreeting.

const at = (h: number, m = 0, s = 0) => new Date(2026, 6, 19, h, m, s);

describe("greetingAt", () => {
  it("says morning before noon", () => {
    expect(greetingAt(at(0))).toBe("Good morning");
    expect(greetingAt(at(11, 59, 59))).toBe("Good morning");
  });

  it("switches to afternoon exactly at noon", () => {
    expect(greetingAt(at(12))).toBe("Good afternoon");
    expect(greetingAt(at(17, 59, 59))).toBe("Good afternoon");
  });

  it("switches to evening exactly at 18:00", () => {
    expect(greetingAt(at(18))).toBe("Good evening");
    expect(greetingAt(at(23, 59, 59))).toBe("Good evening");
  });
});

describe("msUntilNextGreeting", () => {
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;

  it("counts down to noon during the morning", () => {
    expect(msUntilNextGreeting(at(11, 0))).toBe(HOUR);
  });

  it("counts down to 18:00 during the afternoon", () => {
    expect(msUntilNextGreeting(at(17, 30))).toBe(30 * MINUTE);
  });

  it("counts down to midnight during the evening", () => {
    expect(msUntilNextGreeting(at(23, 0))).toBe(HOUR);
  });

  it("is always positive, so a timer can never spin", () => {
    // A zero or negative delay would schedule a setTimeout that fires
    // immediately and reschedules forever.
    for (const h of [0, 11, 12, 17, 18, 23]) {
      for (const m of [0, 59]) {
        expect(msUntilNextGreeting(at(h, m))).toBeGreaterThan(0);
      }
    }
  });

  it("lands exactly on the boundary, where the greeting actually changes", () => {
    const now = at(11, 59, 59);
    const next = new Date(now.getTime() + msUntilNextGreeting(now));
    expect(greetingAt(next)).not.toBe(greetingAt(now));
  });
});
