# Phase 0 Bootstrap Review

**Reviewer:** Claude Opus 4.6 (automated)
**Date:** 2026-03-13
**Commit:** `39d0137` — bootstrap: initialize Next.js 16 project with TipTap, AI SDK, and design system
**Scope:** 44 files added (project skeleton, design tokens, font assets, placeholder modules)

---

## Summary

This is a well-executed Phase 0 bootstrap. The project builds cleanly (`next build` succeeds), TypeScript compiles with zero errors (`tsc --noEmit` passes), and ESLint reports no violations. The design system in `globals.css` is thorough and production-quality. Architecture aligns with the decisions documented in `CLAUDE.md`, `BUILD-STRATEGY.md`, and `CONVENTIONS.md`.

The findings below are ordered by severity. Nothing here blocks forward progress, but several items should be addressed before Phase 1 implementation begins.

---

## Files Reviewed

| File | Verdict |
|---|---|
| `package.json` | Clean |
| `tsconfig.json` | Clean |
| `next.config.ts` | Warning (security headers) |
| `postcss.config.mjs` | Clean |
| `eslint.config.mjs` | Clean |
| `app/globals.css` | Warning (font-family duplication) |
| `app/layout.tsx` | Warning (font weight mismatch) |
| `app/page.tsx` | Clean |
| `lib/config.ts` | Suggestion (model name) |
| `lib/demo-content.ts` | Clean (placeholder) |
| `lib/empathy-extension.ts` | Clean (placeholder) |
| `lib/prompts.ts` | Clean (placeholder) |
| `lib/schemas.ts` | Clean (placeholder) |
| `app/api/lint/route.ts` | Clean (placeholder) |
| `components/editor.tsx` | Clean (placeholder) |
| `components/empathy-popover.tsx` | Clean (placeholder) |
| `.gitignore` | Clean |
| `.env.example` | Clean |
| `CONVENTIONS.md` | Clean |
| `fonts/*` | Suggestion (unused .eot files) |

---

## Critical (Must Fix)

None. The build passes, types check, and the project skeleton is sound.

---

## Warnings (Should Fix)

### W1. Font weight mismatch in `layout.tsx` line 20

```typescript
{ path: "../fonts/iAWriterMonoS-Bold.woff2", weight: "500", style: "normal" },
```

The file is named `iAWriterMonoS-Bold`, which is the 700-weight variant of iA Writer Mono. Registering it as `weight: "500"` means that when CSS requests `font-weight: 500` it will get the Bold face, but when it requests `font-weight: 700` (the actual bold weight), the browser will attempt synthetic bolding or fall back to system fonts.

This is likely intentional (using the bold cut at medium weight for a design choice), but if so, it should have a comment explaining the deliberate remapping. If unintentional, change to `"700"`.

**File:** `/Users/personal/work-projects/empathy-linter/app/layout.tsx`, line 20

---

### W2. Security headers are minimal

`next.config.ts` only sets `X-Content-Type-Options: nosniff` on `/api/:path*`. For a publicly deployed demo, consider adding at minimum:

- `X-Frame-Options: DENY` (prevents clickjacking on the whole site)
- `Referrer-Policy: strict-origin-when-cross-origin` (prevents leaking full URLs)

These can be applied to `/:path*` (all routes), not just API routes. This is a prototype, so a full CSP is not necessary, but `X-Frame-Options` and `Referrer-Policy` are low-effort wins.

**File:** `/Users/personal/work-projects/empathy-linter/next.config.ts`

---

### W3. Duplicated font-family declaration between `body` rule and `@theme` block

In `globals.css`, the `body` rule (line 82) hardcodes the same fallback stack that the `@theme` block (line 71) already defines as `--font-sans`:

```css
/* @theme block, line 71 */
--font-sans: var(--font-quattro), ui-sans-serif, system-ui, sans-serif;

/* body rule, line 82 */
font-family: var(--font-quattro), ui-sans-serif, system-ui, sans-serif;
```

The `body` rule should use `font-family: var(--font-sans)` to leverage the Tailwind theme token instead of duplicating the fallback chain. This keeps the single source of truth in the `@theme` block and means that `class="font-sans"` and the body default always agree.

**File:** `/Users/personal/work-projects/empathy-linter/app/globals.css`, lines 71 vs 82

---

### W4. Missing BoldItalic variant in `iaMono` font registration

`layout.tsx` registers three variants for `iaMono` (Regular, Italic, Bold) but omits BoldItalic. Meanwhile, the `iAWriterMonoS-BoldItalic.woff2` file is committed to the repo and the `.eot`/`.woff` siblings are also present. If bold-italic mono text is ever rendered (e.g., in code blocks with emphasis), the browser will synthesize it rather than use the proper font file.

This is low-severity since mono bold-italic is rarely needed in this UI, but the font file is already shipped -- it costs nothing to register it.

**File:** `/Users/personal/work-projects/empathy-linter/app/layout.tsx`, lines 16-23

---

## Suggestions (Consider)

### S1. Remove `.eot` font files from the repository

Eight `.eot` files are committed to `/fonts/`. The EOT format was required for Internet Explorer 6-8, which are long-dead browsers. The project only uses `.woff2` in `layout.tsx` (correct -- it is the modern standard). These files add ~360KB of binary weight to the git history for zero benefit.

Removing them would reduce the repo size and avoid confusion about which font formats are actually used.

**Files:** `/Users/personal/work-projects/empathy-linter/fonts/*.eot` (8 files)

---

### S2. Consider pinning `next` and `eslint-config-next` with `^` instead of exact version

`next` is pinned to exact `16.1.6` while `eslint-config-next` is also exact `16.1.6`. All other dependencies use `^` ranges. The exact pinning is defensible (Next.js minor versions can introduce breaking changes), but it means `npm update` will not pick up patch fixes.

This is a style choice. The current approach is valid; just noting the inconsistency for awareness. If exact pinning is the intent, consider documenting it in `CONVENTIONS.md`.

---

### S3. `body::after` paper texture uses `z-index: 0` with `position: fixed`

The texture overlay (line 91-99) uses `position: fixed; z-index: 0` and then `body > *` gets `z-index: 1`. This works correctly today because all interactive content is a direct child of `body`. However, any future element with `position: fixed` or `position: sticky` (e.g., a floating toolbar, a toast notification) will need explicit `z-index > 0` to appear above the texture.

This is fine for now but worth a comment in the CSS so future implementers know about the stacking context requirement.

**File:** `/Users/personal/work-projects/empathy-linter/app/globals.css`, lines 90-105

---

### S4. `MAX_TEXT_LENGTH` (5000 chars) vs BUILD-STRATEGY.md (1000 words)

`lib/config.ts` sets `MAX_TEXT_LENGTH = 5000` (characters). `BUILD-STRATEGY.md` says "we assume short documents (under 1000 words)". At ~5 characters per word, 1000 words is roughly 5000 characters, so these are consistent. However, the constant name says "text length" which could be ambiguous (characters vs words vs bytes). A brief comment in `config.ts` clarifying the unit would prevent confusion:

```typescript
export const MAX_TEXT_LENGTH = 5000; // characters
```

**File:** `/Users/personal/work-projects/empathy-linter/lib/config.ts`

---

### S5. Placeholder files export nothing usable

`lib/empathy-extension.ts`, `lib/prompts.ts`, `lib/schemas.ts`, and `lib/demo-content.ts` contain only TODO comments and export nothing. This is fine for a bootstrap commit, but any attempt to import from them will fail at the TypeScript level (no default export, no named exports). Consider adding minimal stub exports so that Phase 1 implementation can import from them immediately without restructuring:

```typescript
// lib/schemas.ts
export {}; // placeholder - prevents "module has no exports" errors
```

This is extremely minor and may not matter if Phase 1 replaces these files entirely.

---

### S6. `CONVENTIONS.md` could document the PostCSS config format

The conventions document covers Tailwind v4 configuration (no `tailwind.config` file, use `@theme` blocks) but does not mention the PostCSS config format. Since Tailwind v4 changed the plugin from `tailwindcss` to `@tailwindcss/postcss`, and the config format is non-obvious (object-style `plugins` with string keys rather than the array-of-functions format from v3), this is worth a one-liner in the Styling section.

---

## Convention Compliance

The commit is fully compliant with `CONVENTIONS.md`:

| Convention | Status |
|---|---|
| Flat layout (no `src/`) | Compliant |
| App Router only | Compliant |
| Client components have `"use client"` | Compliant (`editor.tsx`, `empathy-popover.tsx`) |
| Constants in `lib/config.ts` | Compliant |
| Tailwind v4 via `@tailwindcss/postcss` | Compliant |
| Design tokens as CSS custom properties | Compliant |
| Fonts via `next/font/local` | Compliant |
| No auth libraries | Compliant |
| No `create-next-app` | Compliant (manual setup) |

---

## Patterns to Document

1. **PostCSS plugin format for Tailwind v4**: The object-key format (`"@tailwindcss/postcss": {}`) in `postcss.config.mjs` differs from v3's array format. Worth adding to CONVENTIONS.md Styling section.

2. **Security headers pattern**: The `next.config.ts` `headers()` approach for API route headers. Once expanded, document which headers apply to which route patterns.

3. **Font registration strategy**: The split between `@theme inline` (colors, resolved from `:root`) and `@theme` (fonts, resolved lazily from `next/font` scoped vars) is a nuanced Tailwind v4 pattern that deserves a comment or convention entry. The existing comment in `globals.css` lines 68-69 is good; consider promoting it to CONVENTIONS.md.
