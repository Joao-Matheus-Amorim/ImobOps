import type { Client, User } from "@/lib/types/domain";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";

const now = new Date().toISOString();

function base(id: string, ownerUserId: string | null) {
  return {
    id,
    tenancyId: DEMO_TENANCY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: DEMO_USERS.admin,
    ownerUserId,
  };
}

export const mockUsers: User[] = [
  {
    ...base(DEMO_USERS.admin, null),
    authUserId: null,
    role: "admin",
    displayName: "Ana Admin",
    avatarUrl: null,
    phone: "+5511999990001",
    email: "admin@imobops.demo",
    active: true,
  },
  {
    ...base(DEMO_USERS.broker, null),
    authUserId: null,
    role: "broker",
    displayName: "Bruno Corretor",
    avatarUrl: null,
    phone: "+5511999990002",
    email: "corretor@imobops.demo",
    active: true,
  },
  {
    ...base(DEMO_USERS.finance, null),
    authUserId: null,
    role: "finance",
    displayName: "Fabi Financeiro",
    avatarUrl: null,
    phone: "+5511999990003",
    email: "financeiro@imobops.demo",
    active: true,
  },
];

export const mockClients: Client[] = [
  {
    ...base("client-00000001", DEMO_USERS.admin),
    kind: "pf",
    name: "Carlos Locador Silva",
    document: "123.456.789-00",
    email: "carlos.locador@email.com",
    phone: "+5511988880001",
    whatsapp: "+5511988880001",
    address: "Rua das Flores, 100 — São Paulo/SP",
    tags: ["proprietário", "vip"],
    rolesInBusiness: ["locador", "vendedor"],
  },
  {
    ...base("client-00000002", DEMO_USERS.broker),
    kind: "pf",
    name: "Daniela Locatária Souza",
    document: "234.567.890-11",
    email: "daniela.souza@email.com",
    phone: "+5511988880002",
    whatsapp: "+5511988880002",
    address: "Av. Paulista, 2000 — São Paulo/SP",
    tags: ["inquilino"],
    rolesInBusiness: ["locatario"],
  },
  {
    ...base("client-00000003", DEMO_USERS.broker),
    kind: "pf",
    name: "Eduardo Fiador Lima",
    document: "345.678.901-22",
    email: "eduardo.lima@email.com",
    phone: "+5511988880003",
    whatsapp: null,
    address: "Rua Augusta, 500 — São Paulo/SP",
    tags: ["fiador"],
    rolesInBusiness: ["fiador"],
  },
  {
    ...base("client-00000004", DEMO_USERS.broker),
    kind: "pj",
    name: "Imobiliária Compradora Ltda",
    document: "12.345.678/0001-99",
    email: "contato@compradora.com.br",
    phone: "+5511988880004",
    whatsapp: "+5511988880004",
    address: "Av. Faria Lima, 3000 — São Paulo/SP",
    tags: ["comprador", "investidor"],
    rolesInBusiness: ["comprador", "lead"],
  },
  {
    ...base("client-00000005", DEMO_USERS.admin),
    kind: "pf",
    name: "Fernanda Condômina Rocha",
    document: "456.789.012-33",
    email: "fernanda.rocha@email.com",
    phone: "+5511988880005",
    whatsapp: "+5511988880005",
    address: "Bloco A — 302, Cond. Jardim das Acácias",
    tags: ["condômino"],
    rolesInBusiness: ["proprietario_condomino"],
  },
];
