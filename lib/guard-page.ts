import { notFound } from "next/navigation";
import { getSessionUser, getPrincipal, type SessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import type { FeatureKey, Action } from "@/lib/types/permissions";
import type { RepoContext } from "@/lib/repositories/base";

export interface PageGuard {
  user: SessionUser;
  ctx: RepoContext;
}

// Server-side page guard. Returns the session + repo context, or 404s if the user
// lacks the required permission (UI hides what it cannot show).
export function guardPage(feature: FeatureKey, action: Action = "view"): PageGuard {
  const user = getSessionUser();
  if (!can(getPrincipal(), feature, action)) {
    notFound();
  }
  return { user, ctx: { tenancyId: user.tenancyId, userId: user.id } };
}
