import { z } from "zod";

/**
 * Schema for a single empathy flag returned by the LLM.
 *
 * `exact_phrase` must be a verbatim substring of the input text so that
 * `applyFlags()` can locate it in the ProseMirror document via `indexOf`.
 */
export const EmpathyFlagSchema = z.object({
  exact_phrase: z
    .string()
    .min(1)
    .describe(
      "The exact phrase from the text that assumes reader knowledge — must be a verbatim substring"
    ),
  reason: z
    .string()
    .describe("Why this might confuse or alienate the target reader"),
  suggestion: z
    .string()
    .describe("A concrete suggestion to make this more accessible"),
});

/**
 * Schema for the full lint result — the top-level object streamed back
 * from the LLM via `streamObject`.
 */
export const LintResultSchema = z.object({
  flags: z
    .array(EmpathyFlagSchema)
    .describe("Array of empathy flags found in the text"),
});

/**
 * A single empathy flag as output by the LLM (no `id` field).
 * The `id` is generated at apply-time by `applyFlags()`.
 */
export type EmpathyFlagInput = z.infer<typeof EmpathyFlagSchema>;

/** The full lint result containing an array of flags. */
export type LintResult = z.infer<typeof LintResultSchema>;
