# IMPLEMENTATION-PLAN.md: Empathy Linter MVP

**Timebox:** 1 day
**Reference repo:** `/Users/personal/work-projects/pulp` (read-only — copy, don't modify)

---

## Dependency Graph

```text
Phase 0: Bootstrap
    ├──→ Phase 1: Editor Core ──────────┐
    └──→ Phase 2: AI Backend ───────────┤
                                        ↓
                                  Phase 3: Ambient Scanning Pipeline
                                        ↓
                                  Phase 4: Empathy Popovers
                                        ↓
                                  Phase 5: Demo Polish & Deploy
```

**Parallelizable:** Phases 1 and 2 have zero dependencies on each other. Build them simultaneously.

---

## Phase 0 — Project Bootstrap

> **Goal:** Runnable Next.js shell with all dependencies installed.
> **Depends on:** Nothing.
> **Estimated effort:** ~20 min.

- [x] **0.1** Initialize Next.js 16 project with App Router (manual setup — not `create-next-app`, see AD-001)
  - TypeScript, Tailwind CSS v4, App Router, `src/` directory: no (keep flat like Pulp)
- [x] **0.2** Install core dependencies:
  ```
  @tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/extension-placeholder
  ai @ai-sdk/anthropic zod
  ```
- [x] **0.3** Create project directory structure:
  ```
  app/
    api/lint/route.ts       ← AI route handler
    page.tsx                ← Single-page app
    layout.tsx
    globals.css
  components/
    editor.tsx              ← TipTap editor wrapper
    empathy-popover.tsx     ← Flag detail popover
  lib/
    empathy-extension.ts    ← Custom TipTap extension
    prompts.ts              ← System prompt + user prompt
    schemas.ts              ← Zod schemas
    config.ts               ← Constants (model, debounce timing, etc.)
    demo-content.ts         ← Pre-loaded demo paragraph
  ```
- [x] **0.4** Set up environment config: `.env.local` with `ANTHROPIC_API_KEY`
- [x] **0.5** Set up global CSS foundation — port Pulp's design token structure (CSS variables for colors, typography) and paper texture. Adapted color palette to teal/sage green (see AD-002).
  - Reference: `pulp/app/globals.css` (lines with `--bg`, `--text`, `--accent`, font-face declarations)
- [x] **0.6** Port font setup from Pulp (iA Writer Quattro + iA Writer Mono via `next/font/local`). Font files in `/fonts/` (woff2 only).
- [x] **0.7** Verify: `npm run dev` serves page at `localhost:3000`. `npm run build` passes clean.

---

## Phase 1 — Editor Core

> **Goal:** A styled TipTap editor on the page with pre-loaded demo content and a custom Mark extension that can render inline highlights.
> **Depends on:** Phase 0.
> **Can parallelize with:** Phase 2.
> **Estimated effort:** ~2 hrs.

### 1A. Basic Editor Component

- [x] **1.1** Create `components/editor.tsx` — a client component wrapping `useEditor` from TipTap.
  - Reference: `pulp/components/canvas.tsx` for the `useEditor` setup pattern.
  - Configure StarterKit (disable most block-level formatting — keep paragraphs and hard breaks only, similar to Pulp's stripped config).
  - Add Placeholder extension: `"Paste your documentation here, or start writing..."`.
  - Expose `onUpdate` callback that emits plain text content.
- [x] **1.2** Mount `<Editor />` in `app/page.tsx` inside a centered layout container. Basic page structure: header (title + tagline), editor area, footer.
- [x] **1.3** Style the editor area — generous padding, max-width container, readable line height. Reference Pulp's `.canvas` and `.tiptap` CSS.

### 1B. Custom Empathy Highlight Extension

> **Critical decision:** Pulp's `ProvocationExtension` is a **block-level atom node** — it inserts standalone blocks between paragraphs. The empathy linter needs **inline phrase-level highlights** that wrap existing text without modifying document content. These are fundamentally different.
>
> **Approach:** Use a TipTap **Mark** extension (not a Node). Marks wrap inline text ranges and render as styled `<span>` elements. This lets us highlight "exact_phrase" matches within the user's text while keeping the document editable.

- [x] **1.4** Create `lib/empathy-extension.ts` — a custom TipTap Mark extension:
  - Name: `empathyFlag`
  - Attributes: `id`, `reason`, `suggestion` (stored on the mark, used by popover on click)
  - `parseHTML`: `<span data-empathy-flag>`
  - `renderHTML`: renders a `<span>` with `data-empathy-flag` attribute, `class="empathy-highlight"`, and the attributes as `data-*` attrs
  - **No ReactNodeViewRenderer needed** — marks are simpler than nodes and just need CSS styling + click event handling
- [x] **1.5** Style `.empathy-highlight` — use Pulp's highlighter gradient technique:
  ```css
  .empathy-highlight {
    background-image: linear-gradient(
      to bottom, transparent 0%, transparent 12%,
      var(--accent-highlight) 12%, var(--accent-highlight) 88%,
      transparent 88%, transparent 100%
    );
    cursor: pointer;
    border-radius: 0.15em 0.4em 0.3em 0.2em;
    transition: opacity 0.2s ease;
  }
  ```
  - Reference: `pulp/app/globals.css` `.provocation-text` styles.
- [x] **1.6** Create `lib/demo-content.ts` — a hardcoded jargon-dense paragraph for the initial editor state. Draft 2-3 paragraphs of fake internal engineering documentation that is technically accurate but full of unexplained acronyms, assumed context, and insider jargon.

### 1C. Editor State Management

- [x] **1.7** Wire up `page.tsx` state: `flags` (array of empathy flag objects), `isAnalyzing` (boolean loading state), editor ref.
- [x] **1.8** Implement `applyFlags(editor, flags)` utility — given the editor instance and an array of `{ exact_phrase, reason, suggestion }` objects:
  1. Remove all existing `empathyFlag` marks from the document.
  2. For each flag, search the document's text content for `exact_phrase`.
  3. If found, apply the `empathyFlag` mark at the matched position range with `id`, `reason`, `suggestion` as mark attributes.
  - **Edge case:** If `exact_phrase` appears multiple times, flag only the first occurrence.
  - **Edge case:** If `exact_phrase` is not found (LLM hallucinated), skip silently.

---

## Phase 2 — AI Backend

> **Goal:** A working `/api/lint` endpoint that accepts text and streams back structured empathy flags.
> **Depends on:** Phase 0.
> **Can parallelize with:** Phase 1.
> **Estimated effort:** ~1.5 hrs.

### 2A. Schema & Prompts

- [x] **2.1** Create `lib/schemas.ts` — Zod schema for the LLM output:
  ```typescript
  const EmpathyFlagSchema = z.object({
    exact_phrase: z.string().describe("The exact phrase from the text that assumes reader knowledge"),
    reason: z.string().describe("Why this might confuse or alienate the target reader"),
    suggestion: z.string().describe("A concrete suggestion to make this more accessible"),
  });
  const LintResultSchema = z.object({
    flags: z.array(EmpathyFlagSchema).describe("Array of empathy flags found in the text"),
  });
  ```
- [x] **2.2** Create `lib/prompts.ts` — the system prompt for empathy analysis. This is the most important piece to get right. Key requirements:
  - Instruct Claude to act as a "reader advocate" scanning for assumed knowledge
  - Define what constitutes a flag: unexplained acronyms, internal jargon, assumed prerequisite knowledge, missing context, undefined technical terms
  - Define what is NOT a flag: standard industry terms (API, HTTP, JSON, CSS, etc.), terms that are defined elsewhere in the same text
  - Instruct Claude to return `exact_phrase` as a **verbatim substring** of the input (critical for text matching in step 1.8)
  - Keep suggestions constructive, not prescriptive — "Consider adding a brief definition" not "Change this to..."
  - Reference: `pulp/lib/prompts.ts` for prompt structure patterns
- [x] **2.3** Create `lib/config.ts`:
  ```typescript
  export const CLAUDE_MODEL = "claude-sonnet-4-6";
  export const DEBOUNCE_MS = 2000;
  export const MAX_TEXT_LENGTH = 5000;
  ```

### 2B. API Route

- [x] **2.4** Build `app/api/lint/route.ts`:
  - Accept POST with `{ text: string }`
  - Validate text length (reject > `MAX_TEXT_LENGTH` with 400)
  - Use `streamObject` from Vercel AI SDK with the Zod schema (this streams partial JSON as it's generated — the client gets flags incrementally)
  - Return the stream response
  - Reference: `pulp/app/api/pulp/route.ts` for the Anthropic provider setup pattern
  - **Decision:** Use `streamObject` (not `generateObject`) so flags appear on the client one at a time as Claude identifies them, creating a satisfying progressive-reveal effect.
- [x] **2.5** Add basic rate limiting — simple in-memory IP-based counter (no Redis needed for prototype). Limit to ~20 requests per IP per hour.
  - Alternatively, skip rate limiting entirely for the prototype and rely on the `ANTHROPIC_API_KEY` being private. Decide based on time.

### 2C. Prompt Tuning

- [x] **2.6** Create a golden test dataset: 5 jargon-heavy paragraphs sourced from real open-source docs (Kubernetes, AWS, React internals). Manually annotate what _should_ be flagged.
- [x] **2.7** Iterate on the system prompt by running the test paragraphs through `/api/lint` and comparing output to annotations. Tune until:
  - **Precision:** ≥80% of flags are genuinely useful (low false positive rate)
  - **Recall:** Catches obvious acronyms and assumed knowledge
  - **Exact match:** `exact_phrase` is always a verbatim substring of the input

---

## Phase 3 — Ambient Scanning Pipeline

> **Goal:** Typing in the editor triggers automatic AI analysis after a pause, and results appear as inline highlights.
> **Depends on:** Phase 1 AND Phase 2 (both must be complete).
> **Estimated effort:** ~1.5 hrs.

- [x] **3.1** Implement debounced analysis trigger in `page.tsx`:
  - On every `onUpdate` from the editor, reset a 2000ms timer.
  - When the timer fires, call `/api/lint` with the editor's plain text content.
  - Reference: `pulp/app/write/[id]/page.tsx` debounce pattern (but change 500ms → 2000ms).
  - **Guard:** Don't fire if text hasn't changed since last analysis. Store `lastAnalyzedText` ref.
  - **Guard:** Don't fire if a request is already in-flight. Use AbortController to cancel stale requests.
- [x] **3.2** Wire up `streamObject` client-side consumption:
  - Use the `useObject` hook from `ai/react`, or manually consume the stream with `fetch` + stream reader.
  - As each flag arrives from the stream, immediately call `applyFlags()` to add highlights.
  - **Progressive reveal:** Highlights appear one by one as the LLM identifies them, rather than all at once.
- [x] **3.3** Handle the "resolution" flow: when the user edits text under a highlight, the mark should be removed. TipTap marks are inherently tied to text ranges, so editing the marked text will naturally split/remove the mark. Verify this works correctly.
- [x] **3.4** Add loading indicator — a subtle status bar or pulsing dot that shows when analysis is in-flight. Should be non-disruptive (bottom corner or inline with editor chrome). Avoid a spinner over the editor.
- [x] **3.5** Edge case: if the user is still typing when results arrive, the document text may have changed since the request was sent. `applyFlags()` should gracefully handle mismatches (phrases not found due to edits → skip them).

---

## Phase 4 — Empathy Popovers

> **Goal:** Clicking a highlighted phrase opens a popover with the reason and suggestion.
> **Depends on:** Phase 3.
> **Estimated effort:** ~1.5 hrs.

- [ ] **4.1** Build `components/empathy-popover.tsx`:
  - Positioned popover anchored below/above the clicked highlight.
  - Content: reason (as a brief explanation paragraph) + suggestion (as an actionable callout).
  - Dismiss button (×) in corner.
  - Reference: `pulp/components/settings-popover.tsx` for click-outside and escape key handling patterns.
  - **Positioning:** Use `getBoundingClientRect()` on the clicked `<span>` to anchor the popover. Handle viewport edge cases (flip above if near bottom).
- [ ] **4.2** Wire click handler: add a click event listener to `.empathy-highlight` spans (use event delegation on the editor container). On click:
  1. Read `data-reason` and `data-suggestion` from the clicked element's attributes.
  2. Set popover state: `{ visible: true, anchor: DOMRect, reason, suggestion }`.
  3. Render `<EmpathyPopover />`.
- [ ] **4.3** Implement dismiss logic:
  - Click the × button.
  - Click outside the popover.
  - Press Escape.
  - Start typing in the editor (auto-dismiss so it doesn't block writing flow).
- [ ] **4.4** Style the popover:
  - Subtle shadow, rounded corners, matches the design system.
  - Entry animation (fade + slight scale, reference `pulp/app/globals.css` `.popover-enter`).
  - Clear visual hierarchy: reason in normal text, suggestion in a distinct callout style (e.g., light background box or italic).
- [ ] **4.5** Accessibility: `role="tooltip"` or `role="dialog"`, `aria-describedby`, focus management. Ensure keyboard navigability.

---

## Phase 5 — Demo Polish & Deploy

> **Goal:** The demo is delightful end-to-end. A hiring manager clicks the URL and instantly understands the product.
> **Depends on:** Phase 4.
> **Estimated effort:** ~1 hr.

### 5A. Demo Experience

- [ ] **5.1** Pre-run the linter on the demo content: on initial page load, immediately trigger analysis of the pre-loaded paragraph so highlights appear within seconds of page load (not after a 2-second debounce delay).
  - Option A: Fire the API call on mount with 0ms delay.
  - Option B: Cache the demo response and apply highlights instantly on load, then switch to live analysis when the user edits. **(Prefer B for zero-latency first impression.)**
- [ ] **5.2** Add a "Clear Editor" button in the editor toolbar/header. Clears content, removes all flags, resets state.
- [ ] **5.3** Add a "Try the demo text" / "Reset" button that re-inserts the demo content.

### 5B. Visual Polish

- [ ] **5.4** Page header: app name, one-line tagline ("Advocate for your reader"), minimal and typographically strong.
- [ ] **5.5** Subtle page-load animation — staggered fade-in of header → editor → highlights. Reference Pulp's `.hero-enter` and `.stagger-*` classes.
- [ ] **5.6** Responsive layout — ensure the editor looks good on laptop screens (primary use case). Tablet is nice-to-have. Mobile is out of scope.
- [ ] **5.7** Favicon and page title/meta tags.

### 5C. Deploy

- [ ] **5.8** Add `.env.local` to `.gitignore`. Create `.env.example` documenting required vars.
- [ ] **5.9** Deploy to Vercel. Verify the live URL works end-to-end.
- [ ] **5.10** Smoke test the full demo flow:
  1. Page loads → demo text visible → highlights appear.
  2. Click a highlight → popover with reason + suggestion.
  3. Edit the flagged text → highlight disappears.
  4. Clear editor → paste own text → new highlights appear after pause.

---

## Technical Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| `exact_phrase` from LLM doesn't match document text | Highlights fail to appear | Fuzzy substring matching fallback; prompt engineering to enforce verbatim extraction |
| Marks get corrupted on text edit near highlight boundaries | Editor state bugs | Test extensively; consider using ProseMirror Decorations (plugin-level) instead of Marks if instability occurs |
| `streamObject` partial JSON parsing issues | Client-side errors | Fall back to `generateObject` (non-streaming) if streaming proves unreliable |
| Debounce timing feels too slow or too fast | Poor UX | Make `DEBOUNCE_MS` configurable in `config.ts`; tune during polish phase |
| Claude returns too many/too few flags | Demo feels noisy or empty | Tune prompt to target 3-7 flags per ~200 words; add `max_flags` instruction in prompt |

---

## Reuse Map: What to Copy from Pulp

| Pulp Source | Empathy Linter Target | Adaptation Needed |
|---|---|---|
| `components/canvas.tsx` → `useEditor` setup | `components/editor.tsx` | Strip session/provocation logic, keep TipTap config |
| `app/globals.css` → design tokens, font-face, texture | `app/globals.css` | Adapt color palette, keep typography and texture |
| `lib/provocation-extension.ts` | `lib/empathy-extension.ts` | **Full rewrite** — change from block Node to inline Mark |
| `components/provocation-node.tsx` | Not used | Marks don't need ReactNodeViewRenderer |
| `components/settings-popover.tsx` → click-outside/escape pattern | `components/empathy-popover.tsx` | Repurpose dismiss logic, redesign content |
| `app/api/pulp/route.ts` → Anthropic provider setup | `app/api/lint/route.ts` | Change to `streamObject`, different schema |
| `lib/prompts.ts` → prompt structure | `lib/prompts.ts` | Completely different prompts, same structural pattern |
| `lib/config.ts` | `lib/config.ts` | Different constants |
| `app/write/[id]/page.tsx` → debounce pattern | `app/page.tsx` | Same pattern, different timing |
| `fonts/` → iA Writer Quattro, Mono | `fonts/` | Direct copy if reusing typefaces |
