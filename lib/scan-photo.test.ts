// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { scanPhoto } from "./scan-photo";

// The Scan Client — the interface the Build a Recipe screen uses to turn a
// photo into reviewed ingredients. Maps the proxy's error taxonomy
// (GENERATION-CONTRACT.md) to typed modes, mirroring lib/generate-recipe.ts.

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetchOk(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
}

function stubFetchError(status: number, code: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code }), { status })));
}

describe("scanPhoto", () => {
  it("returns ingredients on success and sends the image on the wire", async () => {
    stubFetchOk({ ingredients: [{ name: "eggs", confidence: "high" }] });

    const result = await scanPhoto("data:image/jpeg;base64,AAAA");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ingredients).toEqual([{ name: "eggs", confidence: "high" }]);
    const sent = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(sent.image).toBe("data:image/jpeg;base64,AAAA");
  });

  it.each([
    [429, "RATE_LIMITED", "rate-limited", true],
    [402, "BUDGET_EXHAUSTED", "budget-exhausted", false],
    [422, "INVALID_REQUEST", "invalid-request", false],
    [422, "UNREADABLE_PHOTO", "unreadable-photo", true],
    [502, "GENERATION_FAILED", "scan-failed", true],
  ] as const)(
    "maps %i %s to kind '%s' (retryable: %s)",
    async (status, code, kind, retryable) => {
      stubFetchError(status, code);
      const result = await scanPhoto("data:image/jpeg;base64,AAAA");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe(kind);
      expect(result.error.retryable).toBe(retryable);
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  );

  it("maps a network failure to scan-failed, retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      })
    );
    const result = await scanPhoto("data:image/jpeg;base64,AAAA");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("scan-failed");
    expect(result.error.retryable).toBe(true);
  });

  it("maps a malformed success payload to scan-failed", async () => {
    stubFetchOk({ nonsense: true });
    const result = await scanPhoto("data:image/jpeg;base64,AAAA");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("scan-failed");
  });
});
