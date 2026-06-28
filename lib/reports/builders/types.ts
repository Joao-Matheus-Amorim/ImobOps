// Shared types for report builders

import type { ReportDefinition } from "../definitions";

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
  properties: any[];
  clients: any[];
  rentals: any[];
  installments: any[];
  charges: any[];
  repasses: any[];
  commissions: any[];
  listings: any[];
  saleContracts: any[];
  proposals: any[];
  leads: any[];
  activities: any[];
  documents: any[];
  users: any[];
  condos: any[];
  condoUnits: any[];
  condoFees: any[];
  condoExpenses: any[];
  condoMeetings: any[];
  propertyById: Map<string, any>;
  clientById: Map<string, any>;
  rentalById: Map<string, any>;
  listingById: Map<string, any>;
  userById: Map<string, any>;
  condoById: Map<string, any>;
  condoUnitById: Map<string, any>;
}
