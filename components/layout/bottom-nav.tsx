"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import type { NavEntry } from "@/lib/routes";

// Mobile-first bottom navigation. Entries are pre-filtered by permission server-side.
export function BottomNav({ entries }: { entries: NavEntry[] }) {
  const pathname = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {entries.map((e) => {
          const active = pathname === e.href || pathname.startsWith(`${e.href}/`);
          return (
            <li key={e.href} className="flex-1">
              <Link
                href={e.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon name={e.icon} className="size-5" />
                {e.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
