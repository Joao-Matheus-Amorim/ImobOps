import Link from "next/link";
import { Bell, Command, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { RoleSwitcher } from "./role-switcher";
import { LogoutButton } from "./logout-button";
import { APP_NAME, isSupabaseConfigured } from "@/lib/constants";
import { ROLE_LABELS, type Role } from "@/lib/types/permissions";
import { routes } from "@/lib/routes";

export function TopBar({
  displayName,
  role,
}: {
  displayName: string;
  role: Role;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-primary/15 bg-[#0f2a44]/90 shadow-[0_18px_70px_-55px_hsl(var(--primary)/0.9)] backdrop-blur-xl">
      <div className="flex h-[70px] items-center justify-between gap-4 px-4 md:px-8">
        {/* Brand only on mobile (sidebar carries it on desktop). */}
        <Link href={routes.dashboard} className="flex items-center gap-2 font-display font-bold md:hidden">
          <span className="grid size-8 place-items-center rounded-full border border-primary bg-primary/15 text-primary shadow-glow-sm">I</span>
          <span>{APP_NAME}</span>
        </Link>
        <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
          <span className="whitespace-nowrap text-sm font-semibold text-foreground">
            ImobOps Workspace
          </span>
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/80" />
            <input
              className="h-11 w-full rounded-2xl border border-primary/20 bg-background/22 px-12 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/60 focus:bg-background/35 focus:shadow-glow-sm"
              placeholder="Buscar em tudo..."
              type="search"
            />
            <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-primary/20 bg-card/60 px-2 py-1 text-xs text-muted-foreground lg:flex">
              <Command className="size-3" /> K
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Role switcher is a demo-mode affordance only. */}
          {!isSupabaseConfigured() ? (
            <div className="hidden md:block">
              <RoleSwitcher current={role} />
            </div>
          ) : null}
          <ThemeToggle />
          <button className="relative grid size-10 place-items-center rounded-full border border-primary/20 bg-card/45 text-muted-foreground transition hover:border-primary/55 hover:text-primary hover:shadow-glow-sm">
            <Bell className="size-4" />
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-glow-sm">
              3
            </span>
          </button>
          <div className="flex items-center gap-2">
            <Avatar name={displayName} className="size-10 border border-primary/35 shadow-glow-sm" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
