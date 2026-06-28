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
      <div className="flex min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,hsl(var(--primary)/0.08),transparent_18rem)]">
        <TopBar displayName={displayName} role={role} />
        <main className="w-full flex-1 px-4 pb-28 pt-8 md:px-9 md:pb-10 lg:px-10">
          {children}
        </main>
      </div>
      <BottomNav entries={primaryNav} />
    </div>
  );
}
