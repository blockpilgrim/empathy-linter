# CONVENTIONS.md

This document tracks established patterns, anti-patterns, and architectural conventions for the Empathy Linter codebase. It is updated after every implementation session.

---

## Project Structure

- **Flat layout** — no `src/` directory. Top-level dirs: `app/`, `components/`, `lib/`, `fonts/`, `docs/`.
- **App Router only** — all routes under `app/`. No pages directory.
- **Client components** get `"use client"` directive at top of file.
- **Shared constants** live in `lib/config.ts`.

## Styling

- **Tailwind v4** with `@tailwindcss/postcss` plugin. No tailwind.config file — configuration via CSS `@theme` blocks in `globals.css`.
- **Design tokens** defined as CSS custom properties in `:root`, bridged to Tailwind via `@theme inline` (for colors) and `@theme` (for fonts).
- **Color palette**: teal/sage green accent (`--accent: #2a7d6e`) on warm paper background. Differentiated from Pulp's burnt sienna.
- **No dark mode** in v1. Can be added later.

## Fonts

- **iA Writer Quattro** (`--font-quattro`) — primary editor/body font, loaded via `next/font/local`.
- **iA Writer Mono** (`--font-ia-mono`) — UI/mono font, loaded via `next/font/local`.
- Font files live in `/fonts/` (woff2 only — .eot and .woff removed as dead weight).

## Dependencies

- Version constraints match the Pulp reference project where applicable.
- `zod` added for schema validation (not present in Pulp).
- No auth libraries (Clerk, etc.) — this is a stateless prototype.

## Security

- **Security headers** applied site-wide in `next.config.ts` via `headers()`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- Apply to `/:path*` (all routes), not just API routes.

## PostCSS

- Tailwind v4 uses `@tailwindcss/postcss` plugin in `postcss.config.mjs` (object-key format: `"@tailwindcss/postcss": {}`). This replaces v3's `tailwindcss` plugin.

## TipTap Editor

- **`immediatelyRender: false`** — required for SSR compatibility with Next.js App Router. Without this, TipTap attempts to render before hydration and causes mismatches.
- **StarterKit with all block formatting disabled** — only paragraphs and hard breaks are kept. The editor is a plain-text writing surface, not a rich-text editor.
- **`EditorContent` wrapped in `.tiptap-editor-wrapper`** — all editor CSS targets `.tiptap-editor-wrapper .tiptap` to scope styles and avoid collisions.
- **Editor component exposes `content` (initial HTML), `onUpdate` (plain text callback), and `onEditorReady` (editor instance callback)** — keeps the component reusable. State management lives in the parent; the parent gets the editor instance via `onEditorReady` to programmatically apply marks.
- **Custom marks use `Mark.create()` from `@tiptap/core`** — marks wrap inline text (unlike Nodes which are block-level). The `empathyFlag` mark stores `id`, `reason`, and `suggestion` as attributes rendered to `data-*` attributes on the DOM span.
- **Highlight marks use `inclusive: false`** — prevents the mark from spreading when users type at the boundary of a highlighted span. This is correct for highlight/annotation marks (unlike formatting marks like bold where `inclusive: true` is desirable).
- **Highlight marks use `excludes` for self-exclusion** — `excludes: "empathyFlag"` prevents overlapping marks of the same type from being applied to the same text range.
- **Mark attributes use `parseHTML`/`renderHTML` pairs** — each attribute defines how to read from and write to the DOM element, using `data-*` attributes for structured data storage.
- **Alias TipTap's `Editor` type as `TipTapEditor`** — the default export of editor.tsx is also named `Editor`, so the type import must be aliased to avoid conflicts.
- **Ref-stabilized callbacks in useEffect** — when a callback prop is used inside a `useEffect`, store the latest value in a ref (`useRef`) and depend only on the stable dependency (e.g., `editor`). This prevents unnecessary effect re-runs when the parent re-renders without memoizing the callback.
- **Design token font sizes via inline `style`** — prefer `style={{ fontSize: "var(--type-2xs)" }}` over Tailwind bracket syntax (`text-[length:var(--type-2xs)]`) for readability when referencing CSS custom properties not bridged to `@theme`.

## Demo Content

- **Demo content is HTML with `<p>` tags** — TipTap expects HTML string for initial content. Use `<p>` tags to separate paragraphs.
- **Demo flags use `exact_phrase` matching** — each flag's `exact_phrase` must be a verbatim substring of the demo content's text (without HTML tags). The `applyFlags()` function will search the document for these phrases.
- **Demo flags are pre-computed, not AI-generated** — the hardcoded `DEMO_FLAGS` array provides instant highlights on page load before the AI runs, giving zero time-to-value.

## Page Layout

- **Single `<main>` wrapper** holds `max-w-2xl mx-auto px-6` — children (header, section, footer) inherit the constraint. Don't repeat layout classes on each section.
- **Entrance animations** use `hero-enter stagger-N` classes (N = 0–3) defined in `globals.css`. Apply to top-level page sections for staggered fade-in on load.

## Applying Marks Programmatically

- **Use `doc.descendants()` + transaction for document-wide mark removal** — `editor.chain().unsetAllMarks()` only operates on the current selection, not the entire document. To remove all empathyFlag marks, walk `doc.descendants()` and call `tr.removeMark()` for each marked text node.
- **Map plain-text offsets to document positions via `doc.descendants()`** — use `doc.textBetween(0, doc.content.size, "\n")` to build a searchable string with newline block separators between paragraphs. This prevents cross-paragraph false matches (since LLM-returned phrases never contain newlines). Walk text nodes to track a running `textOffset` (incrementing by separator length at each block boundary) and compute `from`/`to` as `pos + (targetIndex - nodeTextStart)`.
- **Batch all mark operations (removal + application) into a single transaction** — dispatch one `tr` with all `removeMark()` and `addMark()` calls rather than separate dispatches. This is safe because `removeMark` does not alter document structure or positions. Avoids multiple re-renders and keeps the operation atomic.
- **Generate flag IDs at apply-time, not at creation-time** — the `EmpathyFlagInput` type omits `id`; `applyFlags()` generates a `crypto.randomUUID()` for each flag when creating the mark. This keeps the input shape clean for both demo flags and LLM output.
- **Guard demo flag application with a ref** — use a `useRef(false)` boolean to prevent double-application in React strict mode, which remounts components and fires effects twice in development.

## Schemas & Types

- **Zod schemas live in `lib/schemas.ts`** — all structured data shapes (LLM output, API payloads) are defined once as Zod schemas with `.describe()` annotations for LLM structured output.
- **Inferred types are the single source of truth** — use `z.infer<typeof Schema>` to derive TypeScript types from Zod schemas. Do not duplicate type definitions in consuming modules; import from `schemas.ts` instead.
- **`EmpathyFlagInput` is the LLM output shape** — it has `exact_phrase`, `reason`, `suggestion` but no `id`. The `id` is generated at apply-time by `applyFlags()`. Both demo flags and LLM output conform to this type.

## Prompts

- **System prompt as `const LINT_SYSTEM`** — exported string constant in `lib/prompts.ts`. Contains role definition, flag/no-flag rules, exact_phrase requirements, and calibration guidance.
- **User prompt as `const LINT_USER = (text: string) => ...`** — exported arrow function that takes the text to analyze and returns the user message. Kept simple; the system prompt carries the heavy instructions.
- **Prompt naming convention** — `LINT_` prefix for empathy linting prompts. Follow `{FEATURE}_{ROLE}` pattern (e.g., `LINT_SYSTEM`, `LINT_USER`).
- **XML-style delimiters for user input** — wrap user-provided text in `<document>...</document>` tags rather than `---` delimiters. Markdown horizontal rules and YAML frontmatter in user input could conflict with `---` delimiters.

## Testing

- **Framework:** Vitest (`npm test` runs `vitest run`).
- **Test file co-location** — test files live next to source files as `*.test.ts` (e.g., `lib/schemas.test.ts` alongside `lib/schemas.ts`).
- **Import style** — `import { describe, it, expect } from "vitest"`.
- **Scope** — `vitest.config.ts` includes `**/*.test.ts` with excludes for `node_modules` and `.next`.
- **Path alias** — `@/` alias is mirrored in `vitest.config.ts` via `resolve.alias` to match `tsconfig.json`.

## API Routes

- **Validation before AI call** — validate input (presence, type, length) and check rate limits before creating the Anthropic provider or calling `streamObject`. Fail fast with appropriate 4xx status codes.
- **`streamObject` for structured LLM output** — use `streamObject` from `ai` (not `generateObject`) with a Zod schema. This streams partial objects to the client as the LLM generates them, enabling progressive UI updates.
- **`toTextStreamResponse()` for streaming** — return `result.toTextStreamResponse()` from the route handler. Pass custom headers (e.g., rate-limit info) via the `init` parameter.
- **`createAnthropic` with server-side key** — instantiate the provider in the route handler using `process.env.ANTHROPIC_API_KEY`. Check the key exists and return 500 if missing (don't expose the reason to the client beyond "Server configuration error").
- **`temperature: 0` for analysis tasks** — deterministic output is preferred for linting/analysis. Reserve higher temperatures for creative generation.
- **IP extraction from `x-forwarded-for`** — use `req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()` to get the client IP behind proxies (Vercel). Fall back to `"unknown"`.

## Rate Limiting

- **In-memory Map-based rate limiter** — sufficient for a stateless prototype on a single serverless instance. For production, swap to Redis/Vercel KV.
- **Synchronous `checkRateLimit(ip)` function** — returns `{ allowed: boolean, remaining: number }`. No async needed for in-memory storage.
- **Sweep expired entries on each check** — iterate the Map and delete entries where `resetAt <= Date.now()`. Simple and prevents unbounded memory growth.
- **Constants colocated in the module** — `MAX_REQUESTS` and `WINDOW_MS` live in `lib/rate-limit.ts` (not `lib/config.ts`) since they're rate-limit-specific, not app-wide configuration.

## Anti-Patterns

- **Do NOT use `create-next-app`** in an existing repo — it conflicts with existing files and git history.
- **Do NOT add `src/` directory** — flat structure matches the reference project and keeps imports shorter.
- **Do NOT commit .eot or .woff font files** — only .woff2 is used. Legacy formats add dead weight to git history.
- **Do NOT use `editor.chain().unsetAllMarks()` for document-wide mark clearing** — it only affects the current selection. Use `doc.descendants()` with `tr.removeMark()` instead.
- **Do NOT use `doc.textContent` for phrase matching** — it concatenates paragraphs with no separator, allowing false matches across paragraph boundaries. Use `doc.textBetween(0, doc.content.size, "\n")` instead.
- **Do NOT duplicate Zod-inferred types** — if a type is derived from a Zod schema in `schemas.ts`, import it from there. Do not redefine the same interface in consuming modules.
- **Do NOT use `generateObject` for streaming use cases** — it waits for the full response before returning. Use `streamObject` to enable progressive UI updates as the LLM generates flags.
- **Do NOT expose internal error details to clients** — log the full error to `console.error`, but return a generic "Internal server error" message in the 500 response.
