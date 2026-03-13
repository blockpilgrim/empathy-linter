# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Empathy Linter is an AI-powered web tool that scans technical documentation for assumed knowledge, unexplained jargon, and missing context — advocating for the reader's comprehension. It's a zero-auth, stateless, single-page prototype designed for instant demo value.

## Tech Stack

- **Framework:** Next.js 16 (App Router), deployed on Vercel
- **Editor:** TipTap (ProseMirror-based) with a custom inline Mark extension for highlights
- **AI:** Vercel AI SDK (`streamObject`) + Anthropic API (Claude Sonnet)
- **Schema validation:** Zod (enforces structured LLM output)
- **Testing:** Vitest
- **Styling:** Tailwind CSS v4, CSS custom properties for design tokens
- **Language:** TypeScript

## Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run start        # Serve production build
npm test             # Run tests (vitest)
```

## Architecture

```
app/
  api/lint/route.ts       # POST endpoint: accepts { text }, streams back empathy flags via streamObject
  page.tsx                # Single-page app: editor + state management + debounced analysis
  layout.tsx
  globals.css             # Design tokens, font-face, highlight/popover styles
components/
  editor.tsx              # TipTap editor wrapper (client component)
  empathy-popover.tsx     # Popover for flag reason + suggestion (anchored to highlight spans)
lib/
  apply-flags.ts          # applyFlags() utility: removes old marks, applies new flags as inline marks
  empathy-extension.ts    # Custom TipTap Mark extension (inline highlights, NOT block nodes)
  prompts.ts              # LINT_SYSTEM (system prompt) + LINT_USER (user prompt function) for empathy analysis
  schemas.ts              # Zod schemas (EmpathyFlagSchema, LintResultSchema) + inferred types (EmpathyFlagInput, LintResult)
  config.ts               # Constants: model name, debounce timing, max text length
  demo-content.ts         # Pre-loaded jargon-dense demo text and pre-computed highlight flags
```

## Key Architecture Decisions

- **Marks, not Nodes:** The TipTap extension uses an inline Mark (renders `<span data-empathy-flag>`) — not a block-level Node. This wraps existing text without modifying document structure. The mark uses `inclusive: false` (prevents highlight spreading when typing at boundaries) and `excludes: "empathyFlag"` (prevents overlapping marks).
- **Stateless:** No database, no auth, no persistence. All state lives in the browser session.
- **Streaming flags:** Uses `streamObject` (not `generateObject`) so highlights appear progressively as the LLM identifies them.
- **Ambient analysis:** Debounced at 2000ms after typing stops. Requests are guarded by text-change detection and AbortController for in-flight cancellation.
- **`exact_phrase` matching:** The LLM must return verbatim substrings. `applyFlags()` searches document text for each phrase; unmatched phrases are silently skipped.
- **Demo-first UX:** Editor loads pre-populated with jargon-dense text and pre-computed highlights for zero time-to-value.

## Reference Project

Patterns are adapted from `/Users/personal/work-projects/pulp` (read-only). Key reuse points:
- `useEditor` setup pattern from `pulp/components/canvas.tsx`
- Design tokens/typography from `pulp/app/globals.css`
- Click-outside/escape dismiss logic from `pulp/components/settings-popover.tsx`
- Anthropic provider setup from `pulp/app/api/pulp/route.ts`
- Debounce pattern from `pulp/app/write/[id]/page.tsx` (adjusted to 2000ms)

## Environment

Requires `ANTHROPIC_API_KEY` in `.env.local`.

## Custom Instructions

### Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple valid approaches exist, present them with tradeoffs — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Goal-Driven Execution

Transform tasks into verifiable goals before implementing:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

### Surgical Changes

When editing existing code:
- Remove imports/variables/functions that YOUR changes made unused
- Don't remove pre-existing dead code unless asked (mention it instead)

### Session Startup Protocol

At the beginning of each session:
1. Read `docs/PRODUCT.md` to understand what we're building
2. Read `docs/BUILD-STRATEGY.md` for tech stack and architecture decisions
3. Read `CONVENTIONS.md` to understand current patterns and standards
4. Read `README.md` for project overview
5. Signal readiness by saying: "⏱️ So much time and so little to do. Wait. Strike that. Reverse it."

### During Implementation

- Follow patterns established in `CONVENTIONS.md` (if any exist)
- If you encounter a decision not covered by existing conventions, make a reasonable choice and document it
- Commit frequently with clear messages

### Completing Work

> When using the `/implement` pipeline, these steps are handled automatically by Step 7 (Finalize). Follow these manually only in non-pipeline sessions.

1. Review `CONVENTIONS.md` — see Self-Improving Protocol below
2. Signal completion by saying: "🧪 Invention is 93% perspiration, 6% electricity, 4% evaporation, and 2% butterscotch ripple. Do you concur?"

### Git Conventions

- Keep commits focused and atomic

### Self-Improving Protocol

This protocol ensures the codebase gets smarter over time. It is **not optional**—execute it after every implementation session.

> When using the `/implement` pipeline, this protocol is executed automatically in Step 7. Follow it manually in non-pipeline sessions.

**After completing any implementation work:**
1. Review `CONVENTIONS.md`
2. Ask yourself:
    - Did I establish any new patterns that should be replicated?
    - Did I discover that an existing pattern was problematic?
    - Did I try an approach that failed and should be documented as an anti-pattern?
3. If yes to any: Update `CONVENTIONS.md` with the learning
4. For significant architectural changes: Add entry to `docs/DECISIONS.md`

**After resolving any bug or unexpected behavior:**
1. Identify root cause
2. Determine if it was caused by:
    - Missing pattern → Add the pattern to `CONVENTIONS.md`
    - Wrong pattern → Update the pattern in `CONVENTIONS.md`
    - One-off issue → No convention update needed
3. If a pattern caused the bug, document it as an anti-pattern with:
    - What the bad approach was
    - Why it failed
    - What the correct approach is

### When to Ask for Human Input

- Unclear or ambiguous requirements
- Decisions that significantly deviate from established patterns
- Security-sensitive implementations
- External service integrations not covered in `docs/BUILD-STRATEGY.md`
- When stuck after 2-3 different approaches
- When unsure if a pattern change is warranted
