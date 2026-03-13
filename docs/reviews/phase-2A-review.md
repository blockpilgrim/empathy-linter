# Phase 2A Review: Zod Schemas and System Prompt

**Date:** 2026-03-13
**Reviewer:** Claude Opus 4.6 (automated review)
**Commits reviewed:** d946359, 2250743
**Branch:** main

---

## Summary

Phase 2A introduces Zod schemas for structured LLM output (`EmpathyFlagSchema`, `LintResultSchema`), a well-calibrated system prompt (`LINT_SYSTEM`) and user prompt function (`LINT_USER`), Vitest as the test framework, and consolidates the `EmpathyFlagInput` type into `schemas.ts` as the single source of truth. The implementation is clean and well-aligned with project conventions. There are no critical issues. There is one warning about API deprecation that will affect the next phase, and a few suggestions for prompt robustness and test coverage.

---

## Files Reviewed

| File | Status | Lines Changed |
|---|---|---|
| `lib/schemas.ts` | Rewritten | +43/-1 |
| `lib/prompts.ts` | Rewritten | +57/-1 |
| `lib/apply-flags.ts` | Modified | +1/-10 |
| `app/page.tsx` | Modified | +2/-1 |
| `lib/schemas.test.ts` | New | 83 |
| `lib/prompts.test.ts` | New | 27 |
| `vitest.config.ts` | New | 13 |
| `package.json` | Modified | +2/-1 |
| `CONVENTIONS.md` | Modified | +14 |
| `docs/DECISIONS.md` | Modified | +7 |

---

## Critical (Must Fix)

None.

---

## Warnings (Should Fix)

### W1. `streamObject` is deprecated in AI SDK v6 -- plan for `streamText` with `output`

The project uses `ai` v6.0.116. In this version, `streamObject` is marked `@deprecated` with the message "Use `streamText` with an `output` setting instead." The schemas are designed correctly for `streamObject` usage (a top-level `z.object` with a `flags` array), and `streamObject` still works. However, Phase 2B (the API route) and Phase 3 (client-side consumption) should use the newer API to avoid building on deprecated surface area.

With `streamText` + `output`, there are two approaches:

1. **`output.object({ schema: LintResultSchema })`** -- works with the current schema shape as-is.
2. **`output.array({ element: EmpathyFlagSchema })`** -- streams individual flags as array elements, which maps more naturally to progressive reveal (each flag arrives as a complete element rather than requiring partial JSON parsing of the wrapper object).

Option 2 would mean `LintResultSchema` is not needed at all, and the streaming consumer receives complete `EmpathyFlagInput` objects one at a time. This is worth evaluating when implementing Phase 2B. The current schemas support both approaches, so no changes are needed now.

**File:** `/Users/personal/work-projects/empathy-linter/lib/schemas.ts`, lines 24-31
**Impact:** Not a bug today. `streamObject` still functions. But building Phase 2B/3 on a deprecated API creates tech debt.

### W2. `EmpathyFlag` and `EmpathyFlagInput` are identical types with no semantic distinction

Both types are `z.infer<typeof EmpathyFlagSchema>`:

```typescript
export type EmpathyFlagInput = z.infer<typeof EmpathyFlagSchema>;
export type EmpathyFlag = z.infer<typeof EmpathyFlagSchema>;
```

These are structurally identical. `EmpathyFlagInput` has a clear role documented in CONVENTIONS.md ("the LLM output shape, no `id`"), and it is consumed by `apply-flags.ts` and `page.tsx`. `EmpathyFlag` has no distinct role and no consumers. The test file imports it solely to verify it is assignable from `EmpathyFlagInput`, which is tautologically true since they are the same type alias.

Having two names for the same type invites confusion: a future contributor might assume `EmpathyFlag` includes an `id` (the name suggests a "full" flag), or might use it inconsistently. Consider removing `EmpathyFlag` until a distinct type is needed (e.g., `EmpathyFlagInput & { id: string }` for the applied-with-id variant).

**File:** `/Users/personal/work-projects/empathy-linter/lib/schemas.ts`, lines 39-40
**Impact:** Naming confusion risk. No runtime impact.

---

## Suggestions (Consider)

### S1. Add `.min(1)` constraint to `exact_phrase`

The `exact_phrase` field accepts any string, including empty strings. In `applyFlags()`, empty phrases are guarded by `if (!flag.exact_phrase) continue`, but an empty string would pass Zod validation without error. Adding `.min(1)` to the schema would reject empty phrases at the validation layer rather than relying on downstream guards:

```typescript
exact_phrase: z.string().min(1).describe("...")
```

This is a defense-in-depth measure. The LLM is unlikely to return empty phrases, and `applyFlags` already handles it, but schema-level validation is the idiomatic Zod approach. If using `streamObject` (or `streamText` with `output`), invalid partial results would be silently handled by the SDK, so this would primarily catch issues in testing or manual construction.

**File:** `/Users/personal/work-projects/empathy-linter/lib/schemas.ts`, line 11

### S2. Consider adding a max length constraint to prompt input

`LINT_USER` accepts any string without length validation. `lib/config.ts` already defines `MAX_TEXT_LENGTH = 5000`, but `LINT_USER` does not enforce it. The API route (Phase 2B) should validate length before constructing the prompt, but having no guard in the prompt function itself means it could be called with arbitrarily large text.

This is fine architecturally -- length validation belongs in the API route, not in the prompt function -- but worth noting to ensure Phase 2B implements the check. No change needed to `prompts.ts`.

**File:** `/Users/personal/work-projects/empathy-linter/lib/prompts.ts`, line 52

### S3. Prompt delimiter injection

The user prompt wraps the input text between `---` delimiters:

```
---
${text}
---
```

If the input text itself contains `---` on its own line (common in Markdown documents with horizontal rules or YAML frontmatter), the LLM might misparse the boundary. This is a low-severity concern -- Claude is generally robust to this -- but using a more distinctive delimiter (e.g., `<document>...</document>` or triple backticks) would be more defensive.

**File:** `/Users/personal/work-projects/empathy-linter/lib/prompts.ts`, lines 55-57

### S4. Schema tests could validate rejection of wrong types, not just missing fields

The `schemas.test.ts` file tests three scenarios: valid input, missing required fields, and type alias identity. Consider adding a case for wrong field types (e.g., `exact_phrase: 123` or `reason: null`) to verify that Zod's type coercion behavior is as expected. This is low priority since Zod's string validation is well-tested, but it would make the test suite more self-documenting about the schema's expectations.

**File:** `/Users/personal/work-projects/empathy-linter/lib/schemas.test.ts`

### S5. Prompt tests are thin -- consider testing content invariants

The `prompts.test.ts` tests verify that `LINT_SYSTEM` is a non-empty string and that `LINT_USER` returns a string containing the input. These are essentially smoke tests. Consider testing content invariants that matter for correctness:

- `LINT_SYSTEM` contains the word "exact_phrase" (ensures the critical matching instruction is present)
- `LINT_SYSTEM` contains "verbatim" (ensures the verbatim-substring requirement is present)
- `LINT_USER` does not double-wrap text (calling `LINT_USER(LINT_USER(text))` should be distinguishable from `LINT_USER(text)`)

These are more useful as regression guards if the prompt is edited in future tuning sessions.

**File:** `/Users/personal/work-projects/empathy-linter/lib/prompts.test.ts`

### S6. Vitest config could include `app/` and `components/` test paths

The Vitest config restricts test discovery to `lib/**/*.test.ts`. Future phases will likely need tests for components or API routes. Consider broadening to `["**/*.test.ts"]` with an explicit exclude for `node_modules`, or leave a comment noting the scope should expand as tests are added elsewhere.

**File:** `/Users/personal/work-projects/empathy-linter/vitest.config.ts`, line 6

---

## Convention Compliance

| Convention | Status | Notes |
|---|---|---|
| Flat layout (no `src/`) | Pass | All files in `lib/`, `app/`, `docs/` |
| Zod schemas in `lib/schemas.ts` | Pass | Single file, `.describe()` annotations present |
| Inferred types as single source of truth | Pass | `EmpathyFlagInput` moved from `apply-flags.ts` to `schemas.ts`, consumers import from there |
| No duplicate type definitions | Pass | `apply-flags.ts` removed its local `EmpathyFlagInput` interface, imports from `schemas.ts` |
| System prompt as `const LINT_SYSTEM` | Pass | Follows `{FEATURE}_{ROLE}` naming convention |
| User prompt as `const LINT_USER` | Pass | Arrow function, simple wrapper |
| Shared constants in `lib/config.ts` | Pass | `config.ts` not modified; model name and limits remain there |
| `EmpathyFlagInput` has no `id` field | Pass | Schema defines only `exact_phrase`, `reason`, `suggestion` |
| TypeScript throughout | Pass | All files are `.ts` |
| Client components get `"use client"` | Pass | `page.tsx` retains the directive |

---

## Patterns to Document

1. **Test framework convention**: Vitest is now the test runner. The `vitest.config.ts` uses `lib/**/*.test.ts` for test discovery and mirrors the `@` path alias from `tsconfig.json`. Consider adding a "Testing" section to CONVENTIONS.md documenting: test file co-location (`.test.ts` next to source), test runner (`vitest run` via `npm test`), and import style (`import { describe, it, expect } from "vitest"`).

2. **Schema versioning for API evolution**: If `LintResultSchema` is dropped in favor of `output.array()` (per W1), document the decision in DECISIONS.md. The schema file should remain the source of truth for the element schema regardless of which streaming API is used.

3. **Prompt tuning workflow**: The implementation plan (Phase 2C) calls for a golden test dataset and precision/recall measurement. When that arrives, document the tuning process and any prompt changes in a changelog or in the prompt file's JSDoc.

---

## Prior Review Items Addressed

This phase resolves the following items from the Phase 1C review:

| Item | Status | Resolution |
|---|---|---|
| S2 (EmpathyFlagInput duplicates planned Zod schema) | Resolved | Type now derived from `z.infer<typeof EmpathyFlagSchema>` in `schemas.ts` |
| Test Gaps section (no tests existed) | Partially resolved | Schema and prompt tests added; `applyFlags` tests still pending |
