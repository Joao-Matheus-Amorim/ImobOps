import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";
import type { ChatMessage, ChatResponse } from "@/lib/types/ai";

const RESPONSE_TTL = 300;
const TOOL_RESULT_TTL = 30;
const LOCK_TTL = 10;
const POLL_TIMEOUT = 5000;

function isRedisConfigured(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return Boolean(process.env.UPSTASH_REDIS_REST_URL);
}

function getRedis(): Redis | null {
  if (!isRedisConfigured()) return null;
  return Redis.fromEnv();
}

function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

export function hashRequest(messages: ChatMessage[], toolNames: string[], tenancyId?: string): string {
  return sha1(JSON.stringify({ messages, tools: [...toolNames].sort(), tenancyId }));
}

export async function getCachedResponse(hash: string): Promise<ChatResponse | null> {
  const r = getRedis();
  if (!r) return null;
  return r.get<ChatResponse>(`ai:cache:response:${hash}`);
}

export async function setCachedResponse(hash: string, response: ChatResponse): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(`ai:cache:response:${hash}`, response, { ex: RESPONSE_TTL });
}

export async function getCachedToolResult(feature: string, params: Record<string, unknown>, tenancyId?: string): Promise<unknown | null> {
  const r = getRedis();
  if (!r) return null;
  const key = `ai:cache:tool:${feature}:${tenancyId ?? ""}:${sha1(JSON.stringify(params))}`;
  return r.get(key);
}

export async function setCachedToolResult(feature: string, params: Record<string, unknown>, result: unknown, tenancyId?: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const key = `ai:cache:tool:${feature}:${tenancyId ?? ""}:${sha1(JSON.stringify(params))}`;
  await r.set(key, result, { ex: TOOL_RESULT_TTL });
}

export async function acquireLock(hash: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  const key = `ai:lock:${hash}`;
  const ok = await r.set(key, "1", { nx: true, ex: LOCK_TTL });
  return ok !== null;
}

export async function releaseLock(hash: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(`ai:lock:${hash}`);
}

export async function waitForCachedResponse(hash: string): Promise<ChatResponse | null> {
  if (!isRedisConfigured()) return null;
  const deadline = Date.now() + POLL_TIMEOUT;
  while (Date.now() < deadline) {
    const cached = await getCachedResponse(hash);
    if (cached) return cached;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}
