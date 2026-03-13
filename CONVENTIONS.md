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
- **Map plain-text offsets to document positions via `doc.descendants()`** — ProseMirror's `doc.textContent` gives a flat string, but document positions include overhead for structural nodes (each `<p>` opening/closing tag consumes a position). Walk text nodes to track a running `textOffset` and compute `from`/`to` as `pos + (targetIndex - nodeTextStart)`.
- **Batch mark operations into a single transaction** — dispatch one `tr` with all `addMark()` calls rather than dispatching per-flag. This avoids multiple re-renders and keeps the operation atomic.
- **Generate flag IDs at apply-time, not at creation-time** — the `EmpathyFlagInput` type omits `id`; `applyFlags()` generates a `crypto.randomUUID()` for each flag when creating the mark. This keeps the input shape clean for both demo flags and LLM output.
- **Guard demo flag application with a ref** — use a `useRef(false)` boolean to prevent double-application in React strict mode, which remounts components and fires effects twice in development.

## Anti-Patterns

- **Do NOT use `create-next-app`** in an existing repo — it conflicts with existing files and git history.
- **Do NOT add `src/` directory** — flat structure matches the reference project and keeps imports shorter.
- **Do NOT commit .eot or .woff font files** — only .woff2 is used. Legacy formats add dead weight to git history.
- **Do NOT use `editor.chain().unsetAllMarks()` for document-wide mark clearing** — it only affects the current selection. Use `doc.descendants()` with `tr.removeMark()` instead.
