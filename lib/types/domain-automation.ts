// Automation domain types

import { BaseEntity } from "./domain-base";

export type AutomationStatus = "active" | "paused";

export type AutomationTriggerKind =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "interval_days"
  | "charge_due";

export type AutomationActionKind =
  | "create_client"
  | "update_client"
  | "create_property"
  | "update_property"
  | "create_rental_contract"
  | "update_rental_contract"
  | "create_charge_standalone"
  | "create_charge_and_send_whatsapp"
  | "create_charge_for_installment"
  | "create_charge_for_condo_fee"
  | "update_charge"
  | "mark_charge_paid"
  | "create_crm_lead"
  | "update_crm_lead"
  | "create_crm_activity"
  | "schedule_visit"
  | "create_sale_listing"
  | "update_sale_listing"
  | "create_sale_proposal"
  | "move_sale_proposal"
  | "create_sale_contract"
  | "create_condo"
  | "update_condo"
  | "create_condo_unit"
  | "generate_condo_fees"
  | "create_condo_expense"
  | "apportion_condo_expense"
  | "create_condo_meeting";

export interface AutomationTriggerConfig {
  kind: AutomationTriggerKind;
  localDate?: string | null;
  localTime: string;
  weekDays?: number[];
  monthDays?: number[];
  intervalDays?: number | null;
  chargeOffsetDays?: number | null;
}

export interface AutomationActionConfig {
  kind: AutomationActionKind;
  targetId?: string | null;
  payload: Record<string, unknown>;
}

export interface AutomationRule extends BaseEntity {
  name: string;
  description: string | null;
  status: AutomationStatus;
  timezone: "America/Sao_Paulo";
  trigger: AutomationTriggerConfig;
  action: AutomationActionConfig;
  nextRunAt: string | null;
  lastRunAt: string | null;
}

export type AutomationRunStatus = "success" | "error" | "skipped";

export interface AutomationRun extends BaseEntity {
  ruleId: string;
  scheduledFor: string;
  startedAt: string;
  finishedAt: string | null;
  status: AutomationRunStatus;
  idempotencyKey: string;
  actionKind: AutomationActionKind;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
}
