import { describe, it, expect } from "vitest";
import { createRateGuard } from "./rate-guard";

const DAY = 24 * 60 * 60 * 1000;

function clockAt(start: number) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => (t += ms),
  };
}

describe("createRateGuard", () => {
  it("allows requests under the per-IP limit and blocks at the limit", () => {
    const clock = clockAt(0);
    const guard = createRateGuard({ perIpLimit: 3, dailyCap: 100, now: clock.now });

    expect(guard("a")).toBeNull();
    expect(guard("a")).toBeNull();
    expect(guard("a")).toBeNull();
    expect(guard("a")).toEqual({ code: "RATE_LIMITED", status: 429 });
  });

  it("tracks IPs independently", () => {
    const clock = clockAt(0);
    const guard = createRateGuard({ perIpLimit: 1, dailyCap: 100, now: clock.now });

    expect(guard("a")).toBeNull();
    expect(guard("b")).toBeNull();
    expect(guard("a")?.code).toBe("RATE_LIMITED");
  });

  it("frees the window after windowMs elapses", () => {
    const clock = clockAt(0);
    const guard = createRateGuard({
      perIpLimit: 1,
      dailyCap: 100,
      windowMs: 1000,
      now: clock.now,
    });

    expect(guard("a")).toBeNull();
    expect(guard("a")?.code).toBe("RATE_LIMITED");
    clock.advance(1001);
    expect(guard("a")).toBeNull();
  });

  it("enforces the global daily cap across IPs", () => {
    const clock = clockAt(0);
    const guard = createRateGuard({ perIpLimit: 10, dailyCap: 2, now: clock.now });

    expect(guard("a")).toBeNull();
    expect(guard("b")).toBeNull();
    expect(guard("c")).toEqual({ code: "BUDGET_EXHAUSTED", status: 402 });
  });

  it("resets the daily cap on day rollover", () => {
    const clock = clockAt(0);
    const guard = createRateGuard({ perIpLimit: 10, dailyCap: 1, now: clock.now });

    expect(guard("a")).toBeNull();
    expect(guard("a")?.code).toBe("BUDGET_EXHAUSTED");
    clock.advance(DAY);
    expect(guard("a")).toBeNull();
  });

  it("rate-limit rejections do not consume daily budget", () => {
    const clock = clockAt(0);
    const guard = createRateGuard({ perIpLimit: 1, dailyCap: 2, now: clock.now });

    expect(guard("a")).toBeNull();
    expect(guard("a")?.code).toBe("RATE_LIMITED"); // blocked, must not count
    expect(guard("b")).toBeNull(); // second budget slot still available
  });
});
