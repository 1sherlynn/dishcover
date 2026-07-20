# Dishcover — Data Model

All data is device-local (ADR-0002). Persistence: `localStorage`, one key per store, every payload wrapped in `{ version: number, data: T }` and validated with zod on read; unknown versions run through a migration map. Terminology per [CONTEXT.md](../CONTEXT.md).

## Core types

```ts
type Unit = "g" | "ml" | "piece" | "tbsp" | "tsp" | "pinch";

interface RecipeIngredient {
  name: string;            // canonical lowercase, e.g. "chicken breast"
  quantity: number;        // in `unit`, for display; scales with servings
  unit: Unit;
  grams: number;           // REQUIRED gram/ml-equivalent estimate (ADR-0001:
                           // enables future USDA lookup even for "2 tbsp")
  toBuy: boolean;          // true when introduced via Allow Other Ingredients
}

interface RecipeStep {
  title: string;           // "Cook the chicken"
  body: string;
  timerSeconds?: number;   // presence renders a timer in Cooking Mode
}

interface NutritionPerServing {
  kcal: number;
  proteinG: number; carbsG: number; fatG: number;
  fiberG: number; sugarG: number; satFatG: number;
  sodiumMg: number; potassiumMg: number; calciumMg: number;
  ironMg: number; vitaminCMg: number; vitaminDMcg: number;
}

interface MacroTarget {        // per-serving grams; all optional — set only what you care about
  proteinG?: number; carbsG?: number; fatG?: number;
}

interface Recipe {
  id: string;                  // nanoid
  createdAt: string;           // ISO
  title: string;
  description: string;
  tag: string;                 // vibe chip, e.g. "Fresh", "Comfort"
  cuisine: string;
  difficulty: "easy" | "medium" | "hard";
  timeMinutes: number;
  baseServings: number;        // as generated; stepper rescales from this
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: {
    perServing: NutritionPerServing;   // at baseServings
    estimated: true;                   // literal until USDA pipeline lands
    macroTarget?: MacroTarget;         // what the user asked for, if anything
  };
  favorite: boolean;
  artSeed: number;             // deterministic placeholder-art variant
}
```

Servings rescaling is pure presentation: `factor = servings / baseServings`, applied to ingredient quantities/grams; `NutritionPerServing` is already per-serving so the panel is factor-independent (totals view, if ever added, multiplies).

## Preference stores

```ts
interface Preferences {
  dietary: string[];           // from the fixed Dietary Preference chip set
  avoidList: string[];         // free text, canonical lowercase
  equipment: string[];         // from the fixed Equipment chip set
  theme: string;               // reserved; "riso" since ADR-0004 retired the
                               // original four themes — values TBD by the
                               // future theme issue
}

type Pantry = string[];        // ingredient names, canonical form (see below)

interface Draft {               // in-progress New Recipe form (issue #8)
  ingredients: string[];        // captured chips, canonical lowercase
  macroTarget?: MacroTarget;
  mealSettings: { guests: number; time: "fast" | "medium" | "long"; cuisine: string };
  allowOtherIngredients: boolean;
}
```

## Storage keys

| Key | Contents |
|---|---|
| `dishcover.recipes.v1` | `Recipe[]` (newest first, soft cap ~200 with LRU eviction of non-favorites) |
| `dishcover.pantry.v1` | `Pantry` (**v2** — canonical singular; see Pantry canonical form) |
| `dishcover.prefs.v1` | `Preferences` |
| `dishcover.draft.v1` | `Draft` — in-progress New Recipe form (survives accidental refresh); cleared on successful generation |

### Pantry canonical form

A Pantry staple is stored trimmed, lowercased, internally whitespace-collapsed,
and with its head noun folded to singular — `"  Sun Dried Tomatoes "` is stored
as `"sun dried tomato"`. Mass nouns that merely end in `-s` (`"molasses"`,
`"couscous"`) are left alone. `lib/pantry.ts` owns this; nothing else should
re-implement it.

Adding is guarded against the same item arriving in another form, so
`"tomatoes"` and `"tomato"` cannot both occupy the shelf (#42).

`dishcover.pantry.v1` predates this rule and holds plurals. The store migrates
v1 → v2 on rehydrate, folding each entry and collapsing any duplicates the fold
creates. Full linguistic normalisation is explicitly out of scope, and whether
the Pantry should have a controlled vocabulary at all remains an open design
question.

### Storage quota

Writes go through the guard in `lib/storage-guard.ts`, which detects
`QuotaExceededError` and reports it to the storage-health store rather than
letting the write fail silently — at roughly 60-120 recipes the quota is
exhausted, well before the recipe soft cap above, and recipe data was being
lost with no error surface (#40). The guard only reports; how the app should
*recover* from a full store is still an open decision.

State management: Zustand stores hydrated from these keys, write-through on change. No server persistence of any kind; the LLM proxy is stateless.
