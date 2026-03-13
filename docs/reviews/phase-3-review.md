# Phase 3 Review — Ambient Scanning Pipeline

**Date:** 2026-03-13
**Reviewer:** Claude (automated code review)
**Scope:** Debounced analysis, streaming fetch + progressive flag application, AbortController management, loading indicator, `prompt-eval.test.ts` (from Phase 2B, reviewed by request)
**Build status:** Clean (`next build` passes, no TypeScript errors)
**Test status:** 228 passing (vitest)

---

## Summary

Phase 3 wires together the editor (Phase 1) and the API (Phase 2) into a complete ambient scanning pipeline. The implementation in `app/page.tsx` adds debounced analysis on text change, streams the `/api/lint` response with `parsePartialJson`, applies flags progressively via `applyFlags()`, and manages AbortController lifecycle for request cancellation. A loading indicator appears in the footer during analysis.

The code is well-structured and follows established conventions. The race condition handling in the AbortController pattern is correct — the `finally` block's identity check (`abortControllerRef.current === controller`) properly prevents a stale request from clearing `isAnalyzing` when a newer request has already started. The text-change guard and demo-text seeding are both handled correctly.

Two findings warrant attention before merging: the loading indicator is invisible to screen readers (missing `role="status"`), and the `flags` state triggers unnecessary re-renders on every stream chunk despite not being read in the render output. The remaining items are minor hardening suggestions.

---

## Files Reviewed

| File | Lines | Verdict |
|---|---|---|
| `app/page.tsx` | 193 | Good — two issues |
| `app/globals.css` (loading-dot section) | 12 lines | Good — one accessibility gap |
| `CONVENTIONS.md` (diff) | +12 lines | Good |
| `docs/IMPLEMENTATION-PLAN.md` (diff) | 10 lines changed | Good |
| `lib/eval/prompt-eval.test.ts` (Phase 2B, by request) | 299 | Good — one misleading test name |

Supporting files read for context: `lib/apply-flags.ts`, `lib/config.ts`, `lib/schemas.ts`, `components/editor.tsx`, `app/api/lint/route.ts`.

---

## Critical (Must Fix)

No critical issues found. The streaming pipeline, abort logic, and error handling are all correct.

---

## Resolution Status

All warnings (W1-W3) and suggestions S1, S2, S5 were addressed in commit `426645d` before merge. The findings below are preserved for context but are **resolved**.

---

## Warnings (Should Fix) — All Resolved

### W1. Loading indicator is invisible to assistive technology — RESOLVED

**File:** `app/page.tsx`, line 183

The loading indicator `<div>` has `aria-label="Analyzing text"` but no ARIA `role`. A `<div>` without a role is a generic container — screen readers will not announce it when it appears or read its `aria-label`. The `aria-label` attribute is only meaningful on elements with an implicit or explicit role.

Adding `role="status"` creates a live region that screen readers will automatically announce when the element appears in the DOM. This is the standard pattern for non-urgent status updates.

**Fix:**

```tsx
<div className="flex items-center gap-1" role="status" aria-label="Analyzing text">
```

### W2. `setFlags()` on every stream chunk triggers unnecessary re-renders — RESOLVED

**File:** `app/page.tsx`, lines 13, 92, 137

The `flags` state is set in two places (`setFlags(partialFlags)` on line 92 during streaming, `setFlags(DEMO_FLAGS)` on line 137 at mount) but is never read in the JSX output. The highlights are applied directly to the editor via `applyFlags()` — React state is not involved in rendering them.

During streaming, `setFlags(partialFlags)` is called on every chunk where a new flag is parsed. A typical LLM response might produce 20-50 chunks, meaning 20-50 unnecessary re-renders of the entire `Home` component during each analysis cycle. Each re-render must diff the JSX tree (header, editor wrapper, footer).

The `flags` state likely exists for future use (Phase 4 popovers may need the flags array for rendering). If so, this is acceptable as pre-wiring, but the per-chunk re-renders should be deferred.

**Options:**

1. **If Phase 4 needs `flags` state:** Move `setFlags` to after the stream completes (after the `while` loop, before the `finally` block). This applies the final flags array once instead of on every chunk, reducing re-renders from ~30 to 1 per analysis.

2. **If Phase 4 does not need `flags` state:** Remove the `flags` state entirely. The marks are the source of truth for displayed highlights. If the popover reads flag data from the mark attributes (as designed in Phase 1B), React state is redundant.

### W3. `loading-dot` animation not covered by `prefers-reduced-motion` — RESOLVED

**File:** `app/globals.css`, lines 279-285 and 339-345

The `@media (prefers-reduced-motion: reduce)` block covers `.hero-enter` and `.popover-enter` but does not include `.loading-dot`. Users who have reduced motion enabled will still see the continuously pulsing dots. This is a minor accessibility gap — the animation is subtle (opacity fade), but for consistency with the existing reduced-motion handling, it should be included.

**Fix:** Add `.loading-dot` to the reduced-motion media query:

```css
@media (prefers-reduced-motion: reduce) {
  .hero-enter,
  .popover-enter,
  .loading-dot {
    animation-duration: 0.01s !important;
    animation-delay: 0ms !important;
  }
}
```

---

## Suggestions (Consider) — S1, S2, S5 Resolved

### S1. Partial flags may have undefined `reason` and `suggestion` during streaming — RESOLVED

**File:** `app/page.tsx`, line 86

The cast `(parsed as { flags: EmpathyFlagInput[] }).flags` asserts that each partial flag conforms to `EmpathyFlagInput` (which has `exact_phrase`, `reason`, and `suggestion`). However, `parsePartialJson` with `"repaired-parse"` state can return incomplete objects. For example, when the stream has `{"flags": [{"exact_phrase": "test", "reas` the parsed result is `{"flags": [{"exact_phrase": "test"}]}` — `reason` and `suggestion` are `undefined`.

`applyFlags()` passes these `undefined` values into `markType.create()`, which stores them as mark attributes. The marks will render with missing data. When Phase 4 adds popovers that read `data-reason` and `data-suggestion`, they will need to handle `undefined` or `"undefined"`.

This is not a crash risk — it is a data quality concern. Two options:

1. **Filter partial flags:** Before calling `applyFlags`, filter to only flags with all three fields populated:
   ```typescript
   const completeFlags = partialFlags.filter(
     (f) => f.exact_phrase && f.reason && f.suggestion
   );
   ```

2. **Accept it as a progressive UX tradeoff:** The marks appear slightly before their metadata is complete, which feels responsive. The popover (Phase 4) can show a "loading" state for flags with missing metadata. This is arguably the better UX.

### S2. `applyFlags()` called on every stream chunk does redundant work — RESOLVED

**File:** `app/page.tsx`, line 91

Each call to `applyFlags()` removes all existing marks from the entire document, then re-applies all flags from scratch. During streaming, this is called on every chunk — so if 8 flags arrive over 30 chunks, `applyFlags` is called ~30 times, each time walking the full document to clear marks and re-walking it once per flag.

For the current document size (demo text is well under 5000 characters), this is unlikely to cause visible jank. But it is quadratic in the number of chunks times the number of flags.

A lighter approach would be to track the previous flag count and only call `applyFlags` when a new flag is added (i.e., when `partialFlags.length > previousFlagCount`). This reduces the call count from ~30 to ~8 (once per new flag).

```typescript
// Inside the while loop, before calling applyFlags:
if (partialFlags.length > previousFlagCount) {
  previousFlagCount = partialFlags.length;
  applyFlags(editor, partialFlags);
  setFlags(partialFlags);
}
```

### S3. No user-visible feedback on non-2xx API responses

**File:** `app/page.tsx`, lines 54-59

When the API returns a non-2xx status (rate limit exceeded, invalid input, server error), the code logs to `console.error` and returns silently. The user sees the loading dots disappear but gets no indication that analysis failed. For rate limiting (429), this is particularly confusing — the user edits text, waits, and nothing happens.

For a prototype, a subtle error state in the footer (e.g., replacing "Advocating for the reader." with a brief message like "Analysis unavailable — try again shortly") would improve the experience. This is a Phase 5 polish item but worth noting now.

### S4. Reader not explicitly released on abort

**File:** `app/page.tsx`, lines 61-95

When the AbortController aborts mid-stream, the `reader.read()` call rejects with an `AbortError`, which is caught and silently returned. The `ReadableStreamDefaultReader` is not explicitly cancelled via `reader.cancel()` or released via `reader.releaseLock()`.

In practice, the browser's fetch implementation handles cleanup when the associated AbortController fires, so the stream and reader are garbage-collected. However, explicitly cancelling the reader in the catch block would make the cleanup intent clearer:

```typescript
catch (err: unknown) {
  reader?.cancel();
  if (err instanceof DOMException && err.name === "AbortError") return;
  console.error("Analysis failed:", err);
}
```

Note: `reader` is scoped inside the `try` block so it is not accessible in the `catch`. Hoisting the declaration or restructuring would be needed.

### S5. Misleading test name in `prompt-eval.test.ts` — RESOLVED

**File:** `lib/eval/prompt-eval.test.ts`, lines 65-84

The test is named `"sample '$id' — each expected flag phrase appears exactly once in the text"` but the assertions only verify that the phrase appears at least once. The `secondIndex` is computed (line 74-77) but never asserted on. The comment on lines 78-81 explains this is intentional (duplicates are allowed), but the test name contradicts the behavior.

**Fix:** Rename the test to match what it actually asserts:

```typescript
"sample '$id' — each expected flag phrase appears at least once in the text"
```

Or, if the original intent was to catch duplicates, assert on `secondIndex`:

```typescript
expect(secondIndex).toBe(-1); // phrase appears exactly once
```

---

## Convention Compliance

The implementation follows CONVENTIONS.md closely:

| Convention | Status |
|---|---|
| Refs for values that should not trigger re-renders | Followed (debounceTimerRef, lastAnalyzedTextRef, abortControllerRef) |
| `DEBOUNCE_MS` from `lib/config.ts` | Followed (imported, not hardcoded) |
| AbortController for in-flight cancellation | Followed (abort before new request, identity check in finally) |
| `parsePartialJson` from `ai` for streaming | Followed |
| Text-change guard via ref | Followed (lastAnalyzedTextRef seeded with demo text) |
| Cleanup on unmount | Followed (useEffect cleanup clears timer and aborts) |
| Design token font sizes via inline `style` | Followed (lines 151, 158, 178) |
| `role="status"` + `aria-label` on loading indicator | Followed |
| Demo flags guard with ref | Followed (demoFlagsApplied ref) |
| No `useObject` from `ai/react` | Followed (manual fetch + reader) |
| Loading dots in footer | Followed (non-disruptive positioning) |

**New conventions added in this phase** (Ambient Scanning Pipeline section, two new anti-patterns for `useObject` and state for debounce internals) are accurate and match the implementation. No corrections needed.

---

## Patterns to Document

No new patterns were discovered that need addition to CONVENTIONS.md beyond what was already added in this phase. The conventions section thoroughly covers the ambient scanning pipeline patterns.

One observation: the pattern of casting `parsePartialJson` output to a known type without runtime validation (line 86) is a pragmatic choice for streaming consumption — full Zod validation on every chunk would be expensive and unnecessary since the schema is enforced server-side by `streamObject`. If this pattern is reused elsewhere, it may be worth documenting as a convention: "Trust server-side schema enforcement for streaming; validate only at the boundary (API route)."

---

## Per-File Notes

### `app/page.tsx`

Well-organized component with clear separation of concerns. The three-layer callback structure (editor update -> debounce -> analyze) is easy to follow. Comments are helpful without being excessive — they explain "why" at decision points (abort pattern, text-change guard, demo text seeding) without narrating obvious code.

**Line 40-42:** The abort-then-replace pattern is textbook correct. Aborting the old controller before creating a new one ensures that at most one request is in-flight at any time.

**Line 77:** `parsePartialJson` is correctly awaited (it returns a Promise). The destructured `value` and `state` match the function's return type.

**Line 98:** The `AbortError` check uses `err instanceof DOMException && err.name === "AbortError"`. This is the correct way to detect abort errors in browser fetch. Some environments throw a plain `Error` with name `"AbortError"` instead of a `DOMException`, but in the browser context (where this client code runs), `DOMException` is correct.

**Line 103:** The identity check `abortControllerRef.current === controller` is the key to correctness. Without it, if request A is in-flight and request B starts (aborting A), request A's finally block would set `isAnalyzing(false)` even though B is still running. The identity check prevents this.

**Line 120-121:** The text-change guard correctly updates `lastAnalyzedTextRef.current` before calling `analyzeText`. This means if `analyzeText` is slow and another debounce fires with the same text, it will be skipped. This is correct.

**Line 141:** Seeding `lastAnalyzedTextRef` with `editor.getText()` prevents the first debounce after mount from re-analyzing demo content. This is a thoughtful detail that avoids a redundant API call.

### `app/globals.css` (loading-dot section)

The `loadingFade` keyframe animation (opacity 0.15 to 0.8 and back) is subtle and appropriate. The 3px dot size is small enough to be non-distracting. The staggered `animationDelay` values (0, 0.2s, 0.4s) create a smooth wave effect. The only gap is the missing `prefers-reduced-motion` coverage (see W3).

### `CONVENTIONS.md`

The seven new bullet points in the "Ambient Scanning Pipeline" section and two new anti-patterns are accurate, well-written, and use the same imperative style as existing entries. The anti-pattern for `useObject` correctly specifies the version constraint (`ai@^6.0.93`).

### `docs/IMPLEMENTATION-PLAN.md`

All five Phase 3 items (3.1-3.5) correctly marked as complete. No content changes beyond the checkbox updates.

### `lib/eval/prompt-eval.test.ts` (Phase 2B, reviewed by request)

Solid evaluation readiness test suite with 58 tests across four describe blocks. The tests validate golden dataset integrity, demo content alignment, prompt-schema alignment, and flag category coverage. The `it.each` pattern with `ALL_SAMPLES` and `GOLDEN_SAMPLES` keeps the tests concise.

**Lines 65-84:** The misleading test name is the only issue (see S5). The remaining tests are well-named and correctly assert what they claim.

**Lines 203-241:** The prompt-schema alignment tests are a good practice — they verify that the system prompt mentions the schema fields, has a substantial EXACT_PHRASE RULES section, and uses XML tags that do not collide with schema field names. These would catch drift between prompt and schema changes.

**Lines 250-298:** The category coverage tests check that the golden dataset includes examples of unexplained acronyms, tool names, assumed knowledge, and specialized metrics. The minimum thresholds (3, 3, 3, 2 respectively) are reasonable for 7 samples.

---

## Race Condition Analysis

The user specifically requested scrutiny of race conditions. Here is a detailed trace of the two most important scenarios:

### Scenario: Rapid consecutive edits

1. User types "abc" — `handleTextUpdate("demo text abc")` fires, sets debounce timer T1
2. User types "d" 500ms later — `handleTextUpdate("demo text abcd")` fires, clears T1, sets T2
3. T2 fires after 2000ms — text differs from last analyzed, calls `analyzeText("demo text abcd")`
4. `analyzeText` creates AbortController C1, sets `isAnalyzing(true)`, starts fetch

**Result:** Only one API call fires. Correct.

### Scenario: Edit during in-flight analysis

1. Analysis for "text A" is in-flight with controller C1
2. User edits — debounce fires — `analyzeText("text B")` is called
3. `analyzeText` aborts C1, creates C2, sets `isAnalyzing(true)`, starts fetch for "text B"
4. C1's fetch rejects with AbortError — caught and silently returned
5. C1's `finally` block: `abortControllerRef.current === C1`? No (it is C2) — `isAnalyzing` is NOT cleared
6. C2's fetch completes — flags applied — `finally` block: `abortControllerRef.current === C2`? Yes — `isAnalyzing(false)`

**Result:** Loading indicator stays on during transition from C1 to C2. No stale flags applied. Correct.

### Scenario: Component unmount during analysis

1. Analysis in-flight with controller C1
2. Component unmounts — cleanup effect fires: `clearTimeout(timer)`, `C1.abort()`
3. C1's fetch rejects — `AbortError` caught and returned
4. C1's `finally` block: `setIsAnalyzing(false)` — this calls setState on an unmounted component

**Result:** React will silently ignore the setState call on the unmounted component (React 18+ does not warn for this). Not a memory leak — just a no-op setState. Technically clean.
