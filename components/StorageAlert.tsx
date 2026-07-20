"use client";

import { useStorageHealth } from "@/lib/store";

// The error surface for a full device store (#40). Persistence is
// client-only (ADR-0002), so when localStorage rejects a write the recipe
// exists only in this session's memory — it will not survive a reload.
// Before this, that happened silently and saved recipes were lost.
//
// This says what happened and what the user can do about it *today*
// (delete some recipes). It does not evict anything on their behalf: what
// the app should do about a full store — LRU eviction, compression, an
// IndexedDB migration, or amending ADR-0002 — is still an open decision.

const LABELS: Record<string, string> = {
  "dishcover.recipes.v1": "recipe",
  "dishcover.pantry.v1": "pantry change",
  "dishcover.prefs.v1": "settings change",
  "dishcover.draft.v1": "draft",
};

export function StorageAlert() {
  const failedKey = useStorageHealth((s) => s.failedKey);
  const clearQuotaError = useStorageHealth((s) => s.clearQuotaError);

  if (!failedKey) return null;
  const what = LABELS[failedKey] ?? "change";

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
