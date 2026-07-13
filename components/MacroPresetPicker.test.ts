import { describe, it, expect } from "vitest";
import { presetNameForTarget, fieldsForTarget } from "./MacroPresetPicker";

describe("presetNameForTarget", () => {
  it("is None for an undefined target", () => {
    expect(presetNameForTarget(undefined)).toBe("None");
  });

  it("is None for an empty target", () => {
    expect(presetNameForTarget({})).toBe("None");
  });

  it("matches a named preset exactly", () => {
    expect(presetNameForTarget({ proteinG: 30, carbsG: 45, fatG: 20 })).toBe("Balanced");
    expect(presetNameForTarget({ proteinG: 45, carbsG: 30, fatG: 15 })).toBe("High Protein");
  });

  it("is Custom for a target that doesn't match any preset", () => {
    expect(presetNameForTarget({ proteinG: 50 })).toBe("Custom");
  });
});

describe("fieldsForTarget", () => {
  it("is all-empty for an undefined target", () => {
    expect(fieldsForTarget(undefined)).toEqual({ proteinG: "", carbsG: "", fatG: "" });
  });

  it("stringifies whichever grams are set", () => {
    expect(fieldsForTarget({ proteinG: 30 })).toEqual({ proteinG: "30", carbsG: "", fatG: "" });
  });

  it("stringifies a fully-set target", () => {
    expect(fieldsForTarget({ proteinG: 30, carbsG: 45, fatG: 20 })).toEqual({
      proteinG: "30",
      carbsG: "45",
      fatG: "20",
    });
  });
});
