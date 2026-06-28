"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Minimal initials avatar (no image loading needed for mock mode).
export function Avatar({ name, className }: { name: string; className?: string }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary",
        className,
      )}
    >
      {mounted ? initials : ""}
    </div>
  );
}
