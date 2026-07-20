import { describe, expect, it, vi } from "vitest";
import { isQuotaExceeded, createGuardedStorage } from "./storage-guard";

// #40: persistence is client-only (ADR-0002) and writes to localStorage had
// no quota handling and no error surface. At ~60-120 recipes the quota is
// exhausted, the write fails, and because recipe text shares the store,
// saved recipes are lost silently.
//
// SCOPE: detect the failure and report it. Eviction, compression and an
// IndexedDB migration are all still open (see the issue) — this guard
// deliberately does not choose between them, it only makes the failure
// impossible to miss.

/** A DOMException-shaped quota error as each engine actually throws it. */
function quotaError(name: string, code?: number): Error {
  const err = new Error("quota");
  err.name = name;
  if (code !== undefined) Object.defineProperty(err, "code", { value: code });
  return err;
}

describe("isQuotaExceeded", () => {
  it("recognises the standard DOMException name", () => {
    expect(isQuotaExceeded(quotaError("QuotaExceededError"))).toBe(true);
  });

  it("recognises Firefox's name", () => {
    expect(isQuotaExceeded(quotaError("NS_ERROR_DOM_QUOTA_REACHED"))).toBe(true);
  });

  it("recognises the legacy numeric codes", () => {
    expect(isQuotaExceeded(quotaError("Whatever", 22))).toBe(true);
    expect(isQuotaExceeded(quotaError("Whatever", 1014))).toBe(true);
  });

  it("does not treat unrelated errors as quota failures", () => {
    expect(isQuotaExceeded(new Error("network down"))).toBe(false);
    expect(isQuotaExceeded(quotaError("SecurityError", 18))).toBe(false);
  });

  it("tolerates non-error throwables", () => {
    expect(isQuotaExceeded("boom")).toBe(false);
    expect(isQuotaExceeded(null)).toBe(false);
    expect(isQuotaExceeded(undefined)).toBe(false);
  });
});

/** In-memory Storage stub whose setItem can be made to fail. */
function fakeStorage(opts: { failWith?: unknown } = {}) {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.failWith) throw opts.failWith;
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    _map: map,
  };
}

describe("createGuardedStorage", () => {
  it("passes reads and writes straight through when there is room", () => {
    const backing = fakeStorage();
    const onQuotaExceeded = vi.fn();
    const guarded = createGuardedStorage(backing, onQuotaExceeded);

    guarded.setItem("k", "v");

    expect(guarded.getItem("k")).toBe("v");
    expect(backing._map.get("k")).toBe("v");
    expect(onQuotaExceeded).not.toHaveBeenCalled();
  });

  it("reports the key that could not be written when quota is exhausted", () => {
    const backing = fakeStorage({ failWith: quotaError("QuotaExceededError") });
    const onQuotaExceeded = vi.fn();
    const guarded = createGuardedStorage(backing, onQuotaExceeded);

    guarded.setItem("dishcover.recipes.v1", "…");

    expect(onQuotaExceeded).toHaveBeenCalledTimes(1);
    expect(onQuotaExceeded).toHaveBeenCalledWith("dishcover.recipes.v1");
  });

  it("does not throw on quota failure, so the UI survives the write", () => {
    // The recipe is already in memory; throwing here would take down the
    // render that just added it. The banner is what tells the user.
    const backing = fakeStorage({ failWith: quotaError("QuotaExceededError") });
    const guarded = createGuardedStorage(backing, () => {});

    expect(() => guarded.setItem("k", "v")).not.toThrow();
  });

  it("reports every failed write, so a banner cannot go stale", () => {
    const backing = fakeStorage({ failWith: quotaError("QuotaExceededError") });
    const onQuotaExceeded = vi.fn();
    const guarded = createGuardedStorage(backing, onQuotaExceeded);

    guarded.setItem("a", "1");
    guarded.setItem("b", "2");

    expect(onQuotaExceeded).toHaveBeenCalledTimes(2);
  });

  it("rethrows errors that are not about quota", () => {
    // A SecurityError means storage is blocked entirely — a different
    // problem, and silently swallowing it would hide a real bug.
    const boom = quotaError("SecurityError", 18);
    const backing = fakeStorage({ failWith: boom });
    const onQuotaExceeded = vi.fn();
    const guarded = createGuardedStorage(backing, onQuotaExceeded);

    expect(() => guarded.setItem("k", "v")).toThrow(boom);
    expect(onQuotaExceeded).not.toHaveBeenCalled();
  });

  it("passes removeItem through", () => {
    const backing = fakeStorage();
    const guarded = createGuardedStorage(backing, () => {});
    guarded.setItem("k", "v");

    guarded.removeItem("k");

    expect(guarded.getItem("k")).toBeNull();
  });
});
