import { GenerateRequestSchema } from "@/lib/schemas";
import { mockRecipe } from "@/lib/mock-recipe";
import { guard } from "@/lib/rate-guard";
import { resolveModel, runGeneration, GenerationFailedError } from "@/lib/generation";

// Thin adapter (ADR-0002): HTTP in, HTTP out. Parsing, guardrails, and mock
// mode live here; the Generator (lib/generation.ts) owns the rules.
// Guardrails are in-memory — per serverless instance, a courtesy barrier for
// a personal+friends deployment, not real abuse protection. The guard is
// shared with /api/scan (lib/rate-guard.ts) so the daily cap stays global.

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "INVALID_REQUEST" }, { status: 422 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { code: "INVALID_REQUEST", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const blocked = guard(ip);
  if (blocked) return Response.json({ code: blocked.code }, { status: blocked.status });

  // Mock mode: no key configured → deterministic sample, UI stays testable.
  const model = resolveModel();
  if (!model) {
    await new Promise((r) => setTimeout(r, 1200));
    return Response.json(mockRecipe(parsed.data));
  }

  try {
    return Response.json(await runGeneration(parsed.data, model));
  } catch (err) {
    if (err instanceof GenerationFailedError) console.error(err.cause);
    return Response.json({ code: "GENERATION_FAILED" }, { status: 502 });
  }
}
