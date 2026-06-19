import type {
  SaleListing,
  Proposal,
  SaleContract,
  ProposalStatus,
} from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";

const listings = new MockCollection<SaleListing>("listings");
const proposals = new MockCollection<Proposal>("proposals");
const saleContracts = new MockCollection<SaleContract>("saleContracts");

export const salesRepository = {
  listListings(ctx: RepoContext): SaleListing[] {
    return listings.list(ctx).sort((a, b) => b.askingPrice - a.askingPrice);
  },

  getListing(ctx: RepoContext, id: string): SaleListing | null {
    return listings.find(ctx, id);
  },

  createListing(ctx: RepoContext, data: Omit<SaleListing, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): SaleListing {
    return listings.create(ctx, data);
  },

  // --- Proposals ---

  listProposals(ctx: RepoContext, listingId?: string): Proposal[] {
    return proposals
      .list(ctx, (p) => (listingId ? p.listingId === listingId : true))
      .sort((a, b) => b.offeredPrice - a.offeredPrice);
  },

  registerProposal(ctx: RepoContext, data: Omit<Proposal, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): Proposal {
    const p = proposals.create(ctx, data);
    listings.update(ctx, p.listingId, { status: "sob_proposta" });
    return p;
  },

  moveProposal(ctx: RepoContext, id: string, status: ProposalStatus, note?: string): Proposal | null {
    const p = proposals.find(ctx, id);
    if (!p) return null;
    const history = [
      ...p.history,
      { at: new Date().toISOString(), by: "seller" as const, price: p.offeredPrice, note: note ?? null },
    ];
    return proposals.update(ctx, id, { status, history });
  },

  // --- Sale contracts ---

  listSaleContracts(ctx: RepoContext): SaleContract[] {
    return saleContracts.list(ctx);
  },

  closeSaleContract(ctx: RepoContext, data: Omit<SaleContract, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): SaleContract {
    const contract = saleContracts.create(ctx, data);
    listings.update(ctx, contract.listingId, { status: "vendida" });
    return contract;
  },
};
