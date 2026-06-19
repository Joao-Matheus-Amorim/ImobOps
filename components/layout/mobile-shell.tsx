import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import type { NavEntry, NavGroup } from "@/lib/routes";
import type { Role } from "@/lib/types/permissions";

// App shell: fixed grouped sidebar on desktop, slim top bar, scrollable content,
// and a fixed bottom nav on mobile.
export function MobileShell({
  children,
  displayName,
  role,
  primaryNav,
  navGroups,
}: {
  children: ReactNode;
  displayName: string;
  role: Role;
  primaryNav: NavEntry[];
  navGroups: NavGroup[];
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar groups={navGroups} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar displayName={displayName} role={role} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav entries={primaryNav} />
    </div>
  );
}
