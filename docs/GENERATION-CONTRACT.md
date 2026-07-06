# Dishcover — Generation Contract

The contract between the client, the stateless proxy (`/api/generate`, `/api/scan`), and the LLM (via Vercel AI SDK, provider-neutral per ADR-0003; default Gemini 2.5 Flash).

## POST /api/generate

### Request

```ts
interface GenerateRequest {
  capturedIngredients: string[];      // ≥1, the stars of the dish
  pantry: string[];
  avoidList: string[];
  dietary: string[];
  equipment: string[];
  mealSettings: {
    guests: number;                   // 1–8
    time: "fast" | "medium" | "long"; // <20 / 20–45 / 45+ min
    cuisine: string;                  // "any" | fixed cuisine list
  };
  macroTarget?: { proteinG?: number; carbsG?: number; fatG?: number }; // per serving, soft
  allowOtherIngredients: boolean;
}
```

### Prompting rules (system prompt encodes these; provider-neutral)

1. Build the dish around `capturedIngredients`; `pantry` is freely available support.
2. Never use anything on `avoidList`; honor every `dietary` filter strictly; require no equipment outside `equipment`.
3. If `allowOtherIngredients` is false, the ingredient list must be a subset of captured + pantry. If true, extras are allowed but must be marked `toBuy: true` and kept few.
4. `macroTarget` is a soft target: get close, never refuse; do not pad with implausible ingredients to hit numbers.
5. Every ingredient needs a realistic `grams` equivalent; per-serving nutrition must be self-consistent (kcal ≈ 4·protein + 4·carbs + 9·fat, ±10%).
6. Respect the time budget; steps get `timerSeconds` only where a real wait/cook duration exists.

### Response

`200` → the full `Recipe` object minus client-owned fields (`id`, `createdAt`, `favorite`, `artSeed` are added client-side). Generated via the AI SDK's structured-output mode against the zod schema from DATA-MODEL.md.

Self-consistency check (server-side, cheap): recompute kcal from macros; if off by >10%, adjust kcal to the computed value rather than re-rolling.

Validation failure → one automatic retry with the validation errors appended to the prompt. Second failure → `502 GENERATION_FAILED`.

## POST /api/scan

Request: `{ image: string }` (base64 JPEG/WebP, client-compressed ≤1MB, longest edge ≤1280px).
Response: `{ ingredients: { name: string; confidence: "high" | "low" }[] }` — food items only, canonical lowercase names, deduplicated. The client shows these as removable chips (low-confidence ones visually flagged) for user review; nothing enters a GenerateRequest unreviewed.

## Error taxonomy (both endpoints)

| HTTP | code | Client behavior |
|---|---|---|
| 429 | `RATE_LIMITED` | "Take a breath — try again in a minute." |
| 402 | `BUDGET_EXHAUSTED` | Daily spend cap hit: "Dishcover is resting until tomorrow." |
| 422 | `INVALID_REQUEST` / `UNREADABLE_PHOTO` | Inline form/photo guidance |
| 502 | `GENERATION_FAILED` | Retry button; keeps form state (draft store) |

## Proxy guardrails (ADR-0002)

- Per-IP sliding-window rate limit (e.g. 10 generations / 10 min) via Upstash or in-memory KV.
- Hard daily global spend cap: counter of estimated tokens/cost; trips `BUDGET_EXHAUSTED`.
- API keys only in server env vars; endpoints reject non-same-origin requests as a courtesy barrier.
