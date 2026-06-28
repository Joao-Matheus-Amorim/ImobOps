import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as {
  __whatsappRedis?: Redis;
};

export function isWhatsAppRedisConfigured(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function getWhatsAppRedis(): Redis | null {
  if (!isWhatsAppRedisConfigured()) return null;
  return (globalForRedis.__whatsappRedis ??= Redis.fromEnv());
}
