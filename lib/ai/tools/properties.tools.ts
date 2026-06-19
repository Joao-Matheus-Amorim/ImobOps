import { z } from "zod";
import { defineTool, repoCtx } from "./helpers";
import { propertiesRepository } from "@/lib/repositories/properties.repository";

const kind = z.enum(["apartamento", "casa", "comercial", "terreno", "sala"]);
const status = z.enum(["disponivel", "alugado", "vendido", "em_obra", "inativo"]);
const availability = z.enum(["locacao", "venda", "ambos", "condominio_only"]);

export const propertyTools = [
  defineTool({
    name: "search_properties",
    description: "Busca imóveis por endereço, descrição ou tipo.",
    effect: "read",
    feature: "properties",
    action: "view",
    schema: z.object({ query: z.string().optional() }),
    run: async ({ query }, ctx) => propertiesRepository.list(repoCtx(ctx), query),
  }),

  defineTool({
    name: "get_property",
    description: "Obtém um imóvel pelo id.",
    effect: "read",
    feature: "properties",
    action: "view",
    schema: z.object({ id: z.string() }),
    run: async ({ id }, ctx) => propertiesRepository.get(repoCtx(ctx), id),
  }),

  defineTool({
    name: "create_property",
    description: "Cadastra um novo imóvel.",
    effect: "write",
    feature: "properties",
    action: "create",
    schema: z.object({
      kind,
      address: z.string().min(3),
      availability,
      areaM2: z.number().optional(),
      bedrooms: z.number().optional(),
      ownerClientId: z.string().optional(),
    }),
    run: async (p, ctx) =>
      propertiesRepository.create(repoCtx(ctx), {
        kind: p.kind,
        address: p.address,
        availability: p.availability,
        areaM2: p.areaM2 ?? null,
        bedrooms: p.bedrooms ?? null,
        bathrooms: null,
        parkingSpots: null,
        ownerClientId: p.ownerClientId ?? null,
        status: "disponivel",
        condoId: null,
        photos: [],
        description: null,
        ownerUserId: ctx.userId,
      }),
    preview: async (p) => `Cadastrar imóvel "${p.address}" (${p.kind}).`,
  }),

  defineTool({
    name: "update_property",
    description: "Atualiza dados de um imóvel.",
    effect: "write",
    feature: "properties",
    action: "edit",
    schema: z.object({
      id: z.string(),
      address: z.string().optional(),
      description: z.string().optional(),
    }),
    run: async ({ id, ...patch }, ctx) => propertiesRepository.update(repoCtx(ctx), id, patch),
    preview: async ({ id }) => `Atualizar imóvel ${id}.`,
  }),

  defineTool({
    name: "change_property_status",
    description: "Altera o status de um imóvel.",
    effect: "write",
    feature: "properties",
    action: "edit",
    schema: z.object({ id: z.string(), status }),
    run: async ({ id, status: s }, ctx) => propertiesRepository.changeStatus(repoCtx(ctx), id, s),
    preview: async ({ id, status: s }) => `Mudar status do imóvel ${id} para "${s}".`,
  }),
];
