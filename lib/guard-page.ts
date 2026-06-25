import { notFound, redirect } from "next/navigation";
import { getSessionUser, getPrincipal, type SessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import type { FeatureKey, Action } from "@/lib/types/permissions";
import type { RepoContext } from "@/lib/repositories/base";
import { routes } from "@/lib/routes";

export interface PageGuard {
  user: SessionUser;
  ctx: RepoContext;
}

// Server-side page guard. Returns the session + repo context. Redirects to login
// when unauthenticated; 404s if the user lacks the required permission (UI hides
// what it cannot show).
export async function guardPage(
  feature: FeatureKey,
  action: Action = "view",
): Promise<PageGuard> {
  const user = await getSessionUser();
  const principal = await getPrincipal();
  if (!user || !principal) {
    redirect(routes.login);
  }
  if (!can(principal, feature, action)) {
    notFound();
  }
  return { user, ctx: { tenancyId: user.tenancyId, userId: user.id } };
}
