import { describe, it, expect } from "vitest";
import { runTool } from "./confirm";
import type { ToolDefinition, ToolContext } from "@/lib/types/ai";
import { z } from "zod";

const ctx: ToolContext = { userId: "u1", tenancyId: "t1", role: "admin" };
const callId = "call-test";

const readTool = {
  name: "get_info",
  description: "Leitura",
  effect: "read" as const,
  feature: "clients" as const,
  action: "view" as const,
  schema: z.object({ id: z.string() }),
  allowedRoles: ["admin"],
  run: async (params: unknown, _ctx: ToolContext) => {
    const p = params as { id: string };
    return { id: p.id, name: "Cliente X" };
  },
} satisfies ToolDefinition;

const writeTool = {
  name: "create_item",
  description: "Escrita",
  effect: "write" as const,
  feature: "clients" as const,
  action: "create" as const,
  schema: z.object({ name: z.string().min(2) }),
  allowedRoles: ["admin"],
  run: async (params: unknown, _ctx: ToolContext) => {
    const p = params as { name: string };
    return { id: "new-1", name: p.name };
  },
  preview: async (params: unknown, _ctx: ToolContext) => {
    const p = params as { name: string };
    return `Criar "${p.name}"`;
  },
} satisfies ToolDefinition;

const writeToolNoPreview = {
  name: "delete_item",
  description: "Escrita sem preview",
  effect: "write" as const,
  feature: "clients" as const,
  action: "delete" as const,
  schema: z.object({ id: z.string() }),
  allowedRoles: ["admin"],
  run: async (params: unknown, _ctx: ToolContext) => {
    const p = params as { id: string };
    return { deleted: p.id };
  },
} satisfies ToolDefinition;

describe("runTool", () => {
  it("executa ferramenta read diretamente", async () => {
    const result = await runTool(readTool, { id: "c1" }, ctx, { confirm: true }, callId);
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.confirmed).toBe(true);
    expect(result.data).toEqual({ id: "c1", name: "Cliente X" });
  });

  it("retorna dry-run + preview para write sem confirm", async () => {
    const result = await runTool(writeTool, { name: "Novo" }, ctx, { confirm: false }, callId);
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.confirmed).toBe(false);
    expect(result.preview).toBe('Criar "Novo"');
  });

  it("executa write quando confirm=true", async () => {
    const result = await runTool(writeTool, { name: "Novo" }, ctx, { confirm: true }, callId);
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.confirmed).toBe(true);
    expect(result.data).toEqual({ id: "new-1", name: "Novo" });
  });

  it("gera preview padrao para write sem preview definido", async () => {
    const result = await runTool(writeToolNoPreview, { id: "x" }, ctx, { confirm: false }, callId);
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.preview).toContain("delete em clients");
    expect(result.preview).toContain("Confirme para executar");
  });

  it("retorna erro para parametros invalidos", async () => {
    const result = await runTool(readTool, { id: undefined }, ctx, { confirm: true }, callId);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
