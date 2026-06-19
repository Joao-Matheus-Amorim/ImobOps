import type { Property } from "@/lib/types/domain";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";

const now = "2026-06-01T12:00:00.000Z";

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

export const DEMO_CONDO_ID = "condo-00000001";

export const mockProperties: Property[] = [
  {
    ...base("property-00000001", DEMO_USERS.admin),
    kind: "apartamento",
    address: "Rua das Flores, 100, ap 51 — São Paulo/SP",
    areaM2: 78,
    bedrooms: 2,
    bathrooms: 2,
    parkingSpots: 1,
    ownerClientId: "client-00000001",
    status: "alugado",
    availability: "locacao",
    condoId: null,
    photos: [],
    description: "Apartamento de 2 dormitórios, bem ventilado, próximo ao metrô.",
  },
  {
    ...base("property-00000002", DEMO_USERS.broker),
    kind: "casa",
    address: "Rua dos Ipês, 250 — São Paulo/SP",
    areaM2: 180,
    bedrooms: 3,
    bathrooms: 3,
    parkingSpots: 2,
    ownerClientId: "client-00000001",
    status: "disponivel",
    availability: "venda",
    condoId: null,
    photos: [],
    description: "Casa térrea com quintal amplo, ideal para família.",
  },
  {
    ...base("property-00000003", DEMO_USERS.admin),
    kind: "apartamento",
    address: "Bloco A — 302, Cond. Jardim das Acácias",
    areaM2: 64,
    bedrooms: 2,
    bathrooms: 1,
    parkingSpots: 1,
    ownerClientId: "client-00000005",
    status: "disponivel",
    availability: "condominio_only",
    condoId: DEMO_CONDO_ID,
    photos: [],
    description: "Unidade de condomínio administrado.",
  },
];
