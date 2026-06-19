import { cn } from "@/lib/utils";
import { Card } from "./card";

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "success" | "warning" | "destructive" | "gold";
  // Optional sparkline values (0..1 normalized or raw — auto-scaled).
  spark?: number[];
}

const accentText: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-foreground",
  success: "text-[hsl(var(--success))]",
  warning: "text-[hsl(var(--warning))]",
  destructive: "text-destructive",
  gold: "text-gold",
};

// Build an SVG polyline path from values, scaled to a 100x28 viewbox.
function sparkPath(values: number[]): string {
  if (values.length < 2) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = 100 / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = 28 - ((v - min) / range) * 24 - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function StatCard({ label, value, hint, accent = "default", spark }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden p-4">
      <p className="section-label text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-bold", accentText[accent])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      {spark && spark.length > 1 ? (
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-7 w-full opacity-60"
          viewBox="0 0 100 28"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={sparkPath(spark)}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
    </Card>
  );
}
