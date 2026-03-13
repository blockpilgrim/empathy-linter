import { describe, it, expect } from "vitest";
import {
  EmpathyFlagSchema,
  LintResultSchema,
  type EmpathyFlagInput,
} from "./schemas";

describe("EmpathyFlagSchema", () => {
  it("accepts a valid flag with all three fields", () => {
    const input = {
      exact_phrase: "circuit breaker trips",
      reason:
        "Readers unfamiliar with resilience patterns may not know what a circuit breaker is.",
      suggestion:
        "Consider adding a brief explanation of the circuit breaker pattern on first mention.",
    };

    const result = EmpathyFlagSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(input);
    }
  });

  it("rejects objects missing required fields", () => {
    expect(EmpathyFlagSchema.safeParse({}).success).toBe(false);
    expect(
      EmpathyFlagSchema.safeParse({ exact_phrase: "test" }).success
    ).toBe(false);
    expect(
      EmpathyFlagSchema.safeParse({
        exact_phrase: "test",
        reason: "test",
      }).success
    ).toBe(false);
  });

  it("rejects empty exact_phrase", () => {
    const input = {
      exact_phrase: "",
      reason: "Some reason.",
      suggestion: "Some suggestion.",
    };
    expect(EmpathyFlagSchema.safeParse(input).success).toBe(false);
  });
});

describe("LintResultSchema", () => {
  it("accepts a valid result with flags array", () => {
    const input = {
      flags: [
        {
          exact_phrase: "P99 latency",
          reason: "Not all readers know percentile metrics.",
          suggestion: "Define P99 on first use.",
        },
      ],
    };

    const result = LintResultSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flags).toHaveLength(1);
      expect(result.data.flags[0].exact_phrase).toBe("P99 latency");
    }
  });

  it("accepts an empty flags array", () => {
    const result = LintResultSchema.safeParse({ flags: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flags).toEqual([]);
    }
  });
});

describe("EmpathyFlagInput type", () => {
  it("is assignable from a valid schema parse result", () => {
    const input = {
      exact_phrase: "k8s",
      reason: "Abbreviation for Kubernetes, not universally known.",
      suggestion: "Spell out Kubernetes on first use.",
    };

    const result = EmpathyFlagSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      // Compile-time check: parse result is assignable to EmpathyFlagInput
      const typed: EmpathyFlagInput = result.data;
      expect(typed.exact_phrase).toBe("k8s");
    }
  });
});
