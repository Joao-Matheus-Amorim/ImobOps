"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { APP_NAME, isClientPreviewMode } from "@/lib/constants";
import { routes } from "@/lib/routes";
import type { NavGroup } from "@/lib/routes";

// Fixed grouped sidebar (desktop). Groups are pre-filtered by permission server-side.
export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const preview = isClientPreviewMode();

  return (
    <aside className="hidden w-[268px] shrink-0 flex-col border-r border-primary/14 bg-card/92 shadow-[24px_0_90px_-62px_hsl(var(--primary)/0.65)] backdrop-blur-xl md:flex">
      <Link href={routes.dashboard} className="flex h-[86px] items-center gap-3 border-b border-primary/12 px-6">
        <span className="grid size-11 place-items-center rounded-full border border-primary bg-primary/10 font-display text-lg font-bold text-primary shadow-glow">
          I
        </span>
        <span>
          <span className="block text-sm font-bold tracking-tight">{APP_NAME}</span>
          <span className="block text-xs text-muted-foreground">Imobiliária</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-6 thin-scrollbar">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="section-label px-3 pb-2 text-muted-foreground">{group.label}</p>
            {group.entries.map((e) => {
              const active = pathname === e.href || pathname.startsWith(`${e.href}/`);
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] transition-all duration-200",
                    active
                      ? "border border-primary/55 bg-primary/12 text-foreground shadow-[0_0_28px_-7px_hsl(var(--primary)/0.95)]"
                      : "text-muted-foreground hover:bg-primary/8 hover:text-foreground",
                  )}
                >
                  <Icon
                    name={e.icon}
                    className={cn("size-[18px]", active ? "text-primary" : "")}
                  />
                  <span className="flex-1">{e.label}</span>
                  {active ? (
                    <>
                      <span className="absolute inset-y-1 -right-1 w-1 rounded-full bg-primary shadow-glow" />
                      <span className="size-2 rounded-full bg-primary shadow-glow-sm" />
                    </>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-primary/12 p-4">
        <p className="section-label text-muted-foreground">Operação ativa</p>
        <p className="mt-2 font-semibold text-foreground">
          {preview ? "ImobOps Workspace" : "ImobOps Demo"}
        </p>
        <p className="text-xs text-muted-foreground">Operação imobiliária</p>
      </div>
    </aside>
  );
}
