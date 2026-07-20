// Quota detection for device-local persistence (#40).
//
// Persistence is client-only (ADR-0002). Recipes accumulate in localStorage
// and at roughly 60-120 recipes the quota is exhausted — the write throws,
// zustand's persist middleware swallows it, and because recipe text shares
// the store, saved recipes are lost with no error anywhere.
//
// SCOPE: this module detects the failure and reports it. It deliberately
// does NOT choose an eviction policy, a compression scheme, or an
// IndexedDB migration — those differ enormously in scope and are still an
// open decision on the issue. What it guarantees is that the failure stops
// being silent.

/** Legacy numeric codes engines used before the DOMException name settled. */
const QUOTA_CODES = new Set([22, 1014]);
const QUOTA_NAMES = new Set(["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"]);

/** True when a thrown value is localStorage telling us it is full. */
export function isQuotaExceeded(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const { name, code } = err as { name?: unknown; code?: unknown };
  if (typeof name === "string" && QUOTA_NAMES.has(name)) return true;
  return typeof code === "number" && QUOTA_CODES.has(code);
}

/** The subset of the Storage interface zustand's persist middleware uses. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Wrap a Storage so quota failures are reported instead of vanishing.
 *
 * A failed write does not throw: the data is already in the in-memory
 * store, and throwing here would take down the render that just produced
 * it. The `onQuotaExceeded` callback is what surfaces the problem — every
 * failed write fires it, so a banner driven by it cannot go stale.
 *
 * Errors that are not about quota (a SecurityError from storage being
 * blocked outright, say) are rethrown — swallowing those would hide a
 * genuinely different bug.
 */
export function createGuardedStorage(
  backing: StorageLike,
  onQuotaExceeded: (key: string) => void
): StorageLike {
  return {
    getItem: (key) => backing.getItem(key),
    removeItem: (key) => backing.removeItem(key),
    setItem: (key, value) => {
      try {
        backing.setItem(key, value);
      } catch (err) {
        if (!isQuotaExceeded(err)) throw err;
        onQuotaExceeded(key);
      }
    },
  };
}
