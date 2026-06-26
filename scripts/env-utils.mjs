import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function parseEnvFile(path) {
  if (!existsSync(path)) return { exists: false, values: {}, raw: "" };
  const raw = readFileSync(path, "utf8");
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return { exists: true, values, raw };
}

export function readRootEnv() {
  return parseEnvFile(join(process.cwd(), ".env"));
}

export function requireEnv(env, keys) {
  const missing = keys.filter((key) => !env.values[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
}

export function normalizePublicUrl(url) {
  return url.replace(/\/+$/, "");
}
