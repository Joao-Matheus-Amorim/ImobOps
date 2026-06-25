// Generic snake_case ↔ camelCase mapping between the Postgres rows (snake) and the
// domain types (camel). Used by SupabaseCollection so each repository keeps working
// in camelCase without hand-written column maps.

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

// DB row → domain object (snake keys → camel keys). Shallow: our rows are flat
// columns plus jsonb/array values that are already in the right shape.
export function rowToCamel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out as T;
}

// Domain object → DB row (camel keys → snake keys). Skips undefined so partial
// updates only touch provided columns.
export function camelToRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[toSnake(k)] = v;
  }
  return out;
}
