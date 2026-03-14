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
- **Use `.refine()` for semantic string validation** — `.min(1)` only checks length; whitespace-only strings pass. Use `.refine(s => s.trim().length > 0)` for fields like `exact_phrase` where meaningful content is required.

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
- **Golden evaluation dataset** — `lib/eval/golden-dataset.ts` contains jargon-heavy samples with `expectedFlags` (verbatim phrases + `why`) and `shouldNotFlag` lists. Used by prompt tests to validate prompt structure and schema conformance without calling the LLM.
- **`vi.resetModules()` for stateful module isolation** — when testing modules with module-level state (e.g., the rate limiter's `Map`), use `vi.resetModules()` in `beforeEach` and dynamic `await import()` in each test to get a fresh module instance.

## API Routes

- **Validation before rate limiting, rate limiting before AI call** — validate input (JSON parse, presence, type, length) first so invalid requests don't consume rate-limit tokens. Then check rate limits. Then create the Anthropic provider and call `streamObject`. Fail fast with appropriate 4xx status codes.
- **`streamObject` for structured LLM output** — use `streamObject` from `ai` (not `generateObject`) with a Zod schema. This streams partial objects to the client as the LLM generates them, enabling progressive UI updates.
- **`toTextStreamResponse()` for streaming** — return `result.toTextStreamResponse()` from the route handler. Pass custom headers (e.g., rate-limit info) via the `init` parameter.
- **`createAnthropic` with server-side key** — instantiate the provider in the route handler using `process.env.ANTHROPIC_API_KEY`. Check the key exists and return 500 if missing (don't expose the reason to the client beyond "Server configuration error").
- **`temperature: 0` for analysis tasks** — deterministic output is preferred for linting/analysis. Reserve higher temperatures for creative generation.
- **IP extraction from `x-forwarded-for`** — use `req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()` to get the client IP behind proxies (Vercel). Fall back to `"unknown"`.
- **Wrap `req.json()` in its own try/catch** — malformed JSON bodies throw `SyntaxError`. Catch it explicitly and return 400 with `"Invalid JSON in request body"` rather than letting it fall through to the generic 500 handler.
- **Include `Retry-After` header on 429 responses** — return the number of seconds until the rate-limit window resets. Well-behaved clients use this for backoff.

## Rate Limiting

- **In-memory Map-based rate limiter** — sufficient for a stateless prototype on a single serverless instance. For production, swap to Redis/Vercel KV.
- **Synchronous `checkRateLimit(ip)` function** — returns `{ allowed: boolean, remaining: number, retryAfter: number }`. `retryAfter` is seconds until the rate-limit window resets (0 when `allowed` is true). No async needed for in-memory storage.
- **Sweep expired entries on each check** — iterate the Map and delete entries where `resetAt <= Date.now()`. Simple and prevents unbounded memory growth.
- **Constants colocated in the module** — `MAX_REQUESTS` and `WINDOW_MS` live in `lib/rate-limit.ts` (not `lib/config.ts`) since they're rate-limit-specific, not app-wide configuration.

## Ambient Scanning Pipeline

- **Debounce with refs, not state** — use `useRef` for the debounce timer, `lastAnalyzedText`, and `AbortController`. These values don't need to trigger re-renders and using state would cause unnecessary re-render cycles during the debounce window.
- **`DEBOUNCE_MS` from `lib/config.ts`** — the 2000ms debounce delay is an app-wide constant. Import it rather than hardcoding.
- **AbortController for in-flight cancellation** — when a new analysis starts, abort any in-flight request first. Store the controller in a ref. In the `finally` block, only clear `isAnalyzing` if the controller is still the active one (a newer request may have already replaced it).
- **`parsePartialJson` from `ai` for streaming consumption** — the `toTextStreamResponse()` format streams text chunks that form valid JSON when concatenated. Accumulate chunks and use `parsePartialJson` to reconstruct partial objects mid-stream. This enables progressive highlight reveal as flags arrive.
- **Text-change guard prevents redundant analysis** — store the last analyzed text in a ref. Skip the API call if the current text matches. Also seed this ref with the demo content on mount to avoid re-analyzing pre-loaded content.
- **Cleanup on unmount** — clear the debounce timer and abort any in-flight request in the `useEffect` cleanup function. Prevents memory leaks and stale requests.
- **Loading indicator in the footer** — three `.loading-dot` spans with staggered `animationDelay` provide a subtle pulsing indicator. Non-disruptive positioning in the footer keeps the editor area clean. Use `role="status"` for screen reader announcements.
- **Filter streaming flags to complete objects** — `parsePartialJson` may return flags with `undefined` fields during streaming. Filter to flags where `exact_phrase`, `reason`, and `suggestion` are all truthy before calling `applyFlags()`.
- **Only re-apply marks when a new flag arrives** — track `previousFlagCount` and only call `applyFlags()` when `completeFlags.length > previousFlagCount`. This reduces calls from ~30 (every chunk) to ~8 (once per new flag).
- **Update React state once after streaming completes** — call `setFlags()` after the `while` loop, not on every chunk. Reduces unnecessary re-renders from ~30 to 1 per analysis cycle.

## Popovers

- **Popover component is presentational** — receives `reason`, `suggestion`, `anchor` (DOMRect), and `onClose` as props. State management (which popover is open) lives in `page.tsx`, not in the component.
- **Fixed positioning with `getBoundingClientRect()`** — anchor the popover using `position: fixed` and the clicked element's `getBoundingClientRect()`. This works regardless of scroll position or DOM nesting.
- **Measure-then-position pattern** — render the popover invisibly (`visibility: hidden`) on first render to measure its dimensions via the DOM ref, then compute the final position and make it visible. This avoids a flash of mispositioned content.
- **Viewport edge handling** — default to below the anchor; flip above if the popover would overflow the viewport bottom. Clamp horizontal position to keep the popover within viewport edges with padding.
- **Recompute on resize/scroll** — add `resize` and `scroll` (with `capture: true` for scroll) event listeners to reposition the popover when the viewport changes.
- **Click-outside uses `mousedown` (not `click`)** — from the Pulp pattern. `mousedown` fires before `click`, ensuring the popover dismisses before other click handlers run.
- **Event delegation for mark clicks** — attach a single `click` listener to the editor wrapper section, not to individual highlight spans. Use `.closest(".empathy-highlight")` to find the clicked span. This works correctly as highlights are created/destroyed dynamically by TipTap.
- **Read flag metadata from DOM `data-*` attributes** — the click handler reads `data-reason` and `data-suggestion` from the clicked span element, not from React state. This keeps the click handler independent of the React render cycle.
- **Auto-dismiss on typing** — clear popover state in `handleTextUpdate` so the popover does not block writing flow.
- **Popover rendered outside the editor wrapper** — render `<EmpathyPopover>` as a sibling to the editor section, not inside `.tiptap-editor-wrapper`, to avoid editor CSS scoping issues.

## Anti-Patterns

- **Do NOT use `create-next-app`** in an existing repo — it conflicts with existing files and git history.
- **Do NOT add `src/` directory** — flat structure matches the reference project and keeps imports shorter.
- **Do NOT commit .eot or .woff font files** — only .woff2 is used. Legacy formats add dead weight to git history.
- **Do NOT use `editor.chain().unsetAllMarks()` for document-wide mark clearing** — it only affects the current selection. Use `doc.descendants()` with `tr.removeMark()` instead.
- **Do NOT use `doc.textContent` for phrase matching** — it concatenates paragraphs with no separator, allowing false matches across paragraph boundaries. Use `doc.textBetween(0, doc.content.size, "\n")` instead.
- **Do NOT duplicate Zod-inferred types** — if a type is derived from a Zod schema in `schemas.ts`, import it from there. Do not redefine the same interface in consuming modules.
- **Do NOT use `generateObject` for streaming use cases** — it waits for the full response before returning. Use `streamObject` to enable progressive UI updates as the LLM generates flags.
- **Do NOT expose internal error details to clients** — log the full error to `console.error`, but return a generic "Internal server error" message in the 500 response.
- **Do NOT use `useObject` from `ai/react` in AI SDK v6** — the hook does not exist in the `ai@^6.0.93` package. Consume `toTextStreamResponse()` streams manually with `fetch` + `ReadableStream` reader + `parsePartialJson` from `ai`.
- **Do NOT use state for debounce internals** — storing the debounce timer, last-analyzed text, or AbortController in React state causes unnecessary re-renders. Use `useRef` for values that the render cycle does not need to observe.
- **Do NOT render popovers inside `.tiptap-editor-wrapper`** — editor CSS scoping (`.tiptap-editor-wrapper .tiptap`) can interfere with popover styles. Render popovers as siblings to the editor section.
- **Do NOT attach click listeners to individual highlight spans** — TipTap dynamically creates/destroys spans when marks change. Use event delegation on a stable parent element instead.
