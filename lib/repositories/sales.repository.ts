import type {
  SaleListing,
  Proposal,
  SaleContract,
  ProposalStatus,
} from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";

const listings = new Collection<SaleListing>("listings", "sale_listings");
const proposals = new Collection<Proposal>("proposals", "proposals");
const saleContracts = new Collection<SaleContract>("saleContracts", "sale_contracts");

export const salesRepository = {
  async listListings(ctx: RepoContext): Promise<SaleListing[]> {
    const rows = await listings.list(ctx);
    return rows.sort((a, b) => b.askingPrice - a.askingPrice);
  },

  getListing(ctx: RepoContext, id: string): Promise<SaleListing | null> {
    return listings.find(ctx, id);
  },

  createListing(
    ctx: RepoContext,
    data: Omit<SaleListing, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<SaleListing> {
    return listings.create(ctx, data);
  },

  updateListing(
    ctx: RepoContext,
    id: string,
    patch: Partial<SaleListing>,
  ): Promise<SaleListing | null> {
    return listings.update(ctx, id, patch);
  },

  // --- Proposals ---

  async listProposals(ctx: RepoContext, listingId?: string): Promise<Proposal[]> {
    const rows = await proposals.list(ctx, (p) =>
      listingId ? p.listingId === listingId : true,
    );
    return rows.sort((a, b) => b.offeredPrice - a.offeredPrice);
  },

  async registerProposal(
    ctx: RepoContext,
    data: Omit<Proposal, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<Proposal> {
    const p = await proposals.create(ctx, data);
    await listings.update(ctx, p.listingId, { status: "sob_proposta" });
    return p;
  },

  async moveProposal(
    ctx: RepoContext,
    id: string,
    status: ProposalStatus,
    note?: string,
  ): Promise<Proposal | null> {
    const p = await proposals.find(ctx, id);
    if (!p) return null;
    const history = [
      ...p.history,
      { at: new Date().toISOString(), by: "seller" as const, price: p.offeredPrice, note: note ?? null },
    ];
    return proposals.update(ctx, id, { status, history });
  },

  // --- Sale contracts ---

  listSaleContracts(ctx: RepoContext): Promise<SaleContract[]> {
    return saleContracts.list(ctx);
  },

  async closeSaleContract(
    ctx: RepoContext,
    data: Omit<SaleContract, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<SaleContract> {
    const contract = await saleContracts.create(ctx, data);
    await listings.update(ctx, contract.listingId, { status: "vendida" });
    return contract;
  },
};
