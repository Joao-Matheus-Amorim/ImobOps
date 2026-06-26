import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntityMeta {
  label: string;
  value: ReactNode;
}

// Richer card for listing pages: leading icon, title, a row of meta pairs, an
// optional highlighted value, and a status slot. Links to the detail page.
export function EntityCard({
  href,
  icon,
  title,
  subtitle,
  meta,
  highlight,
  highlightLabel,
  status,
}: {
  href?: string;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: EntityMeta[];
  highlight?: ReactNode;
  highlightLabel?: string;
  status?: ReactNode;
}) {
  const inner = (
    <div
      className={cn(
        "group flex h-full flex-col gap-3 rounded-[1.25rem] border border-primary/14 bg-[#102f4d]/70 p-4 transition-all",
        href && "hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/8 hover:shadow-glow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{title}</p>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status}
          {href ? (
            <ArrowUpRight className="size-4 text-primary opacity-0 transition group-hover:opacity-100" />
          ) : null}
        </div>
      </div>

      {(meta && meta.length > 0) || highlight ? (
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-primary/10 pt-3">
          {meta && meta.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {meta.map((m, i) => (
                <div key={i}>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="text-sm text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <span />
          )}
          {highlight ? (
            <div className="text-right">
              {highlightLabel ? (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {highlightLabel}
                </p>
              ) : null}
              <p className="text-lg font-semibold text-primary">{highlight}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}
