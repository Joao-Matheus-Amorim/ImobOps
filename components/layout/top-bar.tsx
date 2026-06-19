import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { RoleSwitcher } from "./role-switcher";
import { APP_NAME } from "@/lib/constants";
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
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-8">
        {/* Brand only on mobile (sidebar carries it on desktop). */}
        <Link href={routes.dashboard} className="flex items-center gap-2 font-display font-bold md:hidden">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">I</span>
          <span>{APP_NAME}</span>
        </Link>
        <div className="hidden md:block">
          <span className="pill-badge">
            <span className="size-1.5 rounded-full bg-primary shadow-glow-sm" />
            Workspace ativo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <RoleSwitcher current={role} />
          </div>
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <Avatar name={displayName} className="size-9" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
