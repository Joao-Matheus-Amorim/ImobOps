import { z } from "zod";
import { defineTool, repoCtx } from "./helpers";
import { clientsRepository } from "@/lib/repositories/clients.repository";

export const clientTools = [
  defineTool({
    name: "search_clients",
    description: "Busca clientes por nome, documento, e-mail ou telefone.",
    effect: "read",
    feature: "clients",
    action: "view",
    schema: z.object({ query: z.string().describe("Termo de busca").optional() }),
    run: async ({ query }, ctx) => clientsRepository.list(repoCtx(ctx), query),
  }),

  defineTool({
    name: "get_client",
    description: "Obtém um cliente pelo id.",
    effect: "read",
    feature: "clients",
    action: "view",
    schema: z.object({ id: z.string() }),
    run: async ({ id }, ctx) => clientsRepository.get(repoCtx(ctx), id),
  }),

  defineTool({
    name: "create_client",
    description: "Cria um novo cliente (pessoa física ou jurídica).",
    effect: "write",
    feature: "clients",
    action: "create",
    schema: z.object({
      kind: z.enum(["pf", "pj"]),
      name: z.string().min(2),
      document: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
    }),
    run: async (p, ctx) => {
      const rctx = repoCtx(ctx);
      // Reject duplicates (same CPF/CNPJ, phone/whatsapp, or name+phone).
      const dup = await clientsRepository.findDuplicate(rctx, {
        name: p.name,
        document: p.document ?? null,
        phone: p.phone ?? null,
        whatsapp: p.whatsapp ?? null,
      });
      if (dup) {
        throw new Error(`Já existe um cliente com estes dados (${dup.name}). Não foi criado um duplicado.`);
      }
      return clientsRepository.create(rctx, {
        kind: p.kind,
        name: p.name,
        document: p.document ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
        whatsapp: p.whatsapp ?? null,
        address: null,
        tags: [],
        rolesInBusiness: [],
        ownerUserId: ctx.userId,
      });
    },
    preview: async (p) => `Criar cliente "${p.name}" (${p.kind.toUpperCase()}).`,
  }),

  defineTool({
    name: "update_client",
    description: "Atualiza dados de um cliente existente.",
    effect: "write",
    feature: "clients",
    action: "edit",
    schema: z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    }),
    run: async ({ id, ...patch }, ctx) => clientsRepository.update(repoCtx(ctx), id, patch),
    preview: async ({ id }) => `Atualizar cliente ${id}.`,
  }),

  defineTool({
    name: "add_client_tag",
    description: "Adiciona uma tag a um cliente.",
    effect: "write",
    feature: "clients",
    action: "edit",
    schema: z.object({ id: z.string(), tag: z.string() }),
    run: async ({ id, tag }, ctx) => clientsRepository.addTag(repoCtx(ctx), id, tag),
    preview: async ({ id, tag }) => `Adicionar tag "${tag}" ao cliente ${id}.`,
  }),
];
