// Helper for API routes: resolve the session into a RepoContext, or return a 401.
// Keeps route handlers terse and consistent now that the session is async + nullable.
// Also applies a per-user rate limit so a single account cannot hammer the write
// endpoints.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { RepoContext } from "@/lib/repositories/base";

// Default budget for authenticated mutations: generous for real use, low enough
// to stop scripted abuse. Callers can override per route via the `limit` option.
const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

export async function requireContext(
  request?: Request,
  options?: { limit?: number; windowMs?: number; bucket?: string },
): Promise<{ ctx: RepoContext; userId: string } | { error: NextResponse }> {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }

  // Key by user (+ optional bucket so distinct route groups don't share a budget).
  const bucket = options?.bucket ?? new URL(request?.url ?? "http://x/").pathname;
  const limit = await rateLimit(
    `user:${user.id}:${bucket}`,
    options?.limit ?? DEFAULT_LIMIT,
    options?.windowMs ?? DEFAULT_WINDOW_MS,
  );
  if (!limit.ok) {
    return { error: tooManyRequests(limit) };
  }

  return { ctx: { tenancyId: user.tenancyId, userId: user.id }, userId: user.id };
}
