import { describe, expect, it } from "vitest";
import { evaluatePerformanceQualification } from "@/lib/performance-qualification";

describe("performance qualification", () => {
  it("passes only when every applied parameter meets criteria", () => {
    const result = evaluatePerformanceQualification([
      { key: "plates", label: "Theoretical plates", unit: "N", applied: true, value: 2500, lowLimit: 2000 },
      { key: "tailing", label: "Tailing factor", unit: "", applied: true, value: 1.4, highLimit: 2 },
      { key: "pressure", label: "Pressure", unit: "bar", applied: false }
    ]);

    expect(result.result).toBe("pass");
    expect(result.parameters).toHaveLength(2);
  });

  it("fails without overwriting or hiding the failing parameter", () => {
    const result = evaluatePerformanceQualification([
      { key: "plates", label: "Theoretical plates", unit: "N", applied: true, value: 1400, lowLimit: 2000 }
    ]);

    expect(result.result).toBe("fail");
    expect(result.parameters[0]).toMatchObject({ key: "plates", result: "fail", value: 1400, lowLimit: 2000 });
  });

  it("requires criteria for applied parameters", () => {
    expect(() =>
      evaluatePerformanceQualification([{ key: "plates", label: "Theoretical plates", unit: "N", applied: true, value: 2500 }])
    ).toThrow("acceptance criteria");
  });

  it("rejects a minimum greater than the maximum", () => {
    expect(() =>
      evaluatePerformanceQualification([{ key: "plates", label: "Theoretical plates", unit: "N", applied: true, value: 2500, lowLimit: 3000, highLimit: 2000 }])
    ).toThrow("minimum cannot be greater than its maximum");
  });
});
