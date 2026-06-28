// Sale domain types: listings, proposals, contracts, commissions

import { BaseEntity } from "./domain-base";

export type ListingStatus = "ativa" | "sob_proposta" | "vendida" | "cancelada";

export interface SaleListing extends BaseEntity {
  propertyId: string;
  askingPrice: number;
  status: ListingStatus;
  commissionPct: number;
}

export type ProposalStatus =
  | "em_analise"
  | "contraproposta"
  | "aceita"
  | "recusada";

export interface ProposalRound {
  at: string;
  by: "buyer" | "seller";
  price: number;
  note: string | null;
}

export interface Proposal extends BaseEntity {
  listingId: string;
  buyerClientId: string;
  brokerUserId: string;
  offeredPrice: number;
  conditions: string | null;
  status: ProposalStatus;
  history: ProposalRound[];
}

export type SaleContractStatus = "em_andamento" | "fechado" | "cancelado";

export interface SaleContract extends BaseEntity {
  listingId: string;
  buyerClientId: string;
  sellerClientId: string;
  finalPrice: number;
  signedAt: string | null;
  paymentTerms: string | null;
  status: SaleContractStatus;
}

export type CommissionStatus = "pendente" | "paga";

export interface Commission extends BaseEntity {
  saleContractId: string;
  brokerUserId: string;
  pct: number;
  amount: number;
  status: CommissionStatus;
  paidAt: string | null;
}
