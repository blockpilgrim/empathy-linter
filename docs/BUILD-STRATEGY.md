Here is the drafted `BUILD-STRATEGY.md` adapted for our specific constraints. It uses your playbook structure but intentionally strips out the auth and billing layers that you added to Pulp. The strategy here is entirely focused on leveraging your existing assets to maximize impact and minimize build time.

---

# BUILD-STRATEGY.md: Empathy Linter Prototype

**Scope**: Build a zero-friction, interactive web prototype of an AI-powered empathy linter for technical documentation.
**Context**: Solo developer. 1-day timebox. Goal is to demonstrate product-driven engineering and domain expertise for a job application. Reusing core editor components from a previous project (Pulp).

---

## What We're Optimizing For

* **Zero-friction demonstration** — The hiring manager must be able to click a URL and experience the core value proposition instantly, with no login, no setup, and no friction.
* **Velocity via reuse** — Every architectural choice favors reusing existing code from the Pulp repository over building from scratch.
* **UI/UX Polish** — Because the backend is stateless and simple, time saved will be redirected to front-end craft (animations, typography, popover design) to prove product-minded execution.

**What we're sacrificing:**

* **Persistence** — We are skipping database integration entirely. No user accounts, no saved documents. State lives only in the browser session.
* **Scalability** — We aren't building for 10,000 MAUs. We are building for a handful of evaluators.
* **Cost efficiency** — We will absorb the API costs of the demo unconditionally. Rate limiting will be basic IP-based or session-based, strictly to prevent automated abuse, not to enforce billing tiers.

---

## Tech Stack

### Framework — Next.js 16 (App Router) & Vercel

**Why:** It is our established baseline. Vercel provides instant preview deployments and zero-config edge functions. This gives us a live URL to share immediately.

### Editor — TipTap (Reused from Pulp)

**Why:** TipTap's headless nature and ProseMirror foundation are perfect for custom text manipulation. We are explicitly reusing the custom TipTap extension built for Pulp that handles inline, highlighter-styled blocks. Building this from scratch takes days; reusing it takes minutes.

### AI Orchestration — Vercel AI SDK

**Why:** Unchanged from our standard stack. We need to stream structured data (JSON arrays of empathy flags) from the LLM to the client without blocking the React render cycle.

### LLM — Claude 4.6 Sonnet (via Anthropic API)

**Why:** Claude excels at nuanced text analysis, tone detection, and structured JSON output. It is better suited for "empathy" and context evaluation than standard GPT models.

---

## Architecture Overview

```text
Browser (Zero-Auth State)
├── TipTap Editor (holds document state)
├── Custom Extension (renders inline highlights)
└── Next.js Client Components (manages UI popovers)
    └── Debounced API Calls
        └── fetch /api/lint (Route Handler)
            ├── Vercel AI SDK (streamObject)
            ├── Anthropic API (Claude 4.6 Sonnet)
            └── Streams JSON array back to Client

```

---

## Data Architecture

**Stateless Model:**
There is no database. We are omitting Supabase/Neon entirely for this build.

The only "data model" is the ephemeral schema used to enforce the LLM's structured output via the Vercel AI SDK (using Zod):

```typescript
// Zod Schema for LLM Output
const EmpathyFlagSchema = z.object({
  exact_phrase: z.string(), // The jargon or assumed-knowledge phrase
  reason: z.string(),       // Why it might alienate the reader
  suggestion: z.string()    // A clearer alternative or prompt to link out
})

```

---

## Key Decisions

### 1. Reuse Pulp's Custom Editor Extension

**Context:** Creating seamless inline decorations in a rich text editor is notoriously difficult and prone to cursor-jumping bugs.
**Decision:** We will literally copy the custom TipTap extension from the Pulp repository.
**Rationale:** The exact mechanic used in Pulp for "Provocations" is identical to what we need for "Empathy Flags" (inline, dismissible highlights injected at semantic seams). This saves ~6 hours of deep ProseMirror debugging.
**Trade-off:** We may carry over some unused configuration from Pulp, but speed is the priority.

### 2. Ambient vs. Triggered Analysis

**Context:** We need to analyze the text, but sending an API request on every keystroke will blow up API limits and cause UI jitter.
**Decision:** Implement aggressive debouncing (e.g., 2000ms after the user stops typing) coupled with a document-diffing approach.
**Rationale:** The MVP needs to feel "ambient"—it evaluates quietly in the background. If the hiring manager pastes a block of text, the linter should fire automatically once without requiring them to click a "Check Document" button.
**Trade-off:** Fast typists won't see feedback until they pause.

### 3. Pre-loading the Demo State

**Context:** A blank text editor is a terrible demo experience. It requires the hiring manager to do the work of finding bad documentation to test.
**Decision:** The application will load with a hardcoded, highly technical paragraph already in the editor, and the linter will have pre-run against it.
**Rationale:** Time to value must be zero seconds. The hiring manager must see the highlights the millisecond the Vercel URL resolves.

---

## Testing Philosophy

Since this is a disposable prototype to prove a point, we are aggressively skipping traditional test suites:

* **Skip:** Unit tests, integration tests, CI/CD pipeline blocking.
* **Focus:** Prompt Engineering Evaluation.
Our "testing" time will be spent creating a golden dataset of 5-10 jargon-heavy paragraphs (borrowed from actual open-source docs) and tuning the system prompt until Claude reliably flags the right terms without returning false positives for standard English.

---

## Performance Considerations

* **UI Blocking:** The AI request must be completely decoupled from the TipTap editor state. The user must be able to continue typing smoothly while the AI request is pending in the background.
* **Payload Size:** Do not send the entire document to the LLM on every keystroke if the document gets long. For this MVP, we assume short documents (under 1000 words), so full-document transmission is acceptable.
