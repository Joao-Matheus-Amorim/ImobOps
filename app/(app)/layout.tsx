import { MobileShell } from "@/components/layout/mobile-shell";
import { getSessionUser, getPrincipal } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { PRIMARY_NAV, NAV_GROUPS } from "@/lib/routes";

// Server layout for the authenticated app. Filters nav entries by permission so
// the UI hides what the user cannot access.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = getSessionUser();
  const principal = getPrincipal();

  const primaryNav = PRIMARY_NAV.filter((e) => can(principal, e.feature, "view"));

  // Filter each sidebar group, dropping groups that end up empty.
  const navGroups = NAV_GROUPS.map((g) => ({
    ...g,
    entries: g.entries.filter((e) => can(principal, e.feature, "view")),
  })).filter((g) => g.entries.length > 0);

  return (
    <MobileShell
      displayName={user.displayName}
      role={user.role}
      primaryNav={primaryNav}
      navGroups={navGroups}
    >
      {children}
    </MobileShell>
  );
}
