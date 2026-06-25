import { describe, expect, it } from "vitest";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { clientsRepository } from "./clients.repository";
import { propertiesRepository } from "./properties.repository";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.admin };
const otherCtx = { tenancyId: "tenancy-test-other", userId: DEMO_USERS.admin };

function suffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe("clientsRepository", () => {
  it("creates, updates, searches and removes a client within the tenancy", async () => {
    const id = suffix();
    const created = await clientsRepository.create(ctx, {
      kind: "pf",
      name: `Cliente Teste ${id}`,
      document: `doc-${id}`,
      email: `cliente-${id}@example.com`,
      phone: "11999990000",
      whatsapp: "11999990000",
      address: "Rua Teste, 100",
      tags: [],
      rolesInBusiness: ["lead"],
      ownerUserId: DEMO_USERS.broker,
    });

    expect(await clientsRepository.get(ctx, created.id)).toMatchObject({
      name: created.name,
      tenancyId: ctx.tenancyId,
    });
    expect(await clientsRepository.get(otherCtx, created.id)).toBeNull();

    await expect(clientsRepository.list(ctx, id)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );

    await clientsRepository.addTag(ctx, created.id, "vip");
    await clientsRepository.addTag(ctx, created.id, "vip");
    await clientsRepository.addBusinessRole(ctx, created.id, "comprador");
    const updated = await clientsRepository.update(ctx, created.id, { phone: "11888880000" });

    expect(updated?.tags.filter((tag) => tag === "vip")).toHaveLength(1);
    expect(updated?.rolesInBusiness).toContain("comprador");
    expect(updated?.phone).toBe("11888880000");

    await expect(clientsRepository.remove(ctx, created.id)).resolves.toBe(true);
    await expect(clientsRepository.get(ctx, created.id)).resolves.toBeNull();
  });

  it("returns unique rows from byIds and handles empty input", async () => {
    const [client] = await clientsRepository.list(ctx);
    expect(client).toBeTruthy();

    await expect(clientsRepository.byIds(ctx, [])).resolves.toEqual([]);
    await expect(clientsRepository.byIds(ctx, [client!.id, client!.id])).resolves.toEqual([
      expect.objectContaining({ id: client!.id }),
    ]);
  });
});

describe("propertiesRepository", () => {
  it("creates, updates status, filters by condo and isolates tenancy reads", async () => {
    const id = suffix();
    const created = await propertiesRepository.create(ctx, {
      kind: "apartamento",
      address: `Rua Propriedade ${id}`,
      areaM2: 55,
      bedrooms: 2,
      bathrooms: 1,
      parkingSpots: 1,
      ownerClientId: "client-00000001",
      status: "disponivel",
      availability: "condominio_only",
      condoId: "condo-00000001",
      photos: [],
      description: "Unidade criada em teste",
      ownerUserId: DEMO_USERS.admin,
    });

    await expect(propertiesRepository.get(ctx, created.id)).resolves.toMatchObject({
      address: created.address,
    });
    await expect(propertiesRepository.get(otherCtx, created.id)).resolves.toBeNull();

    await propertiesRepository.update(ctx, created.id, { description: "Descrição editada" });
    const sold = await propertiesRepository.changeStatus(ctx, created.id, "vendido");
    expect(sold).toMatchObject({ status: "vendido", description: "Descrição editada" });

    await expect(propertiesRepository.list(ctx, id)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );
    await expect(propertiesRepository.byCondo(ctx, "condo-00000001")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );
  });
});
