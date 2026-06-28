import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("cache module - graceful degradation sem Redis", () => {
  it("hashRequest produz hash estavel para mesma entrada", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const { hashRequest } = await import("./cache");
    const messages = [{ role: "user" as const, content: "oi" }];
    const tools = ["tool-a", "tool-b"];
    const h1 = hashRequest(messages, tools);
    const h2 = hashRequest(messages, tools);
    expect(h1).toBe(h2);
    expect(h1.length).toBe(40);
  });

  it("hashRequest produz hashes diferentes para entradas diferentes", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const { hashRequest } = await import("./cache");
    const h1 = hashRequest([{ role: "user" as const, content: "oi" }], ["a"]);
    const h2 = hashRequest([{ role: "user" as const, content: "tchau" }], ["a"]);
    expect(h1).not.toBe(h2);
  });

  it("hashRequest ordena nomes das tools para hash estavel", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const { hashRequest } = await import("./cache");
    const messages = [{ role: "user" as const, content: "oi" }];
    const h1 = hashRequest(messages, ["z", "a"]);
    const h2 = hashRequest(messages, ["a", "z"]);
    expect(h1).toBe(h2);
  });

  it("hashRequest produz hashes diferentes para tenants diferentes", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const { hashRequest } = await import("./cache");
    const messages = [{ role: "user" as const, content: "oi" }];
    const h1 = hashRequest(messages, ["a"], "tenancy-1");
    const h2 = hashRequest(messages, ["a"], "tenancy-2");
    expect(h1).not.toBe(h2);
  });

  it("getCachedResponse retorna null quando Redis nao configurado", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    const { getCachedResponse } = await import("./cache");
    const result = await getCachedResponse("any-hash");
    expect(result).toBeNull();
  });

  it("setCachedResponse nao lanca erro quando Redis nao configurado", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    const { setCachedResponse } = await import("./cache");
    await expect(setCachedResponse("any-hash", { content: "x", toolCalls: [] })).resolves.toBeUndefined();
  });

  it("acquireLock retorna true quando Redis nao configurado (degradacao graciosa)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    const { acquireLock } = await import("./cache");
    const ok = await acquireLock("hash");
    expect(ok).toBe(true);
  });
});

describe("cache module - funcoes que dependem de Redis (simuladas)", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  it("getCachedToolResult retorna null sem Redis", async () => {
    const { getCachedToolResult } = await import("./cache");
    const result = await getCachedToolResult("clients", { query: "Maria" }, "tenancy-1");
    expect(result).toBeNull();
  });

  it("waitForCachedResponse retorna null sem Redis", async () => {
    const { waitForCachedResponse } = await import("./cache");
    const result = await waitForCachedResponse("any-hash");
    expect(result).toBeNull();
  });

  it("setCachedToolResult nao lanca sem Redis", async () => {
    const { setCachedToolResult } = await import("./cache");
    await expect(setCachedToolResult("clients", { query: "x" }, { id: 1 }, "tenancy-1")).resolves.toBeUndefined();
  });

  it("releaseLock nao lanca sem Redis", async () => {
    const { releaseLock } = await import("./cache");
    await expect(releaseLock("any-hash")).resolves.toBeUndefined();
  });
});
