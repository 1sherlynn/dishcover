"use client";

import { STORE_KEYS, useStorageHealth, type StoreKey } from "@/lib/store";

// The error surface for a full device store (#40). Persistence is
// client-only (ADR-0002), so when localStorage rejects a write the recipe
// exists only in this session's memory — it will not survive a reload.
// Before this, that happened silently and saved recipes were lost.
//
// This says what happened and what the user can do about it *today*
// (delete some recipes). The recipe store's soft cap of ~200 with LRU
// eviction (docs/DATA-MODEL.md) counts entries, not bytes, so it does not
// help here — the quota is exhausted at roughly 60-120 recipes, long
// before the cap. What the app should do about *byte* exhaustion —
// eviction by size, compression, an IndexedDB migration, or amending
// ADR-0002 — is still an open decision (#40), so this reports and stops.

const LABELS: Record<StoreKey, string> = {
  [STORE_KEYS.recipes]: "recipe",
  [STORE_KEYS.pantry]: "pantry change",
  [STORE_KEYS.prefs]: "settings change",
  [STORE_KEYS.draft]: "draft",
};

export function StorageAlert() {
  const failedKey = useStorageHealth((s) => s.failedKey);
  const clearQuotaError = useStorageHealth((s) => s.clearQuotaError);

  if (!failedKey) return null;
  const what = LABELS[failedKey as StoreKey] ?? "change";

  return (
    <div
      role="alert"
      className="mb-5 border-2 border-danger bg-surface px-5 py-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-base font-bold uppercase tracking-wide text-danger">
            ⚠ Device storage is full
          </p>
          <p className="mt-1.5 text-sm font-bold leading-relaxed text-ink-soft">
            Your last {what} could not be saved to this device. It is still
            here for now, but it will be gone if you reload. Delete a few
            recipes from your cookbook to free up room.
          </p>
        </div>
        <button
          type="button"
          onClick={clearQuotaError}
          aria-label="Dismiss storage warning"
          className="grid h-8 w-8 shrink-0 place-items-center border-2 border-ink bg-surface text-sm font-bold transition-transform active:translate-y-0.5"
        >
          ×
        </button>
      </div>
    </div>
  );
}
