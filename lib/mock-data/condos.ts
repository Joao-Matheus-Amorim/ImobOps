import type {
  Condo,
  Unit,
  CondoFee,
  CondoExpense,
  CondoMeeting,
} from "@/lib/types/domain";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { DEMO_CONDO_ID } from "./properties";

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

export const mockCondos: Condo[] = [
  {
    ...base(DEMO_CONDO_ID),
    name: "Cond. Jardim das Acácias",
    address: "Rua das Acácias, 1500 — São Paulo/SP",
    unitCount: 4,
    managerUserId: DEMO_USERS.admin,
    adminFeePct: 6,
  },
];

export const mockUnits: Unit[] = [
  {
    ...base("unit-00000001"),
    condoId: DEMO_CONDO_ID,
    label: "Bloco A — 302",
    ownerClientId: "client-00000005",
    currentResidentClientId: "client-00000005",
    areaM2: 64,
    fractionPct: 25,
  },
  {
    ...base("unit-00000002"),
    condoId: DEMO_CONDO_ID,
    label: "Bloco A — 303",
    ownerClientId: "client-00000001",
    currentResidentClientId: "client-00000002",
    areaM2: 64,
    fractionPct: 25,
  },
  {
    ...base("unit-00000003"),
    condoId: DEMO_CONDO_ID,
    label: "Bloco B — 101",
    ownerClientId: "client-00000004",
    currentResidentClientId: null,
    areaM2: 72,
    fractionPct: 28,
  },
  {
    ...base("unit-00000004"),
    condoId: DEMO_CONDO_ID,
    label: "Bloco B — 102",
    ownerClientId: "client-00000003",
    currentResidentClientId: "client-00000003",
    areaM2: 56,
    fractionPct: 22,
  },
];

// One month of condo fees: a couple paid, one overdue.
export const mockCondoFees: CondoFee[] = mockUnits.map((u, idx) => ({
  ...base(`condofee-0000000${idx + 1}`),
  unitId: u.id,
  referenceMonth: "2026-06",
  dueDate: "2026-06-10",
  amount: 650,
  status: idx === 0 ? "atrasado" : idx === 3 ? "a_vencer" : "pago",
  paidAt: idx === 1 || idx === 2 ? "2026-06-08T10:00:00.000Z" : null,
  receiptDocumentId: null,
}));

export const mockCondoExpenses: CondoExpense[] = [
  {
    ...base("condoexp-00000001"),
    condoId: DEMO_CONDO_ID,
    referenceMonth: "2026-06",
    description: "Manutenção do elevador",
    totalAmount: 1200,
    apportionment: "fracao_ideal",
    status: "rateada",
  },
  {
    ...base("condoexp-00000002"),
    condoId: DEMO_CONDO_ID,
    referenceMonth: "2026-06",
    description: "Limpeza áreas comuns",
    totalAmount: 800,
    apportionment: "igual",
    status: "lancada",
  },
];

export const mockCondoMeetings: CondoMeeting[] = [
  {
    ...base("condomeet-00000001"),
    condoId: DEMO_CONDO_ID,
    date: "2026-07-15",
    kind: "ordinaria",
    summary: "Aprovação de contas e previsão orçamentária do semestre.",
    ataDocumentId: null,
  },
];
