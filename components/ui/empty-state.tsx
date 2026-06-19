import type { ReactNode } from "react";
import { Card } from "./card";

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      {icon ? (
        <div className="grid size-14 place-items-center rounded-2xl border border-primary/35 bg-primary/18 text-primary shadow-glow">
          {icon}
        </div>
      ) : null}
      <p className="font-display text-base font-semibold uppercase tracking-wide text-glow">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
    </Card>
  );
}
