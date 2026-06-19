import type {
  SaleListing,
  Proposal,
  SaleContract,
  Commission,
} from "@/lib/types/domain";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";

const now = "2026-06-01T12:00:00.000Z";

function base(id: string) {
  return {
    id,
    tenancyId: DEMO_TENANCY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: DEMO_USERS.admin,
  };
}

export const mockListings: SaleListing[] = [
  {
    ...base("listing-00000001"),
    propertyId: "property-00000002",
    askingPrice: 850000,
    status: "sob_proposta",
    commissionPct: 5,
  },
];

export const mockProposals: Proposal[] = [
  {
    ...base("proposal-00000001"),
    listingId: "listing-00000001",
    buyerClientId: "client-00000004",
    brokerUserId: DEMO_USERS.broker,
    offeredPrice: 800000,
    conditions: "Entrada de 30%, financiamento bancário do saldo.",
    status: "contraproposta",
    history: [
      { at: "2026-05-20T12:00:00.000Z", by: "buyer", price: 780000, note: "Proposta inicial" },
      { at: "2026-05-22T12:00:00.000Z", by: "seller", price: 830000, note: "Contraproposta do vendedor" },
      { at: "2026-05-25T12:00:00.000Z", by: "buyer", price: 800000, note: "Nova proposta" },
    ],
  },
];

export const mockSaleContracts: SaleContract[] = [];

export const mockCommissions: Commission[] = [];
