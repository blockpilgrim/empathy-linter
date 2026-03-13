# Phase 1A Review: Basic Editor Component

**Reviewer:** Claude Opus 4.6 (automated)
**Date:** 2026-03-13
**Commits:** `9515683` (implementation), `f44e579` (conventions)
**Scope:** 3 files changed (editor component, page layout, conventions)

---

## Summary

Phase 1A is a clean, focused implementation that correctly wires up a TipTap editor in a Next.js App Router environment. The editor component follows the reference pattern from Pulp's `canvas.tsx` closely, with appropriate simplification (no provocation logic, no share handling, no editable toggling). The StarterKit configuration is an exact match to the Pulp reference. The page layout is well-structured with proper use of design tokens and entrance animations.

The build passes cleanly and TypeScript reports no errors. There are no critical issues, but there are a few items worth addressing before Phase 1B and Phase 3 work begins.

---

## Files Reviewed

| File | Verdict |
|---|---|
| `components/editor.tsx` | Warning (premature `"use client"` on page) |
| `app/page.tsx` | Warning (see W1, W2) |
| `app/globals.css` | Clean (no changes in Phase 1A) |
| `app/layout.tsx` | Clean (no changes in Phase 1A) |
| `CONVENTIONS.md` | Clean |

---

## Critical (Must Fix)

None. The implementation is correct, the build passes, and the editor renders properly with SSR safety.

---

## Warnings (Should Fix)

### W1. `page.tsx` is marked `"use client"` unnecessarily at this stage

`app/page.tsx` has `"use client"` at line 1, but it currently contains no hooks, no event handlers, no browser APIs, and no state. It imports `<Editor />`, which is itself a client component and will create a client boundary automatically. In Next.js App Router, a server component can render a client component child without issue.

Making `page.tsx` a client component means:
- The entire page is excluded from server-side rendering of its static HTML (header, footer text).
- The page cannot use server-only features (e.g., `fetch` with caching, `cookies()`, `headers()`) if they become needed later.
- Static metadata export (`export const metadata`) is disallowed in client components; you would need to move metadata to `layout.tsx` or a separate `generateMetadata` function.

This will become a real problem in Phase 3 (Ambient Scanning Pipeline), where `page.tsx` will need `useState`, `useRef`, `useEffect`, and `useCallback` for debounced analysis, AbortController management, and flags state. At that point, `"use client"` will be justified. However, the better architecture is to keep `page.tsx` as a server component and extract the stateful logic into a separate client component (e.g., `components/linter-view.tsx`) that wraps the editor and manages analysis state. This preserves SSR for the page shell.

**Recommendation:** For now this is not blocking, but consider the architecture before Phase 3. If `page.tsx` will inevitably become a client component in Phase 3 anyway (which seems likely given the implementation plan's design of putting all state in `page.tsx`), then this is a non-issue and the `"use client"` is simply early. The tradeoff is documented here for awareness.

**File:** `/Users/personal/work-projects/empathy-linter/app/page.tsx`, line 1

---

### W2. Repeated `max-w-2xl mx-auto px-6` layout classes across header, section, and footer

The same layout constraint (`w-full max-w-2xl mx-auto px-6`) is duplicated on all three children of `<main>`:

```tsx
<header className="w-full max-w-2xl mx-auto px-6 ...">
<section className="w-full max-w-2xl mx-auto px-6 ...">
<footer className="w-full max-w-2xl mx-auto px-6 ...">
```

This works correctly today, but it means changing the max-width or horizontal padding requires updating three places. A wrapper `<div>` or applying the constraint to `<main>` itself would centralize this. However, this pattern does provide flexibility if header/footer ever need different widths than the editor.

**Recommendation:** Mild concern. If the max-width will always be the same for all sections, consider extracting it to a single wrapper. If sections may diverge later (e.g., a full-width toolbar above the editor), the current approach is fine.

**File:** `/Users/personal/work-projects/empathy-linter/app/page.tsx`, lines 9, 26, 31

---

## Suggestions (Consider)

### S1. Editor component does not expose the editor instance

The `Editor` component currently accepts `content` and `onUpdate` props but does not expose the TipTap `editor` instance to the parent. In Phase 1C (step 1.8), `applyFlags(editor, flags)` will need direct access to the editor instance to programmatically add and remove marks.

The two common approaches:
1. **Ref forwarding:** Use `useImperativeHandle` + `forwardRef` to expose the editor instance (or specific methods) via a ref.
2. **Lift the hook:** Move `useEditor` to the parent component and pass the editor down to `<EditorContent />` directly (closer to Pulp's pattern where `Canvas` owns the editor).

This is not a problem for Phase 1A (which is just the basic editor), but it will need to be addressed before Phase 1C/Phase 3. Worth keeping in mind during the next implementation session.

**File:** `/Users/personal/work-projects/empathy-linter/components/editor.tsx`

---

### S2. `content` prop type is `string` but TipTap accepts `string | JSONContent`

The `EditorProps` interface declares `content?: string`, and the CONVENTIONS.md entry says the component exposes "`content` (initial HTML)". TipTap's `useEditor` content option accepts `string` (parsed as HTML), `JSONContent` (ProseMirror JSON), or `null`. For the demo content use case (Phase 1B, step 1.6), passing an HTML string works fine. However, the type and the documentation imply HTML, but `demo-content.ts` is still a TODO placeholder. If the demo content ends up being plain text rather than HTML, `<p>` wrapping will be needed or TipTap will parse it as a single text node.

This is a forward-looking note, not a current bug.

**File:** `/Users/personal/work-projects/empathy-linter/components/editor.tsx`, line 8

---

### S3. `onUpdate` returns `editor.getText()` which strips paragraph boundaries

The `onUpdate` callback calls `editor.getText()`, which returns all text content concatenated. By default, TipTap's `getText()` joins block nodes with `\n\n`, but this depends on the block separator configuration. The Pulp reference uses a custom `extractUserText()` function that explicitly walks `doc.forEach()` to join paragraphs with `\n\n`.

For the empathy linter's use case (sending text to the LLM for analysis), `getText()` is likely fine since paragraph separation is not semantically critical for jargon detection. However, if `exact_phrase` matching in Phase 1C needs to find phrases that span across paragraph boundaries, the separator behavior matters.

Worth verifying that `editor.getText()` produces output consistent with what the LLM will see and what `applyFlags()` will search against.

**File:** `/Users/personal/work-projects/empathy-linter/components/editor.tsx`, line 35

---

### S4. Missing `dropcursor` and `gapcursor` in StarterKit disable list

StarterKit includes `dropcursor` and `gapcursor` extensions by default. These are harmless for a plain-text editor but are technically unnecessary overhead. The Pulp reference also leaves them enabled (they are not in Pulp's disable list either), so this is consistent with the reference pattern. Mentioning for completeness only -- not worth changing.

---

### S5. CONVENTIONS.md entry about inline `style` for design tokens

The new convention entry states:

> Tailwind v4 cannot reference CSS custom properties like `var(--type-2xs)` in utility classes.

This is accurate for arbitrary custom properties, but Tailwind v4 does support arbitrary values via bracket notation (e.g., `text-[length:var(--type-2xs)]`). The inline `style` approach is arguably cleaner and more readable than the bracket syntax, so the convention is a reasonable choice. Just noting that the "cannot" framing is slightly overstated -- it is more "should not" for readability reasons.

**File:** `/Users/personal/work-projects/empathy-linter/CONVENTIONS.md`, line 48

---

## Convention Compliance

| Convention | Status |
|---|---|
| Flat layout (no `src/`) | Compliant |
| App Router only | Compliant |
| Client components have `"use client"` | Compliant |
| `immediatelyRender: false` on useEditor | Compliant |
| StarterKit with block formatting disabled | Compliant |
| `EditorContent` wrapped in `.tiptap-editor-wrapper` | Compliant |
| Design token font sizes via inline `style` | Compliant |
| Editor exposes `content` and `onUpdate` props | Compliant |
| Constants in `lib/config.ts` | N/A (no new constants added) |
| No auth libraries | Compliant |

---

## Patterns to Document

1. **Editor instance access pattern:** Before Phase 1C, a convention should be established for how parent components access the TipTap editor instance (ref forwarding vs. lifting the hook). This affects the architecture of `applyFlags()` and the ambient scanning pipeline.

2. **`getText()` vs. custom text extraction:** If `editor.getText()` proves insufficient for exact-phrase matching, document whether the project should use a custom extraction function (like Pulp's `extractUserText()`) or stick with the built-in method.

---

## Correctness Verification

- `npm run build` passes cleanly (static page generation succeeds).
- TypeScript compilation has zero errors.
- The `immediatelyRender: false` flag prevents SSR hydration mismatches.
- The StarterKit configuration matches the Pulp reference exactly (same 11 extensions disabled).
- The Placeholder extension is correctly configured with the specified placeholder text from the implementation plan (step 1.1).
- The page layout correctly uses the `hero-enter` and `stagger-*` animation classes defined in `globals.css`.
- Editor CSS in `globals.css` (lines 128-158) correctly scopes all styles under `.tiptap-editor-wrapper .tiptap`, matching the convention.

---

## Overall Assessment

This is a solid Phase 1A delivery. The editor component is minimal, correct, and convention-compliant. The page layout is clean and uses the design system properly. The conventions update accurately captures the patterns established. The main forward-looking concern is how the editor instance will be exposed for programmatic mark manipulation in Phase 1C -- worth planning before implementing.
