import { describe, it, expect } from "vitest";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { aiActionsRepository } from "@/lib/repositories/audit.repository";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.admin };
const otherCtx = { tenancyId: "tenancy-other", userId: DEMO_USERS.admin };

function suffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe("aiActionsRepository", () => {
  it("registra acao append-only com metadados", async () => {
    const prompt = `prompt-${suffix()}`;
    const entry = await aiActionsRepository.record(ctx, {
      userId: ctx.userId,
      prompt,
      toolName: "search_clients",
      toolParams: { query: "Maria" },
      dryRun: false,
      confirmed: true,
      result: { id: "c1", name: "Maria" },
      error: null,
    });

    expect(entry).toMatchObject({
      tenancyId: ctx.tenancyId,
      prompt,
      toolName: "search_clients",
      dryRun: false,
      confirmed: true,
    });
    expect(entry.id).toBeTruthy();
    expect(entry.at).toBeTruthy();
  });

  it("registra acao com erro e isola por tenancy", async () => {
    const prompt = `error-${suffix()}`;
    const entry = await aiActionsRepository.record(ctx, {
      userId: ctx.userId,
      prompt,
      toolName: "create_client",
      toolParams: { name: "" },
      dryRun: true,
      confirmed: false,
      result: null,
      error: "Parametros invalidos",
    });

    expect(entry).toMatchObject({ error: "Parametros invalidos", dryRun: true, confirmed: false });

    const all = await aiActionsRepository.list(ctx);
    expect(all).toEqual(expect.arrayContaining([expect.objectContaining({ id: entry.id })]));

    const other = await aiActionsRepository.list(otherCtx);
    expect(other).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: entry.id })]));
  });
});
