import { describe, it, expect } from "vitest";
import { assertToolAllowed, allowedToolsFor, ToolDeniedError } from "./guard";
import { ALL_TOOLS, getTool } from "./tools/registry";
import type { Principal } from "@/lib/permissions/enforce";

const admin: Principal = { id: "u-admin", role: "admin", teamMemberIds: [] };
const broker: Principal = { id: "u-broker", role: "broker", teamMemberIds: [] };
const viewer: Principal = { id: "u-view", role: "viewer", teamMemberIds: [] };

describe("AI tool allowlist (MVP: admin only)", () => {
  it("admin may call a read tool", () => {
    const tool = getTool("search_clients")!;
    expect(() => assertToolAllowed(tool, admin)).not.toThrow();
  });

  it("admin may call a write tool", () => {
    const tool = getTool("create_client")!;
    expect(() => assertToolAllowed(tool, admin)).not.toThrow();
  });

  it("non-admin roles are denied", () => {
    const tool = getTool("search_clients")!;
    expect(() => assertToolAllowed(tool, broker)).toThrow(ToolDeniedError);
    expect(() => assertToolAllowed(tool, viewer)).toThrow(ToolDeniedError);
  });

  it("allowedToolsFor returns all tools for admin and none for others", () => {
    expect(allowedToolsFor(ALL_TOOLS, admin).length).toBe(ALL_TOOLS.length);
    expect(allowedToolsFor(ALL_TOOLS, broker).length).toBe(0);
  });
});

describe("registry sanity", () => {
  it("has all required tools registered", () => {
    const required = [
      "search_clients", "create_client", "update_client", "add_client_tag", "get_client",
      "search_properties", "create_property", "change_property_status",
      "create_rental_contract", "generate_installments", "mark_installment_paid", "compute_repasse", "list_overdue_rentals",
      "create_listing", "register_proposal", "move_proposal", "close_sale_contract", "record_commission_payment",
      "create_condo", "add_unit", "generate_condo_fees", "mark_condo_fee_paid", "register_condo_expense", "apportion_expense",
      "create_lead", "assign_lead", "move_lead_stage", "log_activity", "schedule_visit",
      "send_whatsapp_message", "send_whatsapp_template", "search_conversations",
      "create_automation_rule",
    ];
    for (const name of required) {
      expect(getTool(name), `tool ${name} ausente`).toBeDefined();
    }
  });

  it("every write tool declares a preview or default applies", () => {
    for (const t of ALL_TOOLS) {
      if (t.effect === "write") {
        expect(["create", "edit", "delete"]).toContain(t.action);
      }
    }
  });
});
