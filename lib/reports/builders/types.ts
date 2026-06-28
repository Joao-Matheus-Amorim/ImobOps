// Shared types for report builders

import { ReportDefinition } from "../definitions";
import {
  Property,
  Client,
  RentalContract,
  Installment,
  Charge,
  Repasse,
  Commission,
  SaleListing,
  SaleContract,
  Proposal,
  CrmLead,
  CrmActivity,
  DocumentRecord,
  User,
  Condo,
  Unit,
  CondoFee,
  CondoExpense,
  CondoMeeting,
} from "@/lib/types/domain";

export type ReportValue = string | number | null;

export interface ReportRowData {
  id: string;
  href?: string;
  values: Record<string, ReportValue>;
}

export interface BuiltReport {
  definition: ReportDefinition;
  generatedAt: string;
  totals: Record<string, number>;
  rows: ReportRowData[];
}

export interface ReportsDashboardData {
  generatedAt: string;
  overview: {
    kpis: Record<string, number>;
    alerts: ReportRowData[];
    executive: BuiltReport;
  };
  finance: {
    receivables: BuiltReport;
    overdue: BuiltReport;
    repasses: BuiltReport;
    commissions: BuiltReport;
  };
  rentals: {
    contracts: BuiltReport;
    expiring: BuiltReport;
    overdue: BuiltReport;
    availableProperties: BuiltReport;
  };
  sales: {
    listings: BuiltReport;
    contracts: BuiltReport;
    proposals: BuiltReport;
  };
  crm: {
    funnel: BuiltReport;
    activities: BuiltReport;
  };
  documents: {
    status: BuiltReport;
    expiring: BuiltReport;
  };
  condos: {
    fees: BuiltReport;
    expenses: BuiltReport;
    meetings: BuiltReport;
  };
}

// Contexto rico para os builders (dados + lookups)
export interface ReportsContext {
  today: string;
  todayMonth: string;
  properties: Property[];
  clients: Client[];
  rentals: RentalContract[];
  installments: Installment[];
  charges: Charge[];
  repasses: Repasse[];
  commissions: Commission[];
  listings: SaleListing[];
  saleContracts: SaleContract[];
  proposals: Proposal[];
  leads: CrmLead[];
  activities: CrmActivity[];
  documents: DocumentRecord[];
  users: User[];
  condos: Condo[];
  condoUnits: Unit[];
  condoFees: CondoFee[];
  condoExpenses: CondoExpense[];
  condoMeetings: CondoMeeting[];
  propertyById: Map<string, Property>;
  clientById: Map<string, Client>;
  rentalById: Map<string, RentalContract>;
  listingById: Map<string, SaleListing>;
  userById: Map<string, User>;
  condoById: Map<string, Condo>;
  condoUnitById: Map<string, Unit>;
}
