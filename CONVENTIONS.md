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
- Font files live in `/fonts/` (woff2 format for web use).

## Dependencies

- Version constraints match the Pulp reference project where applicable.
- `zod` added for schema validation (not present in Pulp).
- No auth libraries (Clerk, etc.) — this is a stateless prototype.

## Anti-Patterns

- **Do NOT use `create-next-app`** in an existing repo — it conflicts with existing files and git history.
- **Do NOT add `src/` directory** — flat structure matches the reference project and keeps imports shorter.
