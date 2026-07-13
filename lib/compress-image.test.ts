// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeScaledDimensions } from "./compress-image";

// Pure sizing math for client-side photo compression (GENERATION-CONTRACT.md:
// longest edge ≤1280px). The canvas/File encoding around it is browser-API
// plumbing, verified in the browser per AGENTS.md's UI-only testing policy.

describe("computeScaledDimensions", () => {
  it("leaves an image already under the max edge unchanged", () => {
    expect(computeScaledDimensions(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });

  it("downscales a landscape image so the longest edge hits the max", () => {
    expect(computeScaledDimensions(2560, 1440, 1280)).toEqual({ width: 1280, height: 720 });
  });

  it("downscales a portrait image so the longest edge hits the max", () => {
    expect(computeScaledDimensions(1440, 2560, 1280)).toEqual({ width: 720, height: 1280 });
  });

  it("leaves a square image exactly at the max edge unchanged", () => {
    expect(computeScaledDimensions(1280, 1280, 1280)).toEqual({ width: 1280, height: 1280 });
  });

  it("rounds fractional dimensions to whole pixels", () => {
    expect(computeScaledDimensions(3000, 1999, 1280)).toEqual({ width: 1280, height: 853 });
  });
});
