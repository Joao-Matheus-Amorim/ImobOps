// Aggregates all mock data into a single mutable in-memory store. The mock
// repositories read and mutate this store so the app behaves like a real backend
// without any environment variables.

import type {
  Client,
  Property,
  RentalContract,
  Installment,
  Repasse,
  Charge,
  ChargeReminder,
  SaleListing,
  Proposal,
  SaleContract,
  Commission,
  Condo,
  Unit,
  CondoFee,
  CondoExpense,
  CondoMeeting,
  CrmLead,
  CrmActivity,
  WhatsAppConversation,
  WhatsAppMessage,
  User,
  DocumentRecord,
  AuditLogEntry,
  AiActionEntry,
} from "@/lib/types/domain";

import { mockClients, mockUsers } from "./clients";
import { mockProperties } from "./properties";
import { mockRentalContracts, mockInstallments } from "./rentals";
import { mockRepasses } from "./finance";
import { mockCharges, mockChargeReminders } from "./billing";
import {
  mockListings,
  mockProposals,
  mockSaleContracts,
  mockCommissions,
} from "./sales";
import {
  mockCondos,
  mockUnits,
  mockCondoFees,
  mockCondoExpenses,
  mockCondoMeetings,
} from "./condos";
import { mockLeads, mockActivities } from "./crm";
import { mockConversations, mockMessages } from "./whatsapp";

export interface MockStore {
  users: User[];
  clients: Client[];
  properties: Property[];
  documents: DocumentRecord[];
  rentalContracts: RentalContract[];
  installments: Installment[];
  repasses: Repasse[];
  charges: Charge[];
  chargeReminders: ChargeReminder[];
  listings: SaleListing[];
  proposals: Proposal[];
  saleContracts: SaleContract[];
  commissions: Commission[];
  condos: Condo[];
  units: Unit[];
  condoFees: CondoFee[];
  condoExpenses: CondoExpense[];
  condoMeetings: CondoMeeting[];
  leads: CrmLead[];
  activities: CrmActivity[];
  conversations: WhatsAppConversation[];
  messages: WhatsAppMessage[];
  auditLog: AuditLogEntry[];
  aiActions: AiActionEntry[];
}

// Build a fresh store from seed (deep-ish clone so mutations don't leak to seed).
function buildStore(): MockStore {
  return {
    users: [...mockUsers],
    clients: [...mockClients],
    properties: [...mockProperties],
    documents: [],
    rentalContracts: [...mockRentalContracts],
    installments: [...mockInstallments],
    repasses: [...mockRepasses],
    charges: [...mockCharges],
    chargeReminders: [...mockChargeReminders],
    listings: [...mockListings],
    proposals: [...mockProposals],
    saleContracts: [...mockSaleContracts],
    commissions: [...mockCommissions],
    condos: [...mockCondos],
    units: [...mockUnits],
    condoFees: [...mockCondoFees],
    condoExpenses: [...mockCondoExpenses],
    condoMeetings: [...mockCondoMeetings],
    leads: [...mockLeads],
    activities: [...mockActivities],
    conversations: [...mockConversations],
    messages: [...mockMessages],
    auditLog: [],
    aiActions: [],
  };
}

// Singleton store reused across requests in dev (module-level cache).
declare global {
  // eslint-disable-next-line no-var
  var __imobopsStore: MockStore | undefined;
}

export const store: MockStore = globalThis.__imobopsStore ?? buildStore();
if (process.env.NODE_ENV !== "production") {
  globalThis.__imobopsStore = store;
}

export {
  mockUsers,
  mockClients,
  mockProperties,
  mockRentalContracts,
  mockInstallments,
  mockRepasses,
  mockListings,
  mockProposals,
  mockCondos,
  mockUnits,
  mockCondoFees,
  mockLeads,
  mockActivities,
  mockConversations,
  mockMessages,
};
