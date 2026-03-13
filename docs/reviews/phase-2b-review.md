# Phase 2B Review — API Route, Rate Limiting, Prompt Tests

**Date:** 2026-03-13
**Reviewer:** Claude (automated code review)
**Scope:** `/api/lint` POST endpoint, in-memory rate limiter, prompt evaluation tests, golden dataset, CONVENTIONS.md updates
**Test status:** 169 passing (vitest)

---

## Summary

Phase 2B delivers the streaming API endpoint (`/api/lint/route.ts`), an in-memory IP-based rate limiter (`lib/rate-limit.ts`), comprehensive prompt evaluation tests (`lib/prompts.test.ts`), and a golden evaluation dataset (`lib/eval/golden-dataset.ts`). The implementation is clean, well-structured, and follows established conventions closely.

The route handler correctly validates input, checks rate limits before the AI call, streams structured output via `streamObject` + `toTextStreamResponse`, and avoids leaking internal error details. The rate limiter is appropriately scoped for a prototype. The prompt tests are notably thorough -- they validate prompt structure, golden dataset integrity, schema conformance, and document open questions as always-pass observations.

The code is ready to ship with minor fixes. The critical finding is a JSON parse error that consumes a rate-limit token before the error can be properly classified. The remaining items are hardening suggestions.

---

## Files Reviewed

| File | Lines | Verdict |
|---|---|---|
| `app/api/lint/route.ts` | 71 | Good -- minor issues |
| `lib/rate-limit.ts` | 53 | Good |
| `lib/rate-limit.test.ts` | 67 | Good -- one isolation concern |
| `lib/prompts.test.ts` | 489 | Excellent |
| `lib/eval/golden-dataset.ts` | 384 | Excellent |
| `CONVENTIONS.md` (diff) | +28 lines | Good |
| `package.json` (diff) | +3 lines | Good |

---

## Critical (Must Fix)

### C1. Malformed JSON body returns 500 instead of 400

**File:** `app/api/lint/route.ts`, line 24

`req.json()` throws a `SyntaxError` when the request body is not valid JSON (e.g., the client sends plain text, empty body, or truncated JSON). This throw is caught by the outer `catch` block on line 64, which returns a generic 500 "Internal server error". The client receives no indication that their request was malformed.

Worse, because `checkRateLimit(ip)` runs on line 14 -- before `req.json()` -- the malformed request consumes a rate-limit token. An attacker could exhaust another user's rate limit by sending garbage payloads from behind the same proxy.

**Fix:** Wrap `req.json()` in its own try/catch and return 400:

```typescript
let body: unknown;
try {
  body = await req.json();
} catch {
  return NextResponse.json(
    { error: "Invalid JSON in request body" },
    { status: 400 }
  );
}
```

Alternatively, move rate limiting to after successful JSON parsing so that malformed requests don't consume tokens. The tradeoff is that this allows an unauthenticated caller to send arbitrarily many malformed requests without rate-limit protection, but since the parsing step is cheap and does not touch the AI provider, this is acceptable for a prototype.

---

## Warnings (Should Fix)

### W1. Missing `Retry-After` header on 429 response

**File:** `app/api/lint/route.ts`, line 17-21

RFC 6585 and RFC 9110 recommend including a `Retry-After` header in 429 responses so clients know when to retry. The current 429 response only includes `X-RateLimit-Remaining: 0`.

The rate limiter already tracks `resetAt` per entry, so this information is available. It would require `checkRateLimit` to return `retryAfter` (seconds until window reset) when `allowed` is `false`.

**Impact:** Without this header, well-behaved clients cannot implement proper backoff. For a prototype this is low-severity, but it is a one-line addition to the rate limiter and a one-line addition to the response headers.

### W2. Rate limit consumed before input validation

**File:** `app/api/lint/route.ts`, lines 12-31

The current order is: rate limit check (line 14) -> JSON parse (line 24) -> input validation (line 27). This means invalid requests (empty text, text too long, non-string text) still consume a rate-limit token. A user who accidentally sends `{ "text": "" }` 20 times in an hour will be locked out.

**Recommendation:** Consider checking rate limits after basic input validation passes but before the AI call. This way only requests that would actually invoke the LLM consume tokens. The validation steps (JSON parse, type check, length check) are all cheap.

### W3. `vi.resetModules()` in `beforeEach` does not reset the module for the top-level import

**File:** `lib/rate-limit.test.ts`, lines 2, 6-9

The test file imports `checkRateLimit` at the top level (line 2) but never uses that import directly -- each test does a fresh `await import(...)`. The `vi.resetModules()` in `beforeEach` resets the module registry so each dynamic import gets a fresh store. This works correctly.

However, the top-level import on line 2 is dead code. It creates an initial module instance that is never used and never cleaned up. While it does not affect correctness (tests use dynamic imports), it is misleading to readers and should be removed.

### W4. Fake timers set up after real calls in the window-expiry test

**File:** `lib/rate-limit.test.ts`, lines 50-66

The test "resets after the window expires" makes 20 real `checkRateLimit` calls using `Date.now()`, then switches to fake timers with `vi.useFakeTimers()` and advances time. This works because `vi.useFakeTimers()` captures the current real time as its base and `advanceTimersByTime` moves forward from there.

This is fragile: if Vitest changes how fake timer initialization works relative to already-stored `resetAt` timestamps, the test could break. A more robust approach would be to enable fake timers at the start of the test, make all calls under fake time, then advance.

---

## Suggestions (Consider)

### S1. Add `EmpathyFlagSchema` refinement for whitespace-only `exact_phrase`

**File:** `lib/schemas.ts`, line 11

The prompt tests correctly identify (lines 347-359, 445-457 of `prompts.test.ts`) that `exact_phrase: "   "` passes schema validation because `.min(1)` checks string length, not meaningful content. A whitespace-only phrase would never match any text in `applyFlags()` and would be silently skipped.

Adding `.trim().min(1)` or `.refine(s => s.trim().length > 0)` to the schema would reject these at the validation layer. This is not urgent since `applyFlags` handles it gracefully, but it would make the contract stricter.

### S2. Consider exporting `MAX_REQUESTS` and `WINDOW_MS` for test assertions

**File:** `lib/rate-limit.ts`, lines 9-10

The rate limiter's constants (`MAX_REQUESTS = 20`, `WINDOW_MS = 3600000`) are not exported. The tests hardcode the values (e.g., looping 20 times, advancing by `60 * 60 * 1000 + 1`). If the constants change, the tests will silently test the wrong boundaries.

Exporting them (or exporting a `RATE_LIMIT_CONFIG` object) would let tests reference the authoritative values. CONVENTIONS.md says these are "colocated in the module," which does not preclude exporting them.

### S3. Add a route handler test file

There is no `app/api/lint/route.test.ts`. The route handler has several code paths (rate limit exceeded, invalid JSON, missing text, text too long, missing API key, successful stream) that are only exercised via manual testing or integration tests.

A unit test file that mocks `streamObject` and `createAnthropic` could verify each response path in isolation. This is lower priority for a prototype, but it would catch regressions in the validation logic.

### S4. Consider adding `Content-Type` validation

**File:** `app/api/lint/route.ts`

The route does not check `Content-Type: application/json`. Clients sending `text/plain` or `multipart/form-data` will hit the `req.json()` parse error. Checking the content type header and returning a 415 (Unsupported Media Type) would give a clearer error message.

### S5. Document the `EmpathyFlagInput` import in `golden-dataset.ts`

**File:** `lib/eval/golden-dataset.ts`, line 19

The file imports `EmpathyFlagInput` from `@/lib/schemas` but never uses it. The `ExpectedFlag` interface is defined locally with `exact_phrase` and `why` fields, which is intentionally different from `EmpathyFlagInput` (which has `exact_phrase`, `reason`, `suggestion`). The unused import should be removed.

---

## Convention Compliance

The implementation follows CONVENTIONS.md closely:

| Convention | Status |
|---|---|
| Validation before AI call | Followed (lines 12-48 of route.ts) |
| `streamObject` for structured LLM output | Followed |
| `toTextStreamResponse()` for streaming | Followed |
| `createAnthropic` with server-side key | Followed |
| `temperature: 0` for analysis | Followed |
| IP extraction from `x-forwarded-for` | Followed |
| In-memory Map-based rate limiter | Followed |
| Synchronous `checkRateLimit(ip)` | Followed |
| Sweep expired entries on each check | Followed |
| Constants colocated in module | Followed |
| No internal error detail leakage | Followed |
| Test file co-location | Followed |
| `@/` path alias in tests | Followed |

**New conventions added in this phase** (API Routes, Rate Limiting sections, two new anti-patterns) are accurate and well-written. No corrections needed.

---

## Patterns to Document

No new patterns were discovered that need addition to CONVENTIONS.md. The existing documentation added in this phase is thorough.

One observation for future reference: the "always-pass documentation" test pattern used in `prompts.test.ts` (lines 444-488) is a novel approach to documenting known limitations and open questions inside the test suite. If adopted broadly, it should be added to CONVENTIONS.md under Testing conventions. For now it is a single-file experiment and does not warrant a convention entry.

---

## Per-File Notes

### `app/api/lint/route.ts`

Clean, well-organized handler following the validate-then-stream pattern. The code is easy to follow with clear section comments. The `streamObject` wiring is correct: schema, system prompt, user prompt, temperature, and model are all properly threaded. The `toTextStreamResponse` call correctly passes custom headers via the `init` parameter.

**Lines 12-13:** IP extraction correctly takes the first entry from `x-forwarded-for` (Vercel may append proxy IPs separated by commas) and falls back to `"unknown"`. The fallback means all requests without the header share one rate-limit bucket. This is acceptable for a prototype but worth noting -- in local development without a proxy, all requests will use `"unknown"`.

**Line 27:** The `!text` check will catch `null`, `undefined`, `""`, and `0`. Since the `typeof text !== "string"` check follows, this correctly rejects all falsy non-string values. The empty string case (`""`) is intentionally rejected, which is the right behavior since there is nothing to lint.

**Line 53:** `streamObject` is called but not awaited. This is correct -- `streamObject` returns a `StreamObjectResult` synchronously, and the streaming happens when the response is consumed by the client.

### `lib/rate-limit.ts`

Minimal, correct rate limiter. The sweep-on-check approach prevents unbounded memory growth. The defensive `entry.resetAt <= now` check on line 40 (after the sweep already deleted expired entries) handles the edge case where time advances between the sweep and the lookup.

**Line 48:** The `entry.count > MAX_REQUESTS` comparison (strictly greater than) means the 20th request is allowed and the 21st is blocked. This is consistent with `MAX_REQUESTS = 20` meaning "20 requests per window."

### `lib/rate-limit.test.ts`

Good coverage of core behaviors: first request, decrementing, exhaustion, IP isolation, and window expiry. The dynamic import pattern (`await import(...)`) with `vi.resetModules()` correctly isolates each test's module-level state.

### `lib/prompts.test.ts`

Exceptionally thorough. The test structure is well-organized into logical sections with clear ASCII headers. Notable strengths:

- **Structural validation** of LINT_SYSTEM covers all major sections (flag rules, no-flag rules, exact_phrase rules, reason/suggestion guidelines, calibration, role framing)
- **Golden dataset integrity tests** verify that every `exact_phrase` appears verbatim in its sample text, every `shouldNotFlag` term appears in its text, and there is no overlap between expected and should-not-flag sets
- **Schema conformance tests** verify that golden dataset entries would pass Zod validation if returned by the LLM
- **Edge case tests** cover whitespace-only phrases, numeric types, null fields, hallucinated extra fields, and missing required keys
- **Always-pass documentation tests** clearly flag known limitations (whitespace-only phrases, no minimum length on reason/suggestion, OAuth in the no-flag list, missing code block guidance)

The `describe.each(ALL_SAMPLES)` pattern on line 236 is a good use of parameterized tests.

### `lib/eval/golden-dataset.ts`

Well-curated dataset with five domain-diverse jargon-heavy samples and two edge-case samples (clear text, minimal text). Each `expectedFlags` entry includes a detailed `why` that serves as both test documentation and future evaluation criteria. The `shouldNotFlag` lists are sensibly chosen -- they include terms that look technical but are standard enough to be false positives.

One note: the unused import of `EmpathyFlagInput` on line 19 should be cleaned up (see S5).

### `CONVENTIONS.md`

The additions are clean and accurately reflect the implemented patterns. The new API Routes and Rate Limiting sections use the same bullet-point style as existing sections. The two new anti-patterns (`generateObject` for streaming, exposing internal errors) are valuable guardrails.

### `package.json`

Adds `vitest` as a dev dependency and the `test` script. Both are correct. The vitest version (`^4.1.0`) is consistent with the existing `vitest.config.ts`.
