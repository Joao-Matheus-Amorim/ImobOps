import type { ReactNode } from "react";

export function PageHeader({
  badge,
  title,
  description,
  action,
}: {
  badge?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {badge ? (
          <span className="pill-badge mb-3">
            <span className="size-1.5 rounded-full bg-primary shadow-glow-sm" />
            {badge}
          </span>
        ) : null}
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
