# Phase 1B Review: Empathy Highlight Extension and Demo Content

**Reviewer:** Claude Opus 4.6 (automated)
**Date:** 2026-03-13
**Commits:** `9eddc0a` (implementation), `99976a8` (conventions)
**Scope:** 4 files changed (mark extension, demo content, editor component, conventions)

---

## Summary

Phase 1B introduces the custom TipTap Mark extension (`empathyFlag`) and the demo content with pre-computed flags. The implementation is clean and follows the implementation plan closely. The mark extension correctly uses `Mark.create()` with `parseHTML`/`renderHTML` pairs, attribute-level DOM serialization via `data-*` attributes, and proper use of `mergeAttributes`. The demo content is well-crafted jargon-dense text with accurate `exact_phrase` values that all match verbatim in the content.

The editor component update addresses two forward-looking concerns from the Phase 1A review: S1 (editor instance exposure) is resolved via the `onEditorReady` callback pattern, and S2 (demo content as HTML) is resolved with proper `<p>` tag wrapping.

TypeScript compilation passes with zero errors. There is one critical finding (missing `inclusive: false` on the mark) and a few minor items.

---

## Files Reviewed

| File | Verdict |
|---|---|
| `lib/empathy-extension.ts` | Critical (C1: missing `inclusive: false`) |
| `lib/demo-content.ts` | Clean |
| `components/editor.tsx` | Warning (W1: useEffect dependency) |
| `CONVENTIONS.md` | Clean |

---

## Critical (Must Fix)

### C1. Mark is missing `inclusive: false` -- typing at highlight edges extends the mark

**File:** `/Users/personal/work-projects/empathy-linter/lib/empathy-extension.ts`

The `empathyFlag` mark does not set `inclusive: false`. In ProseMirror (and therefore TipTap), marks default to `inclusive: true`, meaning that when a user places their cursor at the boundary of a marked range and types, the new characters inherit the mark. For the empathy linter, this is incorrect behavior: if the user types next to a highlighted phrase like "gRPC", the new text should not be highlighted. The flag should only cover the original exact phrase identified by the analysis.

**Fix:** Add `inclusive: false` to the mark definition:

```typescript
export const EmpathyFlag = Mark.create({
  name: "empathyFlag",
  inclusive: false,
  // ...rest
});
```

This is a correctness issue that will cause confusing UX as soon as users edit text near highlights. Without this fix, the only way to stop the highlight from spreading is to move the cursor outside the mark, type, and then move back -- which is not intuitive.

---

## Warnings (Should Fix)

### W1. `useEffect` dependency on `onEditorReady` may cause unnecessary re-fires

**File:** `/Users/personal/work-projects/empathy-linter/components/editor.tsx`, lines 51-55

```typescript
useEffect(() => {
  if (editor) {
    onEditorReady?.(editor);
  }
}, [editor, onEditorReady]);
```

The `onEditorReady` callback is included in the dependency array, which is correct per React's exhaustive-deps rule. However, if the parent component does not wrap `onEditorReady` in `useCallback`, every parent re-render creates a new function reference, triggering this effect again. The effect body is idempotent (the parent receives the same editor instance), so this is not a correctness bug, but it is unnecessary work.

Two mitigation options:

1. **Document the requirement:** Add a JSDoc comment or a note in CONVENTIONS.md that `onEditorReady` should be memoized with `useCallback` in the parent.
2. **Use a ref to stabilize:** Store the latest `onEditorReady` in a ref and only depend on `editor` in the effect:

```typescript
const onEditorReadyRef = useRef(onEditorReady);
onEditorReadyRef.current = onEditorReady;

useEffect(() => {
  if (editor) {
    onEditorReadyRef.current?.(editor);
  }
}, [editor]);
```

Option 1 is simpler and sufficient for this project (single consumer). Option 2 is more defensive. Either way, this becomes more important in Phase 3 when `page.tsx` will have frequent state updates from the analysis pipeline.

---

## Suggestions (Consider)

### S1. Demo content could flag additional jargon-dense phrases

The demo text contains several additional unexplained terms that are not flagged:

- "tokenization" -- ambiguous (payments vs. NLP vs. security)
- "PCI-compliant vault" -- PCI DSS is a specific compliance standard
- "canary deployment" -- deployment strategy term
- "Temporal workflows" -- specific workflow engine
- "event-sourced projections" -- domain-driven design pattern
- "order aggregate" -- DDD-specific term
- "Kafka" -- specific message broker
- "PMO" -- acronym (Project Management Office)
- "read replicas" -- database scaling concept

This is by design -- the `DEMO_FLAGS` array provides a representative sample, not an exhaustive list. The AI will flag additional terms when it runs. However, having 8 flags on a 3-paragraph text is already dense. The current selection is well-balanced: it covers acronyms (k8s, SLOs, CDC), proper nouns (PgBouncer), compound concepts (circuit breaker, P99 latency, burn rate exceeds 6x), and a protocol (gRPC). No action needed, but documenting the rationale would help future contributors understand why not every jargon term is pre-flagged.

### S2. Demo flags lack `id` field -- `applyFlags()` will need to generate them

The `DEMO_FLAGS` entries have `exact_phrase`, `reason`, and `suggestion`, but no `id`. The mark extension defines `id` as an attribute with `default: null`. The future `applyFlags()` function (Phase 1C, step 1.8) will need to generate unique IDs when applying marks. This is not a bug in Phase 1B since `applyFlags()` does not exist yet, but worth noting for Phase 1C planning. The schema in `lib/schemas.ts` (still a TODO) should define the same shape.

### S3. `EmpathyFlag` has both named export and default export

**File:** `/Users/personal/work-projects/empathy-linter/lib/empathy-extension.ts`, lines 3 and 58

```typescript
export const EmpathyFlag = Mark.create({ ... });
export default EmpathyFlag;
```

The editor imports it as a default import: `import EmpathyFlag from "@/lib/empathy-extension"`. Having both named and default exports is not wrong, but it creates two ways to import the same thing, which can lead to inconsistency across the codebase. The project does not have a documented convention for named vs. default exports. Consider picking one and documenting it, or removing the named export if default is the intended API surface.

### S4. Consider adding `excludes` to prevent mark overlap

ProseMirror marks can overlap by default. If the AI flags "circuit breaker" and a future mark (e.g., a user annotation) also targets the same text, both marks would apply simultaneously. For the empathy linter, overlapping empathy flags on the same text range would be confusing. Setting `excludes: "empathyFlag"` (self-exclusion) would prevent the same mark type from being applied twice to overlapping ranges:

```typescript
export const EmpathyFlag = Mark.create({
  name: "empathyFlag",
  excludes: "empathyFlag",
  // ...
});
```

This is a defensive measure. The `applyFlags()` function in Phase 1C is planned to clear all existing marks before applying new ones (step 1.8: "Remove all existing empathyFlag marks from the document"), which makes overlap unlikely in practice. But if the clearing step has a bug or if streaming flags arrive incrementally, self-exclusion provides a safety net.

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
| Custom marks use `Mark.create()` from `@tiptap/core` | Compliant |
| Mark attributes use `parseHTML`/`renderHTML` pairs | Compliant |
| Alias TipTap Editor type as `TipTapEditor` | Compliant |
| Demo content uses `<p>` tags for paragraphs | Compliant |
| Demo flags use `exact_phrase` as verbatim substrings | Compliant (all 8 verified) |
| Constants in `lib/config.ts` | N/A (no new constants) |

---

## Patterns to Document

1. **Mark `inclusive` behavior:** When creating custom TipTap marks for highlighting (not formatting), always set `inclusive: false` to prevent the mark from spreading when users type at the boundary. This differs from formatting marks like bold/italic where `inclusive: true` is desirable.

2. **Callback prop memoization:** When passing callback props (like `onEditorReady`) to components that use them in `useEffect` dependencies, the parent should wrap the callback in `useCallback` to prevent unnecessary effect re-runs. This should be documented as a convention or enforced via the ref pattern.

3. **Demo flags as a subset:** The `DEMO_FLAGS` array is intentionally a curated subset of flaggable terms, not an exhaustive list. This provides a clean initial experience without overwhelming the user. The AI analysis will surface additional flags.

---

## Exact Phrase Verification

All 8 `exact_phrase` values in `DEMO_FLAGS` were verified to appear verbatim in the `DEMO_CONTENT` text (HTML tags stripped):

| `exact_phrase` | Found |
|---|---|
| `gRPC` | Yes |
| `k8s` | Yes |
| `circuit breaker` | Yes |
| `P99 latency` | Yes |
| `PgBouncer` | Yes |
| `SLOs` | Yes |
| `burn rate exceeds 6x` | Yes |
| `CDC` | Yes |

No phrases are duplicated within the text (each appears exactly once), which aligns with the Phase 1C edge case handling ("flag only the first occurrence").

---

## Security Assessment

- **XSS via data attributes:** The `reason` and `suggestion` strings are stored in `data-*` attributes on DOM `<span>` elements. HTML attribute values are automatically escaped by the browser's DOM API, so injecting HTML through these attributes is not possible. When the popover (Phase 1C/3) reads these values, it must use `element.getAttribute()` (which returns unescaped text) rather than `innerHTML`. No current risk; note for future implementation.
- **Demo content is hardcoded:** No user input flows into `DEMO_CONTENT` or `DEMO_FLAGS`. No injection surface.
- **No API calls in this phase:** The mark extension and demo content are purely client-side. No network requests, no secrets, no auth.

---

## Overall Assessment

Phase 1B is a well-executed implementation that correctly establishes the mark extension and demo content foundation. The single critical finding (missing `inclusive: false`) is a straightforward fix that should be addressed before Phase 1C, when marks will be programmatically applied and users will interact with highlighted text. The demo content quality is high -- it reads like authentic internal engineering documentation and the flag explanations are genuinely helpful, modeling the kind of empathetic feedback the tool aims to provide.

The Phase 1A review suggestions S1 and S2 have been addressed: the editor now exposes its instance via `onEditorReady`, and the demo content uses proper HTML with `<p>` tags. The new conventions entries accurately document the patterns established.
