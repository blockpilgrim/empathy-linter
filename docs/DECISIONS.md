# Architecture Decisions

Record of significant architectural decisions made during implementation.

---

## AD-001: Manual project setup instead of create-next-app

**Date:** 2026-03-13
**Phase:** 0 (Bootstrap)
**Decision:** Set up the Next.js project manually (package.json, tsconfig, etc.) rather than using `npx create-next-app@latest`.
**Rationale:** The repo already had git history, docs, and config files. `create-next-app` would overwrite existing files and introduce unwanted boilerplate. Manual setup gives full control over the initial structure.

## AD-002: Teal/sage accent palette instead of Pulp's burnt sienna

**Date:** 2026-03-13
**Phase:** 0 (Bootstrap)
**Decision:** Use `--accent: #2a7d6e` (teal/sage green) instead of Pulp's `--accent: #b5451b` (burnt sienna).
**Rationale:** Differentiates the product visually from the reference project while conveying a calmer, more "empathetic" tone. Kept the warm paper background (`#f5f1eb`) from Pulp for continuity.

## AD-003: Skip dark mode for v1

**Date:** 2026-03-13
**Phase:** 0 (Bootstrap)
**Decision:** No dark mode palette or toggle in the initial build.
**Rationale:** Time constraint (1-day timebox). The light paper aesthetic is core to the demo experience. Dark mode can be added post-MVP by porting Pulp's `[data-theme="dark"]` approach.

## AD-004: TipTap Mark (not Node) for empathy highlights

**Date:** 2026-03-13
**Phase:** 1B (Custom Empathy Highlight Extension)
**Decision:** Use a TipTap `Mark` extension (inline `<span>`) instead of a `Node` extension (block-level element) for empathy highlights.
**Rationale:** Pulp's `ProvocationExtension` is a block-level atom node that inserts standalone blocks between paragraphs. The empathy linter needs inline phrase-level highlights that wrap existing text without modifying document structure. Marks are the correct ProseMirror primitive for this — they decorate text ranges rather than creating new content. Key behavioral properties: `inclusive: false` prevents highlight spreading at boundaries, `excludes: "empathyFlag"` prevents overlapping marks.

## AD-006: XML-style delimiters for user input in prompts

**Date:** 2026-03-13
**Phase:** 2A (Schema & Prompts)
**Decision:** Wrap user-provided text in `<document>...</document>` XML-style tags in the `LINT_USER` prompt function, rather than `---` (triple-dash) delimiters.
**Rationale:** Technical documentation frequently contains `---` for Markdown horizontal rules and YAML frontmatter. Using `---` as a delimiter could cause the LLM to misparse the boundary between instructions and user input. XML-style tags are unambiguous and not part of normal document content.

## AD-007: Zod schemas as single source of truth for types

**Date:** 2026-03-13
**Phase:** 2A (Schema & Prompts)
**Decision:** Derive all TypeScript types for LLM output from Zod schemas using `z.infer<typeof Schema>` in `lib/schemas.ts`. Consuming modules import types from there rather than defining local interfaces.
**Rationale:** The Zod schemas serve double duty — runtime validation (for `streamObject`/`streamText` structured output) and compile-time types. Defining types separately risks drift between the validation shape and the TypeScript interface. This was demonstrated during Phase 2A when `EmpathyFlagInput` was consolidated from a local interface in `apply-flags.ts` to a schema-inferred type in `schemas.ts`.

## AD-005: Block separator in phrase matching to prevent cross-paragraph false matches

**Date:** 2026-03-13
**Phase:** 1C (Editor State Management)
**Decision:** Use `doc.textBetween(0, doc.content.size, "\n")` with a newline block separator instead of `doc.textContent` when building the searchable text for phrase matching in `applyFlags()`.
**Rationale:** ProseMirror's `doc.textContent` concatenates paragraph text with no separator between blocks. This means a phrase search could falsely match text that straddles a paragraph boundary (e.g., last word of paragraph 1 + first word of paragraph 2). Since LLM-returned phrases never contain newlines, inserting `"\n"` between blocks prevents these cross-boundary false matches while keeping position mapping correct.

## AD-008: Validate input before consuming rate-limit tokens

**Date:** 2026-03-13
**Phase:** 2B (API Route)
**Decision:** The `/api/lint` route handler validates input (JSON parse, text presence, type, length) before calling `checkRateLimit(ip)`. Only requests that pass all validation checks consume a rate-limit token.
**Rationale:** If rate limiting runs first, malformed or invalid requests consume tokens. An attacker could exhaust another user's rate limit by sending garbage payloads from behind the same proxy. Since validation is cheap (no I/O, no AI calls), running it first has no cost and prevents token waste. Identified as a critical fix during the Phase 2B code review.

## AD-009: Rate limiter constants colocated in module

**Date:** 2026-03-13
**Phase:** 2B (API Route)
**Decision:** `MAX_REQUESTS` (20) and `WINDOW_MS` (1 hour) are defined as module-level constants in `lib/rate-limit.ts`, not in `lib/config.ts`.
**Rationale:** These constants are specific to the rate-limiting concern and have no consumers outside the module (and its tests). Colocating them keeps the module self-contained. `lib/config.ts` is reserved for app-wide configuration (model name, debounce timing, text limits) that multiple modules reference.
