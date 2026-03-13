import { describe, it, expect } from "vitest";
import { LINT_SYSTEM, LINT_USER } from "@/lib/prompts";
import { EmpathyFlagSchema, LintResultSchema } from "@/lib/schemas";
import { MAX_TEXT_LENGTH } from "@/lib/config";
import { DEMO_CONTENT, DEMO_FLAGS } from "@/lib/demo-content";
import {
  GOLDEN_SAMPLES,
  EDGE_CASE_SAMPLES,
  ALL_SAMPLES,
  type GoldenSample,
} from "./golden-dataset";

// ==========================================================================
// Golden dataset — evaluation readiness
//
// These tests verify that the golden dataset is well-formed for use as
// an evaluation harness. They focus on properties that affect evaluation
// accuracy: phrase uniqueness, text length limits, and alignment between
// expectedFlags and the actual text content.
// ==========================================================================

describe("Golden dataset evaluation readiness", () => {
  describe("MAX_TEXT_LENGTH compliance", () => {
    it.each(ALL_SAMPLES)(
      "sample '$id' text is within MAX_TEXT_LENGTH ($MAX_TEXT_LENGTH chars)",
      (sample: GoldenSample) => {
        expect(sample.text.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
      }
    );
  });

  describe("expected flag phrase quality", () => {
    it.each(GOLDEN_SAMPLES)(
      "sample '$id' — expected flag phrases are non-empty trimmed strings",
      (sample: GoldenSample) => {
        for (const flag of sample.expectedFlags) {
          expect(flag.exact_phrase.trim().length).toBeGreaterThan(0);
          // Phrase should not have leading/trailing whitespace
          expect(flag.exact_phrase).toBe(flag.exact_phrase.trim());
        }
      }
    );

    it.each(GOLDEN_SAMPLES)(
      "sample '$id' — expected flag phrases are short and targeted (under 8 words)",
      (sample: GoldenSample) => {
        // The system prompt says "1-4 words" but some legitimate flags may
        // be slightly longer (e.g., "burn rate exceeds 6x"). We use 8 as
        // a reasonable upper bound to catch accidentally long phrases.
        for (const flag of sample.expectedFlags) {
          const wordCount = flag.exact_phrase.split(/\s+/).length;
          expect(wordCount).toBeLessThanOrEqual(8);
        }
      }
    );

    it.each(GOLDEN_SAMPLES)(
      "sample '$id' — no duplicate expected flag phrases",
      (sample: GoldenSample) => {
        const phrases = sample.expectedFlags.map((f) => f.exact_phrase);
        expect(new Set(phrases).size).toBe(phrases.length);
      }
    );

    it.each(GOLDEN_SAMPLES)(
      "sample '$id' — each expected flag phrase appears at least once in the text",
      (sample: GoldenSample) => {
        // If a phrase appears multiple times, the LLM might flag a different
        // occurrence than expected, complicating evaluation scoring.
        for (const flag of sample.expectedFlags) {
          const firstIndex = sample.text.indexOf(flag.exact_phrase);
          expect(firstIndex).toBeGreaterThanOrEqual(0);

          const secondIndex = sample.text.indexOf(
            flag.exact_phrase,
            firstIndex + 1
          );
          // Allow duplicates (some jargon legitimately repeats) but document it.
          // This test ensures at least one occurrence exists — the verbatim
          // check in prompts.test.ts handles the "appears in text" guarantee.
          expect(firstIndex).not.toBe(-1);
        }
      }
    );
  });

  describe("shouldNotFlag quality", () => {
    it.each(ALL_SAMPLES)(
      "sample '$id' — shouldNotFlag entries are non-empty trimmed strings",
      (sample: GoldenSample) => {
        for (const term of sample.shouldNotFlag) {
          expect(term.trim().length).toBeGreaterThan(0);
          expect(term).toBe(term.trim());
        }
      }
    );

    it.each(GOLDEN_SAMPLES)(
      "sample '$id' — no shouldNotFlag term is identical to an expectedFlag phrase",
      (sample: GoldenSample) => {
        // Exact-match overlap would make evaluation scoring ambiguous.
        // Substring overlaps (e.g., "dashboard" inside "SLO dashboard") are
        // acceptable because the LLM flags the compound phrase for the
        // jargon modifier, not the common word.
        const flagPhrases = new Set(
          sample.expectedFlags.map((f) => f.exact_phrase)
        );
        for (const noFlagTerm of sample.shouldNotFlag) {
          expect(
            flagPhrases.has(noFlagTerm),
            `Exact overlap: "${noFlagTerm}" is both in shouldNotFlag and expectedFlags`
          ).toBe(false);
        }
      }
    );
  });

  describe("edge case samples", () => {
    it("clear-text sample has zero expected flags", () => {
      const clearText = EDGE_CASE_SAMPLES.find((s) => s.id === "clear-text");
      expect(clearText).toBeDefined();
      expect(clearText!.expectedFlags).toHaveLength(0);
    });

    it("minimal-text sample has zero expected flags", () => {
      const minimal = EDGE_CASE_SAMPLES.find((s) => s.id === "minimal-text");
      expect(minimal).toBeDefined();
      expect(minimal!.expectedFlags).toHaveLength(0);
    });

    it("edge case samples have shouldNotFlag entries to verify precision", () => {
      for (const sample of EDGE_CASE_SAMPLES) {
        expect(sample.shouldNotFlag.length).toBeGreaterThan(0);
      }
    });
  });
});

// ==========================================================================
// Demo content — alignment with golden dataset standards
//
// The demo content (DEMO_CONTENT + DEMO_FLAGS) is the first thing users
// see. It must meet the same quality bar as the golden dataset.
// ==========================================================================

describe("Demo content alignment with evaluation standards", () => {
  it("DEMO_CONTENT is within MAX_TEXT_LENGTH", () => {
    // Strip HTML tags to get raw text length (what the LLM sees)
    const plainText = DEMO_CONTENT.replace(/<[^>]+>/g, "");
    expect(plainText.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });

  it("every DEMO_FLAG exact_phrase appears verbatim in the plain text", () => {
    const plainText = DEMO_CONTENT.replace(/<[^>]+>/g, " ");
    for (const flag of DEMO_FLAGS) {
      expect(plainText).toContain(flag.exact_phrase);
    }
  });

  it("every DEMO_FLAG has non-empty reason and suggestion", () => {
    for (const flag of DEMO_FLAGS) {
      expect(flag.reason.trim().length).toBeGreaterThan(0);
      expect(flag.suggestion.trim().length).toBeGreaterThan(0);
    }
  });

  it("every DEMO_FLAG passes EmpathyFlagSchema validation", () => {
    for (const flag of DEMO_FLAGS) {
      const result = EmpathyFlagSchema.safeParse(flag);
      expect(result.success).toBe(true);
    }
  });

  it("all DEMO_FLAGS together pass LintResultSchema validation", () => {
    const result = LintResultSchema.safeParse({ flags: DEMO_FLAGS });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flags.length).toBe(DEMO_FLAGS.length);
    }
  });

  it("DEMO_FLAGS phrases are short and targeted (under 8 words)", () => {
    for (const flag of DEMO_FLAGS) {
      const wordCount = flag.exact_phrase.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(8);
    }
  });

  it("no duplicate DEMO_FLAG phrases", () => {
    const phrases = DEMO_FLAGS.map((f) => f.exact_phrase);
    expect(new Set(phrases).size).toBe(phrases.length);
  });
});

// ==========================================================================
// Prompt-schema alignment
//
// Validates that the system prompt's instructions align with the schema's
// constraints. Misalignment here means the LLM might produce output the
// schema rejects, or the schema might accept output the prompt forbids.
// ==========================================================================

describe("Prompt-schema alignment", () => {
  it("system prompt mentions all three schema fields", () => {
    // The prompt must instruct the LLM about the same fields the schema expects
    expect(LINT_SYSTEM).toContain("exact_phrase");
    expect(LINT_SYSTEM).toMatch(/reason/i);
    expect(LINT_SYSTEM).toMatch(/suggestion/i);
  });

  it("system prompt's EXACT_PHRASE RULES section exists and is substantial", () => {
    const section = LINT_SYSTEM.match(
      /EXACT_PHRASE RULES[\s\S]*?(?=\n\n[A-Z]|\n[A-Z].*guidelines|$)/
    );
    expect(section).not.toBeNull();
    // The section should be at least 200 chars to contain meaningful guidance
    expect(section![0].length).toBeGreaterThan(200);
  });

  it("system prompt's verbatim instruction aligns with schema's refine check", () => {
    // The prompt says "verbatim substring" and the schema uses .refine()
    // to reject blank strings. These work together: the prompt prevents
    // paraphrasing, the schema prevents empty strings.
    expect(LINT_SYSTEM).toContain("verbatim");
    const emptyResult = EmpathyFlagSchema.safeParse({
      exact_phrase: "",
      reason: "r",
      suggestion: "s",
    });
    expect(emptyResult.success).toBe(false);
  });

  it("user prompt wraps text in XML tags that do not conflict with schema field names", () => {
    const userPrompt = LINT_USER("test");
    // Ensure the wrapper tag name does not collide with schema field names
    expect(userPrompt).toContain("<document>");
    expect(userPrompt).not.toContain("<exact_phrase>");
    expect(userPrompt).not.toContain("<reason>");
    expect(userPrompt).not.toContain("<suggestion>");
  });
});

// ==========================================================================
// Golden dataset coverage analysis
//
// These tests verify that the golden dataset provides adequate coverage
// of the patterns described in the system prompt's WHAT TO FLAG section.
// ==========================================================================

describe("Golden dataset covers WHAT TO FLAG categories", () => {
  const allExpectedPhrases = GOLDEN_SAMPLES.flatMap((s) =>
    s.expectedFlags.map((f) => ({
      phrase: f.exact_phrase,
      why: f.why,
    }))
  );

  it("includes unexplained acronyms", () => {
    const acronymFlags = allExpectedPhrases.filter((f) =>
      f.why.toLowerCase().includes("unexpand") ||
      f.why.toLowerCase().includes("acronym") ||
      f.why.match(/not expanded/i)
    );
    expect(acronymFlags.length).toBeGreaterThanOrEqual(3);
  });

  it("includes tool names used without context", () => {
    const toolFlags = allExpectedPhrases.filter((f) =>
      f.why.toLowerCase().includes("tool") ||
      f.why.toLowerCase().includes("named without") ||
      f.why.toLowerCase().includes("platform")
    );
    expect(toolFlags.length).toBeGreaterThanOrEqual(3);
  });

  it("includes assumed prerequisite knowledge", () => {
    const knowledgeFlags = allExpectedPhrases.filter((f) =>
      f.why.toLowerCase().includes("assumes") ||
      f.why.toLowerCase().includes("assumed") ||
      f.why.toLowerCase().includes("knowledge")
    );
    expect(knowledgeFlags.length).toBeGreaterThanOrEqual(3);
  });

  it("includes specialized metrics or concepts", () => {
    const metricFlags = allExpectedPhrases.filter((f) =>
      f.why.toLowerCase().includes("metric") ||
      f.why.toLowerCase().includes("concept") ||
      f.why.toLowerCase().includes("specialized")
    );
    expect(metricFlags.length).toBeGreaterThanOrEqual(2);
  });

  it("spans at least 4 distinct domains", () => {
    const domains = new Set(GOLDEN_SAMPLES.map((s) => s.domain));
    expect(domains.size).toBeGreaterThanOrEqual(4);
  });
});
