import { describe, it, expect } from "vitest";
import { LINT_SYSTEM, LINT_USER } from "./prompts";

describe("LINT_SYSTEM", () => {
  it("is a non-empty string", () => {
    expect(typeof LINT_SYSTEM).toBe("string");
    expect(LINT_SYSTEM.length).toBeGreaterThan(0);
  });

  it("contains critical exact_phrase matching instructions", () => {
    expect(LINT_SYSTEM).toContain("exact_phrase");
    expect(LINT_SYSTEM).toContain("verbatim");
  });
});

describe("LINT_USER", () => {
  it("returns a string containing the input text", () => {
    const input = "Deploy the canary build to the staging cluster.";
    const result = LINT_USER(input);

    expect(typeof result).toBe("string");
    expect(result).toContain(input);
  });

  it("wraps the text in document delimiters", () => {
    const input = "Some documentation text.";
    const result = LINT_USER(input);

    expect(result).toContain(`<document>\n${input}\n</document>`);
  });
});
