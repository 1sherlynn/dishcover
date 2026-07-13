import type { ScanResult } from "./schemas";

// Served when no vision-capable key is configured, so the Scan flow stays
// testable without a paid model call (mirrors lib/mock-recipe.ts).

export function mockScan(): ScanResult {
  return {
    ingredients: [
      { name: "eggs", confidence: "high" },
      { name: "spinach", confidence: "high" },
      { name: "milk", confidence: "high" },
      { name: "cheddar cheese", confidence: "high" },
      { name: "bell pepper", confidence: "low" },
      { name: "leftover rice", confidence: "low" },
    ],
  };
}
