// Helper for API routes: resolve the session into a RepoContext, or return a 401.
// Keeps route handlers terse and consistent now that the session is async + nullable.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import type { RepoContext } from "@/lib/repositories/base";

export async function requireContext(): Promise<
  { ctx: RepoContext; userId: string } | { error: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { ctx: { tenancyId: user.tenancyId, userId: user.id }, userId: user.id };
}
