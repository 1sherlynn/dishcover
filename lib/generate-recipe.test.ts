// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from "vitest";
import { GenerateRequestSchema } from "./schemas";
import { mockRecipe } from "./mock-recipe";

// The Generation Client owns the whole use case: gather standing inputs,
// build the Generation Request (CONTEXT.md), call the proxy, map the error
// taxonomy to typed modes, assemble and SAVE the Recipe. Stores persist via
// localStorage at module scope — stub it before importing.

function stubLocalStorage() {
  const data = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  } as Storage;
}

let generateRecipe: typeof import("./generate-recipe").generateRecipe;
let buildGenerateRequest: typeof import("./generate-recipe").buildGenerateRequest;
let useRecipeStore: typeof import("./store").useRecipeStore;
let usePantryStore: typeof import("./store").usePantryStore;
let usePrefsStore: typeof import("./store").usePrefsStore;

beforeAll(async () => {
  stubLocalStorage();
  ({ generateRecipe, buildGenerateRequest } = await import("./generate-recipe"));
  ({ useRecipeStore, usePantryStore, usePrefsStore } = await import("./store"));
});

beforeEach(() => {
  useRecipeStore.setState({ recipes: [] });
  usePantryStore.setState({ pantry: [] });
  usePrefsStore.setState({ dietary: [], avoidList: [], equipment: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const sampleGenerated = () =>
  mockRecipe(GenerateRequestSchema.parse({ capturedIngredients: ["eggs"] }));

function stubFetchOk(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
}

function stubFetchError(status: number, code: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code }), { status })));
}

describe("buildGenerateRequest (internal seam)", () => {
  it("combines per-generation choices with standing inputs", () => {
    const req = buildGenerateRequest(
      { capturedIngredients: ["chicken breast"], macroTarget: { proteinG: 45 } },
      {
        pantry: ["olive oil", "salt"],
        dietary: ["vegan"],
        avoidList: ["cilantro"],
        equipment: ["stove", "oven"],
      }
    );
    expect(req.capturedIngredients).toEqual(["chicken breast"]);
    expect(req.pantry).toEqual(["olive oil", "salt"]);
    expect(req.dietary).toEqual(["vegan"]);
    expect(req.avoidList).toEqual(["cilantro"]);
    expect(req.equipment).toEqual(["stove", "oven"]);
    expect(req.macroTarget).toEqual({ proteinG: 45 });
  });

  it("fills Meal Settings defaults and allowOtherIngredients=false", () => {
    const req = buildGenerateRequest(
      { capturedIngredients: ["eggs"] },
      { pantry: [], dietary: [], avoidList: [], equipment: [] }
    );
    expect(req.mealSettings).toEqual({ guests: 2, time: "medium", cuisine: "any" });
    expect(req.allowOtherIngredients).toBe(false);
  });

  it("passes chosen Meal Settings and allowOtherIngredients through unchanged", () => {
    const req = buildGenerateRequest(
      {
        capturedIngredients: ["eggs"],
        mealSettings: { guests: 6, time: "fast", cuisine: "asian" },
        allowOtherIngredients: true,
      },
      { pantry: [], dietary: [], avoidList: [], equipment: [] }
    );
    expect(req.mealSettings).toEqual({ guests: 6, time: "fast", cuisine: "asian" });
    expect(req.allowOtherIngredients).toBe(true);
  });

  it("omits a Macro Target with no positive values", () => {
    const req = buildGenerateRequest(
      { capturedIngredients: ["eggs"], macroTarget: {} },
      { pantry: [], dietary: [], avoidList: [], equipment: [] }
    );
    expect(req.macroTarget).toBeUndefined();
  });
});

describe("generateRecipe", () => {
  it("returns and saves an assembled Recipe on success", async () => {
    usePantryStore.setState({ pantry: ["olive oil"] });
    stubFetchOk(sampleGenerated());

    const result = await generateRecipe({
      capturedIngredients: ["eggs"],
      macroTarget: { proteinG: 40 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipe.id).toBeTruthy();
    expect(result.recipe.favorite).toBe(false);
    expect(typeof result.recipe.artSeed).toBe("number");
    expect(result.recipe.nutrition.estimated).toBe(true);
    expect(result.recipe.nutrition.macroTarget).toEqual({ proteinG: 40 });
    // generate-and-save: the store already has it
    expect(useRecipeStore.getState().recipes[0]?.id).toBe(result.recipe.id);
    // standing input (Pantry) went out on the wire
    const sent = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(sent.pantry).toEqual(["olive oil"]);
  });

  it("carries standing preferences (dietary / avoid / equipment) on the wire", async () => {
    usePrefsStore.setState({
      dietary: ["vegan"],
      avoidList: ["cilantro", "peanuts"],
      equipment: ["stove", "air fryer"],
    });
    stubFetchOk(sampleGenerated());

    const result = await generateRecipe({ capturedIngredients: ["chicken breast"] });

    expect(result.ok).toBe(true);
    const sent = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(sent.dietary).toEqual(["vegan"]);
    expect(sent.avoidList).toEqual(["cilantro", "peanuts"]);
    expect(sent.equipment).toEqual(["stove", "air fryer"]);
  });

  it("carries Meal Settings and allowOtherIngredients on the wire", async () => {
    stubFetchOk(sampleGenerated());

    const result = await generateRecipe({
      capturedIngredients: ["eggs"],
      mealSettings: { guests: 4, time: "long", cuisine: "italian" },
      allowOtherIngredients: true,
    });

    expect(result.ok).toBe(true);
    const sent = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(sent.mealSettings).toEqual({ guests: 4, time: "long", cuisine: "italian" });
    expect(sent.allowOtherIngredients).toBe(true);
  });

  it("does not attach a macroTarget key when none was set", async () => {
    stubFetchOk(sampleGenerated());
    const result = await generateRecipe({ capturedIngredients: ["eggs"] });
    if (!result.ok) throw new Error("expected ok");
    expect("macroTarget" in result.recipe.nutrition).toBe(false);
  });

  it.each([
    [429, "RATE_LIMITED", "rate-limited", true],
    [402, "BUDGET_EXHAUSTED", "budget-exhausted", false],
    [422, "INVALID_REQUEST", "invalid-request", false],
    [502, "GENERATION_FAILED", "generation-failed", true],
  ] as const)(
    "maps %i %s to kind '%s' (retryable: %s)",
    async (status, code, kind, retryable) => {
      stubFetchError(status, code);
      const result = await generateRecipe({ capturedIngredients: ["eggs"] });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe(kind);
      expect(result.error.retryable).toBe(retryable);
      expect(result.error.message.length).toBeGreaterThan(0);
      expect(useRecipeStore.getState().recipes).toHaveLength(0);
    }
  );

  it("maps a network failure to generation-failed, retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("network down");
    }));
    const result = await generateRecipe({ capturedIngredients: ["eggs"] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("generation-failed");
    expect(result.error.retryable).toBe(true);
  });

  it("maps a malformed success payload to generation-failed", async () => {
    stubFetchOk({ nonsense: true });
    const result = await generateRecipe({ capturedIngredients: ["eggs"] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("generation-failed");
  });
});
