// Proxy guardrails (ADR-0002): per-IP sliding window + global daily cap.
// Factory form so tests can inject a clock; the API route uses a singleton.

export type GuardBlock =
  | { code: "RATE_LIMITED"; status: 429 }
  | { code: "BUDGET_EXHAUSTED"; status: 402 };

export interface RateGuardOptions {
  perIpLimit: number;
  dailyCap: number;
  windowMs?: number;
  now?: () => number;
}

export function createRateGuard({
  perIpLimit,
  dailyCap,
  windowMs = 10 * 60 * 1000,
  now = Date.now,
}: RateGuardOptions) {
  const hits = new Map<string, number[]>();
  let dailyCount = 0;
  let dailyKey = "";

  return function guard(ip: string): GuardBlock | null {
    const t = now();
    const today = new Date(t).toISOString().slice(0, 10);
    if (today !== dailyKey) {
      dailyKey = today;
      dailyCount = 0;
    }
    if (dailyCount >= dailyCap) return { code: "BUDGET_EXHAUSTED", status: 402 };

    const recent = (hits.get(ip) ?? []).filter((h) => t - h < windowMs);
    if (recent.length >= perIpLimit) return { code: "RATE_LIMITED", status: 429 };
    recent.push(t);
    hits.set(ip, recent);
    dailyCount++;
    return null;
  };
}
