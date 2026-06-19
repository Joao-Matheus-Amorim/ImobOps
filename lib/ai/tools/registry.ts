// Central registry of all AI tools. The chat route exposes only the tools allowed
// for the caller's role (see guard.ts).
import type { ToolDefinition } from "@/lib/types/ai";
import { clientTools } from "./clients.tools";
import { propertyTools } from "./properties.tools";
import { rentalTools } from "./rentals.tools";
import { salesTools } from "./sales.tools";
import { condoTools } from "./condos.tools";
import { crmTools } from "./crm.tools";
import { whatsappTools } from "./whatsapp.tools";

export const ALL_TOOLS: ToolDefinition[] = [
  ...clientTools,
  ...propertyTools,
  ...rentalTools,
  ...salesTools,
  ...condoTools,
  ...crmTools,
  ...whatsappTools,
];

const BY_NAME = new Map(ALL_TOOLS.map((t) => [t.name, t]));

export function getTool(name: string): ToolDefinition | undefined {
  return BY_NAME.get(name);
}

export function toolNames(): string[] {
  return ALL_TOOLS.map((t) => t.name);
}
