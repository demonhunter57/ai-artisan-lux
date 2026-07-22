import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, getClientKey } from "./rate-limit";

describe("checkRateLimit", () => {
  it("autorise les requetes sous la limite", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it("bloque une fois la limite atteinte", () => {
    const key = `test-${crypto.randomUUID()}`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });

  it("reinitialise apres l'expiration de la fenetre", () => {
    vi.useFakeTimers();
    try {
      const key = `test-${crypto.randomUUID()}`;
      checkRateLimit(key, 1, 1000);
      expect(checkRateLimit(key, 1, 1000)).toBe(false);

      vi.advanceTimersByTime(1001);
      expect(checkRateLimit(key, 1, 1000)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("getClientKey", () => {
  it("extrait la premiere IP de x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(getClientKey(req)).toBe("203.0.113.5");
  });

  it("retourne 'unknown' si l'en-tete est absent", () => {
    const req = new Request("http://localhost");
    expect(getClientKey(req)).toBe("unknown");
  });
});
