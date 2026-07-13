"use client";

import { ScanResultSchema, type ScanIngredient } from "./schemas";

// The Scan Client — mirrors lib/generate-recipe.ts's role for the Scan
// capture surface: call the proxy, map the error taxonomy
// (GENERATION-CONTRACT.md) to typed modes. Nothing here touches a store —
// review and confirmation into Captured Ingredients is the screen's job.

export type ScanErrorKind =
  | "rate-limited"
  | "budget-exhausted"
  | "invalid-request"
  | "unreadable-photo"
  | "scan-failed";

export interface ScanError {
  kind: ScanErrorKind;
  message: string;
  retryable: boolean;
}

export type ScanPhotoResult =
  | { ok: true; ingredients: ScanIngredient[] }
  | { ok: false; error: ScanError };

const ERRORS: Record<ScanErrorKind, ScanError> = {
  "rate-limited": {
    kind: "rate-limited",
    message: "Take a breath — the kitchen needs a minute. Try again shortly.",
    retryable: true,
  },
  "budget-exhausted": {
    kind: "budget-exhausted",
    message: "Dishcover has cooked its fill for today — back tomorrow.",
    retryable: false,
  },
  "invalid-request": {
    kind: "invalid-request",
    message: "Something about this request didn't add up — tweak it and retry.",
    retryable: false,
  },
  "unreadable-photo": {
    kind: "unreadable-photo",
    message: "Couldn't read that photo — try one with better light, or type ingredients instead.",
    retryable: true,
  },
  "scan-failed": {
    kind: "scan-failed",
    message: "The kitchen hiccuped reading that photo — try again.",
    retryable: true,
  },
};

const STATUS_CODE_TO_KIND: Record<string, ScanErrorKind> = {
  RATE_LIMITED: "rate-limited",
  BUDGET_EXHAUSTED: "budget-exhausted",
  INVALID_REQUEST: "invalid-request",
  UNREADABLE_PHOTO: "unreadable-photo",
};

export async function scanPhoto(image: string): Promise<ScanPhotoResult> {
  let res: Response;
  try {
    res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
  } catch {
    return { ok: false, error: ERRORS["scan-failed"] };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: string } | null;
    const kind = (body?.code && STATUS_CODE_TO_KIND[body.code]) || "scan-failed";
    return { ok: false, error: ERRORS[kind] };
  }

  const parsed = ScanResultSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    return { ok: false, error: ERRORS["scan-failed"] };
  }

  return { ok: true, ingredients: parsed.data.ingredients };
}
