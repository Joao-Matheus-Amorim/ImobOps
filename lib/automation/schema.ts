import { S } from "@/lib/status";
import { z } from "zod";

export const automationTriggerSchema = z.object({
  kind: z.enum(["once", "daily", "weekly", "monthly", "interval_days", "charge_due"]),
  localDate: z.string().min(10).nullable().optional(),
  localTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  weekDays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
  monthDays: z.array(z.coerce.number().int().min(1).max(31)).optional(),
  intervalDays: z.coerce.number().int().min(1).nullable().optional(),
  chargeOffsetDays: z.coerce.number().int().nullable().optional(),
});

export const automationActionSchema = z.object({
  kind: z.enum([
    "create_client", "update_client", "create_property", "update_property",
    "create_rental_contract", "update_rental_contract", "create_charge_standalone",
    "create_charge_and_send_whatsapp",
    "create_charge_for_installment", "create_charge_for_condo_fee", "update_charge",
    "mark_charge_paid", "create_crm_lead", "update_crm_lead", "create_crm_activity",
    "schedule_visit", "create_sale_listing", "update_sale_listing", "create_sale_proposal",
    "move_sale_proposal", "create_sale_contract", "create_condo", "update_condo",
    "create_condo_unit", "generate_condo_fees", "create_condo_expense",
    "apportion_condo_expense", "create_condo_meeting",
  ]),
  targetId: z.string().min(1).nullable().optional(),
  payload: z.record(z.unknown()).default({}),
});

export const automationRuleInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da automação."),
  description: z.string().trim().nullable().optional(),
  status: z.enum([S.ACTIVE, S.PAUSED]).default(S.ACTIVE),
  trigger: automationTriggerSchema,
  action: automationActionSchema,
});

export const automationRulePatchSchema = automationRuleInputSchema.partial();
