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
- **Editor component exposes `content` (initial HTML) and `onUpdate` (plain text callback)** — keeps the component reusable. State management lives in the parent.
- **Design token font sizes via inline `style`** — prefer `style={{ fontSize: "var(--type-2xs)" }}` over Tailwind bracket syntax (`text-[length:var(--type-2xs)]`) for readability when referencing CSS custom properties not bridged to `@theme`.

## Page Layout

- **Single `<main>` wrapper** holds `max-w-2xl mx-auto px-6` — children (header, section, footer) inherit the constraint. Don't repeat layout classes on each section.
- **Entrance animations** use `hero-enter stagger-N` classes (N = 0–3) defined in `globals.css`. Apply to top-level page sections for staggered fade-in on load.

## Anti-Patterns

- **Do NOT use `create-next-app`** in an existing repo — it conflicts with existing files and git history.
- **Do NOT add `src/` directory** — flat structure matches the reference project and keeps imports shorter.
- **Do NOT commit .eot or .woff font files** — only .woff2 is used. Legacy formats add dead weight to git history.
