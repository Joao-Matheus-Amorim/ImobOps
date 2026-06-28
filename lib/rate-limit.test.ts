import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, tooManyRequests, clientIp, type RateLimitResult } from "./rate-limit";

// Local rate limiting (no UPSTASH env vars in tests) — tests the in-memory bucket.

describe("rateLimit (local)", () => {
  beforeEach(() => {
    // Each test starts fresh: re-import module to clear buckets.
    // Since rate-limit.ts uses module-level Map, we rely on describe-level isolation.
  });

  it("permite a primeira requisição dentro do limite", async () => {
    const result = await rateLimit("test-key-1", 5, 60_000);
    expect(result.ok).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("nega requisições que excedem o limite", async () => {
    const key = "test-key-2";
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit(key, 5, 60_000);
      expect(r.ok).toBe(true);
    }
    const exceeded = await rateLimit(key, 5, 60_000);
    expect(exceeded.ok).toBe(false);
    expect(exceeded.remaining).toBe(0);
  });

  it("reinicia a janela após expirar", async () => {
    const key = "test-key-3";
    // Fill the bucket with a very short window
    const r1 = await rateLimit(key, 2, 10);
    expect(r1.ok).toBe(true);
    await rateLimit(key, 2, 10);
    const r3 = await rateLimit(key, 2, 10);
    expect(r3.ok).toBe(false);

    // Wait for window to expire and try again
    await new Promise((resolve) => setTimeout(resolve, 15));
    const r4 = await rateLimit(key, 2, 10);
    expect(r4.ok).toBe(true);
    expect(r4.remaining).toBe(1);
  });

  it("chaves diferentes têm buckets independentes", async () => {
    const r1 = await rateLimit("key-a", 3, 60_000);
    const r2 = await rateLimit("key-b", 3, 60_000);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it("remaining nunca fica negativo", async () => {
    const key = "test-key-4";
    for (let i = 0; i < 10; i++) {
      const r = await rateLimit(key, 3, 60_000);
      expect(r.remaining).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("tooManyRequests", () => {
  it("retorna resposta 429 com headers corretos", () => {
    const result: RateLimitResult = { ok: false, limit: 10, remaining: 0, resetAt: Date.now() + 30_000 };
    const res = tooManyRequests(result);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("calcula Retry-After como pelo menos 1 segundo", async () => {
    const result: RateLimitResult = { ok: false, limit: 5, remaining: 0, resetAt: Date.now() - 1000 };
    const res = tooManyRequests(result);
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
  });
});

describe("clientIp", () => {
  it("extrai IP de x-forwarded-for", () => {
    const req = new Request("http://localhost", { headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" } });
    expect(clientIp(req)).toBe("192.168.1.1");
  });

  it("usa x-real-ip como fallback", () => {
    const req = new Request("http://localhost", { headers: { "x-real-ip": "10.0.0.5" } });
    expect(clientIp(req)).toBe("10.0.0.5");
  });

  it("retorna 'unknown' quando não há header de IP", () => {
    const req = new Request("http://localhost");
    expect(clientIp(req)).toBe("unknown");
  });
});
