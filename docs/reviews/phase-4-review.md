# Phase 4 Review — Empathy Popovers

**Date:** 2026-03-14
**Reviewer:** Claude (automated code review)
**Scope:** Popover component (`components/empathy-popover.tsx`), popover state management and event delegation (`app/page.tsx`), popover conventions (`CONVENTIONS.md`)
**Build status:** Clean (`next build` passes, no TypeScript errors)
**Test status:** 228 passing (vitest)

---

## Summary

Phase 4 adds a popover that appears when users click highlighted empathy flags, showing why the phrase was flagged and a suggestion for improvement. The implementation is split correctly: state management and event delegation live in `page.tsx`, and `EmpathyPopover` is a presentational component that receives `reason`, `suggestion`, `anchor` (DOMRect), and `onClose` as props.

The overall architecture is sound. The event delegation pattern using `.closest(".empathy-highlight")` on a stable wrapper element is the right approach for dynamically created TipTap marks. The measure-then-position strategy (render hidden, compute layout, make visible) avoids flash-of-mispositioned content. Click-outside (`mousedown`), Escape, and auto-dismiss-on-typing all follow the Pulp reference patterns.

Three issues warrant attention: (1) the `anchor` DOMRect is a snapshot captured at click time, so the popover drifts from its highlight on scroll despite having a scroll listener; (2) the popover is not dismissed when analysis re-runs and marks are replaced, leaving it anchored to a now-destroyed DOM element; (3) the `onClose` prop creates a new function on every render, causing the dismiss event listeners to be torn down and re-attached unnecessarily. The remaining items are minor suggestions.

---

## Files Reviewed

| File | Lines Changed | Verdict |
|---|---|---|
| `components/empathy-popover.tsx` | +156 (new implementation) | Good — two issues, one suggestion |
| `app/page.tsx` | +47 (additions to existing file) | Good — one issue |
| `CONVENTIONS.md` (diff) | +15 lines | Good — accurate |

Supporting files read for context: `lib/empathy-extension.ts`, `lib/apply-flags.ts`, `app/globals.css`.

---

## Critical (Must Fix)

### C1. Stale anchor DOMRect causes popover to drift on scroll

**File:** `components/empathy-popover.tsx`, lines 25-51, 59-66
**File:** `app/page.tsx`, lines 57-58

The `anchor` prop is a `DOMRect` snapshot captured at click time via `target.getBoundingClientRect()`. The `computePosition` callback (which depends on `anchor` via `useCallback`) is registered as a scroll event listener. However, when the user scrolls, `computePosition` re-runs using the same stale `DOMRect` — the highlight span may have moved to a different viewport position, but `anchor.bottom`, `anchor.top`, and `anchor.left` still reflect the pre-scroll coordinates.

The result: after scrolling, the popover repositions itself using outdated coordinates. Since the popover is `position: fixed` but the anchor element scrolls with the document, the popover will appear to float in place while its highlight scrolls away (or vice versa).

**Two approaches to fix:**

1. **Store the DOM element, not the DOMRect.** Pass the `HTMLElement` reference as the anchor, and call `getBoundingClientRect()` fresh inside `computePosition` on every resize/scroll event. This requires changing `PopoverState` to store an `HTMLElement` and updating the prop type.

2. **Dismiss on scroll.** If repositioning is not worth the complexity, dismiss the popover when the user scrolls. This is arguably better UX for a prototype — the popover is ephemeral and the user can re-click the highlight. Replace the scroll listener with:
   ```typescript
   window.addEventListener("scroll", onClose, true);
   ```

---

## Warnings (Should Fix)

### W1. Popover not dismissed when analysis re-runs and marks are replaced

**File:** `app/page.tsx`, lines 126-133 (streaming apply) and lines 183-184 (demo apply)

When the ambient scanning pipeline re-runs (after a debounce fires), `applyFlags()` removes all existing `empathyFlag` marks and applies new ones. If the popover is open at this point, the DOM span it was anchored to is destroyed and replaced by a new span (potentially at the same position, but a different DOM element with a new `data-id`). The popover remains visible, floating over content that may no longer correspond to it.

The `handleTextUpdate` callback correctly dismisses the popover when the user types (line 162), but if the re-analysis is triggered by the debounce timer without further typing (e.g., user types, stops, popover is still open when the 2-second debounce fires), the popover stays open while marks are swapped underneath it.

**Fix:** Clear the popover state when `applyFlags` is called during streaming:

```typescript
// Inside the streaming while loop, before calling applyFlags:
if (editor && completeFlags.length > previousFlagCount) {
  previousFlagCount = completeFlags.length;
  latestFlags = completeFlags;
  setPopover(null); // Dismiss stale popover
  applyFlags(editor, completeFlags);
}
```

### W2. `onClose` prop is a new function reference on every render

**File:** `app/page.tsx`, line 227
**File:** `components/empathy-popover.tsx`, lines 69-84

The `onClose` prop is defined inline as `() => setPopover(null)`. This creates a new function reference on every render of the `Home` component. In `EmpathyPopover`, the click-outside and Escape listeners are registered in a `useEffect` with `[onClose]` as a dependency (line 84). Each time the parent re-renders (e.g., `isAnalyzing` state changes, `flags` state changes), the `onClose` reference changes, causing the effect to tear down and re-register the `mousedown` and `keydown` listeners on `document`.

This is not a functional bug — the behavior is correct — but it causes unnecessary listener churn. During streaming analysis, `isAnalyzing` toggles and `flags` updates, causing multiple re-renders while the popover could be open.

**Fix:** Either memoize the `onClose` callback in `page.tsx`:

```typescript
const closePopover = useCallback(() => setPopover(null), []);
// ...
<EmpathyPopover onClose={closePopover} ... />
```

Or store `onClose` in a ref inside `EmpathyPopover` to decouple the listener lifecycle from prop identity:

```typescript
const onCloseRef = useRef(onClose);
onCloseRef.current = onClose;

useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      onCloseRef.current();
    }
  };
  // ...
}, []); // No dependency on onClose
```

The first approach (memoize in parent) is simpler and consistent with the project's existing pattern of keeping state management in `page.tsx`.

---

## Suggestions (Consider)

### S1. Animation direction does not account for flipped position

**File:** `components/empathy-popover.tsx`, line 91
**File:** `app/globals.css`, lines 304-311

The `popover-enter` animation always slides down (`translateY(-4px)` to `translateY(0)`), which feels natural when the popover appears below the highlight. But when the popover flips above the highlight (the `flipped` state on line 40), the animation still slides down — it should slide up (`translateY(4px)` to `translateY(0)`) for visual coherence.

The `flipped` state is already tracked in position state (line 23) but not used in the render output. Consider adding a conditional class:

```tsx
className={`${position.flipped ? "popover-enter-flipped" : "popover-enter"} fixed z-50 ...`}
```

With a corresponding CSS animation that reverses the Y direction. This is a polish detail and not functionally broken.

### S2. Visibility sentinel uses `(0, 0)` which could be a valid position

**File:** `components/empathy-popover.tsx`, line 96

The visibility toggle checks `position.top === 0 && position.left === 0` to determine whether the position has been computed yet. The initial state is `{ top: 0, left: 0, flipped: false }`, so on first render the popover is hidden. After `computePosition` runs, it becomes visible.

This works in practice because an anchor at the exact top-left corner of the viewport (`top: 0, left: 0`) is unlikely for a highlight inside an editor with padding and margins. However, it is a fragile sentinel. A more robust approach would use a separate `measured` boolean:

```typescript
const [measured, setMeasured] = useState(false);
// In computePosition:
setPosition({ top, left, flipped });
setMeasured(true);
// In JSX:
visibility: measured ? "visible" : "hidden"
```

This is minor — the current approach works for this layout — but would be more resilient if the component were reused in different contexts.

### S3. No focus management on popover open

**File:** `components/empathy-popover.tsx`

The popover has `role="dialog"` and an `aria-label`, which is good. However, focus is not moved to the popover when it opens, and focus is not returned to the editor when it closes. A user navigating with a keyboard can press Escape to dismiss (line 76), but tab-navigable elements inside the popover (the dismiss button) are not reachable without explicit focus management.

For a prototype, this is acceptable. For production accessibility, consider:
- Moving focus to the dismiss button when the popover opens (via `useEffect` with `ref`)
- Returning focus to the previously focused element on close
- Optionally implementing a focus trap (though for a simple popover with one button, this may be overkill)

### S4. Highlight cursor affordance not connected to popover behavior

**File:** `app/globals.css`, line 171

The `.empathy-highlight` class has `cursor: pointer`, which correctly signals clickability. When the popover is already open for a given highlight and the user clicks the same highlight again, a new popover is opened at the same position (since `setPopover` is called with a fresh DOMRect). This is fine — the popover re-renders in place. But if the intent is to toggle (click to open, click again to close), the current implementation does not support that.

This is a UX consideration, not a bug. Toggle behavior would require comparing the clicked element against the currently anchored element, which requires storing the element reference (overlapping with the fix for C1).

---

## Convention Compliance

The implementation follows CONVENTIONS.md closely:

| Convention | Status |
|---|---|
| Popover component is presentational (state in page.tsx) | Followed |
| Fixed positioning with `getBoundingClientRect()` | Followed |
| Measure-then-position pattern | Followed |
| Viewport edge handling (flip + clamp) | Followed |
| Recompute on resize/scroll | Followed (but see C1 for stale anchor) |
| Click-outside uses `mousedown` | Followed |
| Event delegation for mark clicks | Followed |
| Read flag metadata from DOM `data-*` attributes | Followed |
| Auto-dismiss on typing | Followed |
| Popover rendered outside editor wrapper | Followed |
| Design token font sizes via inline `style` | Followed (lines 127, 133, 145, 151) |
| `.popover-enter` animation class | Followed |
| `.icon-btn` for dismiss button | Followed |
| `role="dialog"` + `aria-label` | Followed |

**New conventions added** (Popovers section + two anti-patterns) are accurate and match the implementation.

---

## Patterns to Document

No new patterns need to be added to CONVENTIONS.md beyond what Phase 4 already added. The existing popover conventions section is thorough.

One observation worth noting if the project grows: the pattern of capturing a DOMRect snapshot as a prop (rather than a DOM element reference) works for static anchors but breaks down when the anchor can move (scroll, layout shifts). If additional anchored UI is added in future phases, consider documenting a convention about whether to pass element references or rect snapshots, and under what circumstances each is appropriate.

---

## Race Condition Analysis

### Scenario: Click highlight, then type immediately

1. User clicks a highlight — `handleClick` fires (via event delegation), captures `DOMRect`, calls `setPopover({ anchor, reason, suggestion })`
2. User starts typing — `handleTextUpdate` fires, calls `setPopover(null)` (line 162)
3. Popover disappears

**Result:** Correct. Auto-dismiss works as intended.

### Scenario: Click highlight, mousedown-outside fires

1. User clicks a highlight — `click` event fires on the wrapper, `setPopover(...)` is called
2. User clicks outside — `mousedown` fires first (before `click`), `handleClickOutside` calls `onClose()` which calls `setPopover(null)`
3. If the outside click happens to land on another highlight, the `click` event fires next, `handleClick` runs, `setPopover(...)` is called again with new data

**Result:** Correct. The `mousedown` on document fires before the `click` on the wrapper, so the old popover is dismissed before the new one opens. No flash of two popovers.

### Scenario: Click highlight while analysis is streaming

1. Popover is open for highlight A
2. Streaming analysis completes, `applyFlags()` removes all marks and re-applies them
3. Highlight A's DOM span is destroyed and replaced by a new span
4. Popover remains visible with stale anchor coordinates

**Result:** The popover is orphaned — see W1. It displays correct reason/suggestion text (those are stored in React state, not read from the DOM after click), but the anchor is now pointing at a destroyed element's former position.

### Scenario: Click highlight, then resize window

1. Popover is open, anchored to DOMRect captured at click time
2. User resizes window — `computePosition` fires via resize listener
3. `computePosition` uses the stale `anchor` DOMRect — the highlight may have reflowed to a new position
4. Popover repositions based on stale coordinates

**Result:** Popover may be mispositioned after resize — see C1. The severity depends on how much the layout shifts; for a `max-w-2xl` centered layout the horizontal position is stable on most resizes, but vertical position can shift if the text reflows.
