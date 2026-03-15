import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Re-import the module fresh for each test to clear in-memory stores.
describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request from an IP", async () => {
    const { checkRateLimit: check, MAX_REQUESTS_PER_IP } = await import(
      "@/lib/rate-limit"
    );
    const result = check("192.168.1.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(MAX_REQUESTS_PER_IP - 1);
  });

  it("decrements remaining on subsequent requests", async () => {
    const { checkRateLimit: check, MAX_REQUESTS_PER_IP } = await import(
      "@/lib/rate-limit"
    );
    check("10.0.0.1");
    check("10.0.0.1");
    const result = check("10.0.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(MAX_REQUESTS_PER_IP - 3);
  });

  it("blocks after per-IP limit is exhausted", async () => {
    const { checkRateLimit: check, MAX_REQUESTS_PER_IP } = await import(
      "@/lib/rate-limit"
    );
    for (let i = 0; i < MAX_REQUESTS_PER_IP; i++) {
      const r = check("10.0.0.2");
      expect(r.allowed).toBe(true);
    }
    const blocked = check("10.0.0.2");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks IPs independently", async () => {
    const { checkRateLimit: check, MAX_REQUESTS_PER_IP } = await import(
      "@/lib/rate-limit"
    );
    for (let i = 0; i < MAX_REQUESTS_PER_IP; i++) {
      check("10.0.0.3");
    }
    expect(check("10.0.0.3").allowed).toBe(false);
    expect(check("10.0.0.4").allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    vi.useFakeTimers();
    const { checkRateLimit: check, MAX_REQUESTS_PER_IP } = await import(
      "@/lib/rate-limit"
    );
    for (let i = 0; i < MAX_REQUESTS_PER_IP; i++) {
      check("10.0.0.5");
    }
    expect(check("10.0.0.5").allowed).toBe(false);

    // Fast-forward past the 1-hour window
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    const result = check("10.0.0.5");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(MAX_REQUESTS_PER_IP - 1);
  });

  it("returns retryAfter in seconds when blocked", async () => {
    vi.useFakeTimers();
    const { checkRateLimit: check, MAX_REQUESTS_PER_IP } = await import(
      "@/lib/rate-limit"
    );
    for (let i = 0; i < MAX_REQUESTS_PER_IP; i++) {
      check("10.0.0.6");
    }
    // Advance 10 minutes into the window
    vi.advanceTimersByTime(10 * 60 * 1000);
    const result = check("10.0.0.6");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(3000); // 50 minutes remaining = 3000 seconds
  });

  it("enforces global daily budget across all IPs", async () => {
    const { checkRateLimit: check, DAILY_BUDGET, MAX_REQUESTS_PER_IP } =
      await import("@/lib/rate-limit");

    // Exhaust the daily budget using unique IPs
    // Each IP gets 1 request, so we need DAILY_BUDGET unique IPs
    for (let i = 0; i < DAILY_BUDGET; i++) {
      const r = check(`budget-${i}`);
      // Per-IP should allow it, global budget should allow it until exhausted
      if (i < DAILY_BUDGET) {
        expect(r.allowed).toBe(true);
      }
    }

    // Next request from a fresh IP should be blocked by global budget
    const blocked = check("one-more");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets global budget after 24 hours", async () => {
    vi.useFakeTimers();
    const { checkRateLimit: check, DAILY_BUDGET } = await import(
      "@/lib/rate-limit"
    );

    // Exhaust budget
    for (let i = 0; i < DAILY_BUDGET; i++) {
      check(`reset-${i}`);
    }
    expect(check("fresh-ip").allowed).toBe(false);

    // Fast-forward past 24 hours
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    const result = check("fresh-ip-2");
    expect(result.allowed).toBe(true);
  });
});
