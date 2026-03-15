# Empathy Linter

An AI-powered writing tool that scans technical documentation for assumed knowledge, unexplained jargon, and missing context — advocating for the reader's comprehension.

## What It Does

Engineers suffer from the curse of knowledge. They write docs full of acronyms, internal jargon, and assumed prerequisites that make perfect sense to them and no sense to anyone else. Traditional tools catch spelling and grammar — but they don't catch empathy gaps.

Empathy Linter fills that gap. Paste technical writing into the editor, and it quietly analyzes the text in the background, highlighting phrases that might confuse readers outside your immediate team. Click a highlight to see *why* it was flagged and get a constructive suggestion for making it more accessible. Fix the text, and the highlight disappears.

The tool ships with four pre-loaded demo texts — DevOps, Product Strategy, Design/UX, and Frontend — each dense with discipline-specific jargon. The first loads automatically so the value is visible the moment the page loads, and a "Try another example" button cycles through the rest. No signup, no configuration.

## Tech Stack

- **Next.js 16** (App Router) — single-page app, server-side streaming API route
- **TipTap / ProseMirror** — rich text editor with a custom inline `Mark` extension for highlights (not block nodes — wraps existing text without altering document structure)
- **Claude Sonnet 4.6** via Vercel AI SDK (`streamObject`) — structured streaming output with a Zod schema, so highlights appear progressively as the LLM identifies them
- **Zod** — enforces structured LLM output and derives TypeScript types from a single schema definition
- **Tailwind CSS v4** — design tokens as CSS custom properties, bridged to Tailwind via `@theme`

## Architecture

```
app/
  api/lint/route.ts        → POST endpoint: streams empathy flags via streamObject
  page.tsx                 → Editor + state management + debounced analysis pipeline
components/
  editor.tsx               → TipTap editor wrapper
  empathy-popover.tsx      → Popover anchored to highlight spans
lib/
  empathy-extension.ts     → Custom TipTap Mark (inline highlights with data-* attributes)
  apply-flags.ts           → Maps LLM output phrases to ProseMirror document positions
  prompts.ts               → System + user prompts calibrated for 3-7 flags per ~200 words
  schemas.ts               → Zod schemas for structured LLM output
  rate-limit.ts            → In-memory IP-based rate limiter
  demo-content.ts          → Four cycling demo texts (Infra, Product, Design, Frontend) with pre-computed highlights
```

Key design decisions:

- **Streaming, not batch.** `streamObject` sends partial JSON as the LLM generates it. The client accumulates chunks, parses partial objects with `parsePartialJson`, and applies highlights incrementally — so flags appear one by one instead of all at once.
- **Exact phrase matching.** The LLM returns verbatim substrings. `applyFlags()` builds a text-to-position mapping with a single document walk, then locates each phrase and applies marks in one ProseMirror transaction.
- **Ambient analysis.** Debounced at 2s after typing stops. Requests are guarded by text-change detection and `AbortController` for in-flight cancellation — no manual "scan" button.
- **Stateless.** No database, no auth, no persistence. All state lives in the browser session.

## Getting Started

```bash
npm install
cp .env.example .env.local   # Add your ANTHROPIC_API_KEY
npm run dev                   # http://localhost:3000
npm test                      # Run tests
```

## Status

Working prototype. Built as an independent project to explore LLM-powered writing tools with streaming structured output and real-time editor integration.
