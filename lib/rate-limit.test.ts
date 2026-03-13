import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

// We need to reset the module-level store between tests.
// Re-import the module fresh for each describe block via vi.resetModules.
describe("checkRateLimit", () => {
  beforeEach(() => {
    // Reset the module to clear the in-memory store
    vi.resetModules();
  });

  it("allows the first request from an IP", async () => {
    const { checkRateLimit: check } = await import("@/lib/rate-limit");
    const result = check("192.168.1.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it("decrements remaining on subsequent requests", async () => {
    const { checkRateLimit: check } = await import("@/lib/rate-limit");
    check("10.0.0.1");
    check("10.0.0.1");
    const result = check("10.0.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(17);
  });

  it("blocks after 20 requests", async () => {
    const { checkRateLimit: check } = await import("@/lib/rate-limit");
    for (let i = 0; i < 20; i++) {
      const r = check("10.0.0.2");
      expect(r.allowed).toBe(true);
    }
    const blocked = check("10.0.0.2");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks IPs independently", async () => {
    const { checkRateLimit: check } = await import("@/lib/rate-limit");
    for (let i = 0; i < 20; i++) {
      check("10.0.0.3");
    }
    // 10.0.0.3 is now exhausted
    expect(check("10.0.0.3").allowed).toBe(false);
    // 10.0.0.4 should still be allowed
    expect(check("10.0.0.4").allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    const { checkRateLimit: check } = await import("@/lib/rate-limit");
    for (let i = 0; i < 20; i++) {
      check("10.0.0.5");
    }
    expect(check("10.0.0.5").allowed).toBe(false);

    // Fast-forward past the 1-hour window
    vi.useFakeTimers();
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    const result = check("10.0.0.5");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);

    vi.useRealTimers();
  });
});
