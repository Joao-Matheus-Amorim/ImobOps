"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { APP_NAME } from "@/lib/constants";
import { routes } from "@/lib/routes";
import type { NavGroup } from "@/lib/routes";

// Fixed grouped sidebar (desktop). Groups are pre-filtered by permission server-side.
export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-card/40 px-3 py-5 md:flex">
      <Link href={routes.dashboard} className="flex items-center gap-2.5 px-2">
        <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground shadow-glow-sm">
          I
        </span>
        <span className="font-display text-sm font-bold tracking-tight">{APP_NAME}</span>
      </Link>

      <nav className="flex flex-col gap-5 overflow-y-auto thin-scrollbar">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="section-label px-3 pb-1 text-muted-foreground/70">{group.label}</p>
            {group.entries.map((e) => {
              const active = pathname === e.href || pathname.startsWith(`${e.href}/`);
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "border border-primary/40 bg-primary/10 text-foreground shadow-glow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon
                    name={e.icon}
                    className={cn("size-[18px]", active ? "text-primary" : "")}
                  />
                  <span className="flex-1">{e.label}</span>
                  {active ? (
                    <span className="size-1.5 rounded-full bg-primary shadow-glow-sm" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
