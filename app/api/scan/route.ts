import { ScanRequestSchema } from "@/lib/schemas";
import { mockScan } from "@/lib/mock-scan";
import { guard } from "@/lib/rate-guard";
import { decodeImage, resolveScanModel, runScan, ScanFailedError } from "@/lib/scan";

// Thin adapter (ADR-0002), mirrors app/api/generate/route.ts: HTTP in, HTTP
// out. The guard is the same shared instance /api/generate uses
// (lib/rate-guard.ts), so the daily spend cap stays global across both
// endpoints per ADR-0002 rather than doubling.

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "INVALID_REQUEST" }, { status: 422 });
  }

  const parsed = ScanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { code: "INVALID_REQUEST", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const image = decodeImage(parsed.data.image);
  if (!image) {
    return Response.json({ code: "UNREADABLE_PHOTO" }, { status: 422 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const blocked = guard(ip);
  if (blocked) return Response.json({ code: blocked.code }, { status: blocked.status });

  // Mock mode: no vision-capable key configured → fixed sample, UI stays testable.
  const model = resolveScanModel();
  if (!model) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json(mockScan());
  }

  try {
    return Response.json(await runScan(image, model));
  } catch (err) {
    if (err instanceof ScanFailedError) console.error(err.cause);
    return Response.json({ code: "GENERATION_FAILED" }, { status: 502 });
  }
}
