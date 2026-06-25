// Dependency-free, in-memory rate limiter (fixed window). Adequate for a
// single-region Next.js deployment to blunt abusive bursts on write/webhook
// routes. It is per-instance: with multiple serverless instances the effective
// limit is per-instance, which is fine as a coarse safety net. For strict global
// limits, back this with Redis/Upstash later - the call sites stay the same.
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map does not grow unbounded for one-off keys.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
}

// Returns whether the key is within `limit` requests per `windowMs`.
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, limit, remaining: limit - 1, resetAt };
  }
  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return { ok: existing.count <= limit, limit, remaining, resetAt: existing.resetAt };
}

// 429 response with standard rate-limit headers.
export function tooManyRequests(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Muitas requisições. Tente novamente em instantes." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
