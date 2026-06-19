import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "./card";

export function ListItem({
  href,
  title,
  subtitle,
  trailing,
}: {
  href?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}) {
  const inner = (
    <Card className="flex items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/8 hover:shadow-glow-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">{title}</div>
        {subtitle ? <div className="truncate text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        {href ? <ChevronRight className="size-4 text-primary" /> : null}
      </div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
