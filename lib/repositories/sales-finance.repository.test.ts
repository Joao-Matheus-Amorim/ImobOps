import { describe, expect, it } from "vitest";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { financeRepository } from "./finance.repository";
import { rentalsRepository } from "./rentals.repository";
import { salesRepository } from "./sales.repository";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.admin };

function suffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function createPaidInstallment() {
  const contract = await rentalsRepository.create(ctx, {
    propertyId: "property-00000002",
    landlordClientId: "client-00000001",
    tenantClientId: "client-00000002",
    guarantorClientId: null,
    monthlyValue: 4000,
    dueDay: 12,
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    durationMonths: 1,
    indexType: "igpm",
    adminFeePct: 10,
    lateFeePct: 2,
    lateInterestPctMonth: 1,
    status: "ativo",
  });
  const [installment] = await rentalsRepository.generateInstallments(ctx, contract.id);
  expect(installment).toBeTruthy();
  await rentalsRepository.markInstallmentPaid(ctx, installment!.id, 4000);
  return { contract, installment: installment! };
}

describe("salesRepository", () => {
  it("registers proposals, moves proposal status and closes sales", async () => {
    const listing = await salesRepository.createListing(ctx, {
      propertyId: "property-00000002",
      askingPrice: 910000,
      status: "ativa",
      commissionPct: 5,
    });

    const proposal = await salesRepository.registerProposal(ctx, {
      listingId: listing.id,
      buyerClientId: "client-00000004",
      brokerUserId: DEMO_USERS.broker,
      offeredPrice: 875000,
      conditions: "Entrada e financiamento",
      status: "em_analise",
      history: [],
    });

    await expect(salesRepository.getListing(ctx, listing.id)).resolves.toMatchObject({
      status: "sob_proposta",
    });

    const moved = await salesRepository.moveProposal(ctx, proposal.id, "aceita", "Aceita pelo vendedor");
    expect(moved).toMatchObject({ status: "aceita" });
    expect(moved?.history.at(-1)).toMatchObject({
      by: "seller",
      price: 875000,
      note: "Aceita pelo vendedor",
    });

    const contract = await salesRepository.closeSaleContract(ctx, {
      listingId: listing.id,
      buyerClientId: "client-00000004",
      sellerClientId: "client-00000001",
      finalPrice: 880000,
      signedAt: "2026-07-01T10:00:00.000Z",
      paymentTerms: "À vista",
      status: "fechado",
    });

    expect(contract.finalPrice).toBe(880000);
    await expect(salesRepository.getListing(ctx, listing.id)).resolves.toMatchObject({
      status: "vendida",
    });
  });

  it("updates listings and returns null when moving an unknown proposal", async () => {
    const listing = await salesRepository.createListing(ctx, {
      propertyId: "property-00000002",
      askingPrice: 500000,
      status: "ativa",
      commissionPct: 4,
    });

    await expect(salesRepository.updateListing(ctx, listing.id, { askingPrice: 490000 })).resolves.toMatchObject({
      askingPrice: 490000,
    });
    await expect(salesRepository.moveProposal(ctx, `proposal-missing-${suffix()}`, "recusada")).resolves.toBeNull();
  });
});

describe("financeRepository", () => {
  it("computes repasse only for paid installments and is idempotent", async () => {
    const { contract, installment } = await createPaidInstallment();

    const first = await financeRepository.computeRepasse(
      ctx,
      contract.id,
      installment.referenceMonth,
    );
    const second = await financeRepository.computeRepasse(
      ctx,
      contract.id,
      installment.referenceMonth,
    );

    expect(first).toMatchObject({
      contractId: contract.id,
      referenceMonth: installment.referenceMonth,
      grossAmount: 4000,
      adminFeeAmount: 400,
      netAmount: 3600,
      status: "pendente",
    });
    expect(second?.id).toBe(first?.id);
  });

  it("marks repasses and commissions as paid", async () => {
    const { contract, installment } = await createPaidInstallment();
    const repasse = await financeRepository.computeRepasse(
      ctx,
      contract.id,
      installment.referenceMonth,
    );
    expect(repasse).toBeTruthy();

    await expect(financeRepository.markRepassePaid(ctx, repasse!.id)).resolves.toMatchObject({
      status: "pago",
    });

    const commission = await financeRepository.createCommission(ctx, {
      saleContractId: `sale-contract-${suffix()}`,
      brokerUserId: DEMO_USERS.broker,
      pct: 5,
      amount: 25000,
      status: "pendente",
      paidAt: null,
    });

    await expect(financeRepository.recordCommissionPayment(ctx, commission.id)).resolves.toMatchObject({
      status: "paga",
      amount: 25000,
    });
  });
});
