"use client";

import { nanoid } from "nanoid";
import {
  GeneratedRecipeSchema,
  type GenerateRequest,
  type MacroTarget,
  type Recipe,
} from "./schemas";
import { useRecipeStore, usePantryStore, usePrefsStore } from "./store";

// The Generation Client — the one interface every capture surface uses to
// turn the user's choices into a saved Recipe. It gathers standing inputs
// (Pantry, Dietary Preferences, Avoid List, Equipment) so callers can't
// forget them, maps the proxy's error taxonomy
// (GENERATION-CONTRACT.md) to typed modes, and saves the Recipe before
// returning. Screens render; this module owns the use case.

/** What the user chose on this screen, for this generation. */
export interface PerGenerationInputs {
  capturedIngredients: string[];
  macroTarget?: MacroTarget;
  mealSettings?: GenerateRequest["mealSettings"];
  allowOtherIngredients?: boolean;
}

/** Standing inputs that join every Generation Request automatically. */
interface StandingInputs {
  pantry: string[];
  dietary: string[];
  avoidList: string[];
  equipment: string[];
}

export type GenerationErrorKind =
  | "rate-limited"
  | "budget-exhausted"
  | "invalid-request"
  | "generation-failed";

export interface GenerationError {
  kind: GenerationErrorKind;
  message: string; // user-facing, one voice for every capture surface
  retryable: boolean;
}

export type GenerationResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; error: GenerationError };

const ERRORS: Record<GenerationErrorKind, GenerationError> = {
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
  "generation-failed": {
    kind: "generation-failed",
    message: "The kitchen hiccuped — your ingredients are safe, try again.",
    retryable: true,
  },
};

const STATUS_TO_KIND: Record<number, GenerationErrorKind> = {
  429: "rate-limited",
  402: "budget-exhausted",
  422: "invalid-request",
};

function hasPositiveValue(target?: MacroTarget): target is MacroTarget {
  return !!target && Object.values(target).some((v) => typeof v === "number" && v > 0);
}

/** Internal seam: pure Generation Request assembly. Exported for its tests. */
export function buildGenerateRequest(
  perGeneration: PerGenerationInputs,
  standing: StandingInputs
): GenerateRequest {
  return {
    capturedIngredients: perGeneration.capturedIngredients,
    pantry: standing.pantry,
    avoidList: standing.avoidList,
    dietary: standing.dietary,
    equipment: standing.equipment,
    mealSettings: perGeneration.mealSettings ?? {
      guests: 2,
      time: "medium",
      cuisine: "any",
    },
    ...(hasPositiveValue(perGeneration.macroTarget) && {
      macroTarget: perGeneration.macroTarget,
    }),
    allowOtherIngredients: perGeneration.allowOtherIngredients ?? false,
  };
}

function gatherStandingInputs(): StandingInputs {
  const { dietary, avoidList, equipment } = usePrefsStore.getState();
  return { pantry: usePantryStore.getState().pantry, dietary, avoidList, equipment };
}

export async function generateRecipe(
  perGeneration: PerGenerationInputs
): Promise<GenerationResult> {
  const request = buildGenerateRequest(perGeneration, gatherStandingInputs());

  let res: Response;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    return { ok: false, error: ERRORS["generation-failed"] };
  }

  if (!res.ok) {
    const kind = STATUS_TO_KIND[res.status] ?? "generation-failed";
    return { ok: false, error: ERRORS[kind] };
  }

  const generated = GeneratedRecipeSchema.safeParse(await res.json().catch(() => null));
  if (!generated.success) {
    return { ok: false, error: ERRORS["generation-failed"] };
  }

  const recipe: Recipe = {
    ...generated.data,
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    favorite: false,
    artSeed: Math.floor(Math.random() * 2 ** 31),
    // Macro Target is client-owned: providers never echo it back.
    nutrition: {
      ...generated.data.nutrition,
      estimated: true as const,
      ...(hasPositiveValue(perGeneration.macroTarget) && {
        macroTarget: perGeneration.macroTarget,
      }),
    },
  };

  useRecipeStore.getState().addRecipe(recipe);
  return { ok: true, recipe };
}
