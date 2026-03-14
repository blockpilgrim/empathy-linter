import { describe, it, expect } from "vitest";
import { LINT_SYSTEM, LINT_USER } from "./prompts";
import { EmpathyFlagSchema, LintResultSchema } from "./schemas";
import { GOLDEN_SAMPLES } from "./eval/golden-dataset";

// ==========================================================================
// LINT_SYSTEM — structural validation of the system prompt
// ==========================================================================

describe("LINT_SYSTEM", () => {
  it("is a non-empty string", () => {
    expect(typeof LINT_SYSTEM).toBe("string");
    expect(LINT_SYSTEM.length).toBeGreaterThan(0);
  });

  // -- Flag rules ----------------------------------------------------------

  describe("flag rules", () => {
    it("contains a WHAT TO FLAG section", () => {
      expect(LINT_SYSTEM).toContain("WHAT TO FLAG");
    });

    it("instructs to flag unexplained acronyms", () => {
      expect(LINT_SYSTEM).toMatch(/acronym/i);
    });

    it("instructs to flag jargon and tool names", () => {
      expect(LINT_SYSTEM).toMatch(/jargon/i);
    });

    it("instructs to flag assumed prerequisite knowledge", () => {
      expect(LINT_SYSTEM).toMatch(/assumed/i);
    });

    it("instructs to flag specialized metrics", () => {
      expect(LINT_SYSTEM).toMatch(/metric/i);
    });
  });

  // -- No-flag rules -------------------------------------------------------

  describe("no-flag rules", () => {
    it("contains a WHAT NOT TO FLAG section", () => {
      expect(LINT_SYSTEM).toContain("WHAT NOT TO FLAG");
    });

    it("exempts standard industry terms", () => {
      // The prompt should list common terms that must not be flagged
      const exemptTerms = ["API", "HTTP", "JSON", "CSS", "HTML", "URL", "REST", "SQL", "Git"];
      for (const term of exemptTerms) {
        expect(LINT_SYSTEM).toContain(term);
      }
    });

    it("exempts common programming concepts", () => {
      expect(LINT_SYSTEM).toMatch(/function|variable|class|array/);
    });

    it("exempts terms defined elsewhere in the same text", () => {
      expect(LINT_SYSTEM).toMatch(/defined|expanded.*same text/i);
    });
  });

  // -- exact_phrase rules --------------------------------------------------

  describe("exact_phrase rules", () => {
    it("contains critical exact_phrase matching instructions", () => {
      expect(LINT_SYSTEM).toContain("exact_phrase");
      expect(LINT_SYSTEM).toContain("verbatim");
    });

    it("instructs to preserve capitalization and spacing", () => {
      expect(LINT_SYSTEM).toMatch(/capitaliz/i);
      expect(LINT_SYSTEM).toMatch(/spacing/i);
    });

    it("instructs to keep phrases short (1-4 words)", () => {
      expect(LINT_SYSTEM).toMatch(/1-4 words/);
    });

    it("forbids paraphrasing or truncating", () => {
      expect(LINT_SYSTEM).toMatch(/paraphrase/i);
      expect(LINT_SYSTEM).toMatch(/truncat/i);
    });
  });

  // -- Reason & suggestion guidelines --------------------------------------

  describe("reason guidelines", () => {
    it("contains guidance for the reason field", () => {
      expect(LINT_SYSTEM).toMatch(/REASON/);
    });

    it("encourages specificity about who might be confused", () => {
      expect(LINT_SYSTEM).toMatch(/who might be confused/i);
    });
  });

  describe("suggestion guidelines", () => {
    it("contains guidance for the suggestion field", () => {
      expect(LINT_SYSTEM).toMatch(/SUGGESTION/);
    });

    it("discourages prescriptive rewrites", () => {
      // The prompt should tell the LLM not to say "Change this to..." or "Replace with..."
      expect(LINT_SYSTEM).toMatch(/not prescriptive|don't rewrite|not rewrit/i);
    });

    it("suggests constructive alternatives (definitions, expansions, links)", () => {
      expect(LINT_SYSTEM).toMatch(/definition/i);
      expect(LINT_SYSTEM).toMatch(/expansion/i);
    });
  });

  // -- Calibration ---------------------------------------------------------

  describe("calibration guidance", () => {
    it("contains a CALIBRATION section", () => {
      expect(LINT_SYSTEM).toContain("CALIBRATION");
    });

    it("specifies a target flag count range", () => {
      // Should mention something like "3-7 flags per ~200 words"
      expect(LINT_SYSTEM).toMatch(/\d+-\d+ flags/);
    });

    it("instructs to return fewer flags for clear text", () => {
      expect(LINT_SYSTEM).toMatch(/fewer flags|empty array/i);
    });

    it("errs on the side of flagging when uncertain", () => {
      expect(LINT_SYSTEM).toMatch(/when in doubt.*flag/i);
    });
  });

  // -- Role framing --------------------------------------------------------

  describe("role framing", () => {
    it("establishes the reader-advocate role", () => {
      expect(LINT_SYSTEM).toMatch(/reader advocate/i);
    });

    it("mentions the target audience personas", () => {
      // Should mention newcomers, cross-domain engineers, or non-technical stakeholders
      expect(LINT_SYSTEM).toMatch(/newcomer|different domain|non-technical/i);
    });
  });
});

// ==========================================================================
// LINT_USER — user prompt function
// ==========================================================================

describe("LINT_USER", () => {
  it("returns a string containing the input text", () => {
    const input = "Deploy the canary build to the staging cluster.";
    const result = LINT_USER(input);

    expect(typeof result).toBe("string");
    expect(result).toContain(input);
  });

  it("wraps the text in <document> XML delimiters", () => {
    const input = "Some documentation text.";
    const result = LINT_USER(input);

    expect(result).toContain(`<document>\n${input}\n</document>`);
  });

  it("does not use --- delimiters (would conflict with markdown/YAML)", () => {
    const input = "Test text.";
    const result = LINT_USER(input);

    // The prompt should use XML tags, not triple-dash delimiters
    expect(result).not.toMatch(/^---$/m);
  });

  it("includes an instruction to analyze for jargon", () => {
    const result = LINT_USER("anything");
    expect(result).toMatch(/jargon|assumed knowledge/i);
  });

  it("handles empty string input without crashing", () => {
    const result = LINT_USER("");
    expect(typeof result).toBe("string");
    expect(result).toContain("<document>");
    expect(result).toContain("</document>");
  });

  it("handles text containing XML-like content", () => {
    const input = "Use <div> tags for layout and </div> to close them.";
    const result = LINT_USER(input);

    expect(result).toContain(input);
    expect(result).toContain("<document>");
  });

  it("handles text containing the delimiter tags themselves", () => {
    const input = "The <document> tag is used in our schema.";
    const result = LINT_USER(input);

    // Should still contain the wrapping — note this is a known limitation
    // but the function should not crash
    expect(result).toContain(input);
  });
});

// ==========================================================================
// Edge cases — schema behavior at boundaries
//
// These test the schema's edge-case behavior with data shapes that an LLM
// might produce. They complement (not duplicate) schemas.test.ts which
// covers the basic valid/invalid cases.
// ==========================================================================

describe("Schema edge cases for LLM output", () => {
  it("accepts a LintResult with a large number of flags", () => {
    const flags = Array.from({ length: 20 }, (_, i) => ({
      exact_phrase: `jargon-term-${i}`,
      reason: `Reason ${i}`,
      suggestion: `Suggestion ${i}`,
    }));

    const result = LintResultSchema.safeParse({ flags });
    expect(result.success).toBe(true);
  });

  it("rejects a flag with whitespace-only exact_phrase", () => {
    const flag = {
      exact_phrase: "   ",
      reason: "Some reason.",
      suggestion: "Some suggestion.",
    };

    const result = EmpathyFlagSchema.safeParse(flag);
    expect(result.success).toBe(false);
  });

  it("rejects a flag where exact_phrase is a number (LLM type confusion)", () => {
    const flag = {
      exact_phrase: 42,
      reason: "Some reason.",
      suggestion: "Some suggestion.",
    };

    const result = EmpathyFlagSchema.safeParse(flag);
    expect(result.success).toBe(false);
  });

  it("rejects a flag with null fields (LLM null output)", () => {
    const flag = {
      exact_phrase: null,
      reason: "Some reason.",
      suggestion: "Some suggestion.",
    };

    const result = EmpathyFlagSchema.safeParse(flag);
    expect(result.success).toBe(false);
  });

  it("rejects a LintResult where flags is not an array", () => {
    const result = LintResultSchema.safeParse({ flags: "not an array" });
    expect(result.success).toBe(false);
  });

  it("rejects a LintResult missing the flags key entirely", () => {
    const result = LintResultSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("strips unknown extra fields from a flag (LLM hallucinated fields)", () => {
    const flag = {
      exact_phrase: "k8s",
      reason: "Abbreviation for Kubernetes.",
      suggestion: "Spell out Kubernetes on first use.",
      confidence: 0.95, // hallucinated field
      severity: "high", // hallucinated field
    };

    const result = EmpathyFlagSchema.safeParse(flag);
    expect(result.success).toBe(true);
    if (result.success) {
      // Zod strips unknown keys by default
      expect("confidence" in result.data).toBe(false);
      expect("severity" in result.data).toBe(false);
    }
  });
});

// ==========================================================================
// LINT_USER with golden dataset — verify wrapping works for real content
// ==========================================================================

describe("LINT_USER with golden dataset content", () => {
  for (const sample of GOLDEN_SAMPLES) {
    it(`wraps '${sample.id}' text in document tags without corruption`, () => {
      const result = LINT_USER(sample.text);

      // The full text must appear unmodified between the tags
      expect(result).toContain(sample.text);
      expect(result).toContain("<document>");
      expect(result).toContain("</document>");

      // Verify the text is between the tags
      const tagStart = result.indexOf("<document>") + "<document>".length;
      const tagEnd = result.indexOf("</document>");
      const enclosed = result.slice(tagStart, tagEnd).trim();
      expect(enclosed).toBe(sample.text);
    });
  }
});

// ==========================================================================
// Prompt observations and recommendations
//
// These are not assertions — they document observations about the prompt
// that may need attention. They always pass but log findings.
// ==========================================================================

describe("Prompt quality observations (always-pass documentation)", () => {
  it("documents: whitespace-only exact_phrase is now rejected by schema", () => {
    // RESOLVED: Schema now uses .refine() to reject whitespace-only strings.
    const result = EmpathyFlagSchema.safeParse({
      exact_phrase: "   ",
      reason: "r",
      suggestion: "s",
    });
    expect(result.success).toBe(false);
  });

  it("documents: reason and suggestion have no minimum length", () => {
    // OBSERVATION: reason and suggestion accept single-character strings.
    // An LLM could return "." as a reason and it would pass validation.
    // RECOMMENDATION: Consider adding .min(10) or similar to reason/suggestion
    // to ensure the LLM provides meaningful explanations.
    const result = EmpathyFlagSchema.safeParse({
      exact_phrase: "k8s",
      reason: ".",
      suggestion: ".",
    });
    expect(result.success).toBe(true);
  });

  it("documents: LINT_SYSTEM includes OAuth in the no-flag list", () => {
    // OBSERVATION: OAuth is listed as a "standard industry term" not to flag.
    // However, many non-technical stakeholders and junior developers don't
    // know what OAuth is. This is a borderline case worth monitoring.
    expect(LINT_SYSTEM).toContain("OAuth");
  });

  it("documents: LINT_SYSTEM does not mention handling of code blocks or inline code", () => {
    // OBSERVATION: The prompt does not instruct the LLM on how to handle
    // jargon that appears inside code blocks or inline code spans.
    // Terms in code context may be appropriate and should not be flagged.
    // RECOMMENDATION: Consider adding guidance about code context to reduce
    // false positives when users paste markdown with code blocks.
    const mentionsCode = LINT_SYSTEM.match(/code block|inline code|backtick|```/i);
    expect(mentionsCode).toBeNull(); // documents that this guidance is absent
  });
});
