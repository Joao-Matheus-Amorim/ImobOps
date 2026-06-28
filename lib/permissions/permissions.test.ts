import { describe, it, expect } from "vitest";
import { can, enforceScope, resolvePermissions, PermissionError, permissionFor, scopeFor, filterAllowed, type Principal } from "./enforce";
import { isWithinScope, filterByScope } from "./scope";
import { defaultPermissionFor } from "./rules";
import { FEATURE_KEYS, type UserFeaturePermission } from "@/lib/types/permissions";

const admin: Principal = { id: "u-admin", role: "admin", teamMemberIds: [] };
const broker: Principal = { id: "u-broker", role: "broker", teamMemberIds: ["u-broker2"] };
const finance: Principal = { id: "u-fin", role: "finance", teamMemberIds: [] };
const viewer: Principal = { id: "u-view", role: "viewer", teamMemberIds: [] };

describe("role defaults", () => {
  it("admin can do everything", () => {
    expect(can(admin, "clients", "delete")).toBe(true);
    expect(can(admin, "finance", "edit")).toBe(true);
    expect(can(admin, "condos", "create")).toBe(true);
    expect(can(admin, "whatsapp", "delete")).toBe(true);
    expect(can(admin, "assistant", "view")).toBe(true);
  });

  it("broker can create own clients but only view rentals", () => {
    expect(can(broker, "clients", "create")).toBe(true);
    expect(can(broker, "rentals", "view")).toBe(true);
    expect(can(broker, "rentals", "edit")).toBe(false);
    expect(can(broker, "finance", "view")).toBe(false);
    expect(can(broker, "whatsapp", "create")).toBe(true);
    expect(can(broker, "reports", "view")).toBe(true);
  });

  it("finance manages money areas but only views clients", () => {
    expect(can(finance, "finance", "edit")).toBe(true);
    expect(can(finance, "repasses", "edit")).toBe(true);
    expect(can(finance, "clients", "view")).toBe(true);
    expect(can(finance, "clients", "edit")).toBe(false);
    expect(can(finance, "condo_fees", "create")).toBe(true);
    expect(can(finance, "commissions", "delete")).toBe(true);
  });

  it("viewer is view-only", () => {
    expect(can(viewer, "sales", "view")).toBe(true);
    expect(can(viewer, "sales", "create")).toBe(false);
    expect(can(viewer, "clients", "view")).toBe(true);
    expect(can(viewer, "clients", "edit")).toBe(false);
    expect(can(viewer, "condos", "view")).toBe(true);
  });

  it("manager role has wide access with view-only on some areas", () => {
    const manager: Principal = { id: "u-mgr", role: "manager", teamMemberIds: [] };
    expect(can(manager, "crm", "delete")).toBe(true);
    expect(can(manager, "sales", "create")).toBe(true);
    expect(can(manager, "finance", "view")).toBe(true);
    expect(can(manager, "finance", "edit")).toBe(false);
    expect(can(manager, "condos", "view")).toBe(true);
    expect(can(manager, "condos", "create")).toBe(false);
  });

  it("condo_admin has full condo access but view-only elsewhere", () => {
    const ca: Principal = { id: "u-ca", role: "condo_admin", teamMemberIds: [] };
    expect(can(ca, "condos", "delete")).toBe(true);
    expect(can(ca, "condo_fees", "create")).toBe(true);
    expect(can(ca, "condo_meetings", "edit")).toBe(true);
    expect(can(ca, "clients", "view")).toBe(true);
    expect(can(ca, "whatsapp", "view")).toBe(false);
  });
});

describe("overrides beat role", () => {
  it("grants a broker full finance access via override", () => {
    const overrides: UserFeaturePermission[] = [
      { userId: "u-broker", featureKey: "finance", actions: ["view", "create", "edit"], scope: "all" },
    ];
    const upgraded: Principal = { ...broker, overrides };
    expect(can(upgraded, "finance", "edit")).toBe(true);
    const set = resolvePermissions(upgraded);
    expect(set.permissions.find((p) => p.feature === "finance")?.scope).toBe("all");
  });

  it("can downgrade an admin feature via override", () => {
    const overrides: UserFeaturePermission[] = [
      { userId: "u-admin", featureKey: "clients", actions: ["view"], scope: "all" },
    ];
    const downgraded: Principal = { ...admin, overrides };
    expect(can(downgraded, "clients", "delete")).toBe(false);
    expect(can(downgraded, "clients", "view")).toBe(true);
  });

  it("empty overrides do not change defaults", () => {
    expect(resolvePermissions(broker).permissions.length).toBeGreaterThan(0);
    expect(resolvePermissions({ ...broker, overrides: [] }).permissions.length).toBeGreaterThan(0);
  });
});

describe("permissionFor and scopeFor", () => {
  it("permissionFor finds feature permission", () => {
    const p = permissionFor(admin, "clients");
    expect(p).toBeDefined();
    expect(p!.actions).toContain("delete");
  });

  it("permissionFor returns undefined for unknown feature", () => {
    const p = permissionFor(admin, "nonexistent" as never);
    expect(p).toBeUndefined();
  });

  it("scopeFor returns 'own' when no permission found", () => {
    expect(scopeFor(broker, "nonexistent" as never)).toBe("own");
  });

  it("scopeFor returns actual scope for known feature", () => {
    expect(scopeFor(broker, "clients")).toBe("own");
    expect(scopeFor(broker, "rentals")).toBe("own");
    expect(scopeFor(admin, "clients")).toBe("all");
  });
});

describe("scope checks", () => {
  it("own scope sees only own records", () => {
    expect(isWithinScope("own", "u1", [], { ownerUserId: "u1" })).toBe(true);
    expect(isWithinScope("own", "u1", [], { ownerUserId: "u2" })).toBe(false);
  });

  it("own scope matches assignedToUserId", () => {
    expect(isWithinScope("own", "u1", [], { assignedToUserId: "u1" })).toBe(true);
    expect(isWithinScope("own", "u1", [], { assignedToUserId: "u2" })).toBe(false);
  });

  it("own scope matches brokerUserId", () => {
    expect(isWithinScope("own", "u1", [], { brokerUserId: "u1" })).toBe(true);
  });

  it("own scope matches managerUserId", () => {
    expect(isWithinScope("own", "u1", [], { managerUserId: "u1" })).toBe(true);
  });

  it("team scope sees own + team members", () => {
    expect(isWithinScope("team", "u1", ["u2"], { ownerUserId: "u2" })).toBe(true);
    expect(isWithinScope("team", "u1", ["u2"], { ownerUserId: "u3" })).toBe(false);
  });

  it("team scope includes own records", () => {
    expect(isWithinScope("team", "u1", ["u2"], { ownerUserId: "u1" })).toBe(true);
  });

  it("all scope sees everything", () => {
    expect(isWithinScope("all", "u1", [], { ownerUserId: "u9" })).toBe(true);
  });

  it("null owner is not within own scope", () => {
    expect(isWithinScope("own", "u1", [], { ownerUserId: null })).toBe(false);
  });

  it("null owner is within team scope if not matched", () => {
    expect(isWithinScope("team", "u1", ["u2"], { ownerUserId: null })).toBe(false);
  });

  it("null owner is within all scope", () => {
    expect(isWithinScope("all", "u1", [], { ownerUserId: null })).toBe(true);
  });

  it("filterByScope narrows the list", () => {
    const recs = [{ ownerUserId: "u1" }, { ownerUserId: "u2" }, { ownerUserId: "u3" }];
    expect(filterByScope(recs, "own", "u1", []).length).toBe(1);
    expect(filterByScope(recs, "team", "u1", ["u2"]).length).toBe(2);
    expect(filterByScope(recs, "all", "u1", []).length).toBe(3);
  });
});

describe("enforceScope", () => {
  it("throws when action not allowed", () => {
    expect(() => enforceScope(broker, "finance", "edit")).toThrow(PermissionError);
    expect(() => enforceScope(broker, "finance", "edit")).toThrow("Permissão negada");
  });

  it("throws when record is out of scope", () => {
    expect(() =>
      enforceScope(broker, "clients", "edit", { ownerUserId: "someone-else" }),
    ).toThrow(PermissionError);
  });

  it("passes for own record within scope", () => {
    expect(() =>
      enforceScope(broker, "clients", "edit", { ownerUserId: "u-broker" }),
    ).not.toThrow();
  });

  it("admin passes regardless of owner", () => {
    expect(() =>
      enforceScope(admin, "clients", "delete", { ownerUserId: "anyone" }),
    ).not.toThrow();
  });

  it("admin passes without record", () => {
    expect(() => enforceScope(admin, "finance", "delete")).not.toThrow();
  });
});

describe("filterAllowed", () => {
  it("returns empty array if no view permission", () => {
    expect(filterAllowed(broker, "finance", [{ ownerUserId: "u1" }])).toEqual([]);
  });

  it("returns all records for all scope", () => {
    const recs = [{ ownerUserId: "u1" }, { ownerUserId: "u2" }];
    expect(filterAllowed(admin, "clients", recs).length).toBe(2);
  });

  it("filters by scope for non-all", () => {
    const recs = [{ ownerUserId: "u-broker" }, { ownerUserId: "someone-else" }];
    const result = filterAllowed(broker, "clients", recs);
    expect(result.length).toBe(1);
    expect(result[0].ownerUserId).toBe("u-broker");
  });

  it("respects allowedMemberIds in team scope", () => {
    const principal: Principal = { id: "u1", role: "broker", teamMemberIds: [], overrides: [{ userId: "u1", featureKey: "clients", actions: ["view"], scope: "team", allowedMemberIds: ["u2"] }] };
    expect(filterAllowed(principal, "clients", [{ ownerUserId: "u2" }, { ownerUserId: "u3" }]).length).toBe(1);
  });
});

describe("defaultPermissionFor", () => {
  it("returns permission for known role+feature", () => {
    const p = defaultPermissionFor("broker", "clients");
    expect(p).toBeDefined();
    expect(p!.actions).toContain("create");
  });

  it("returns undefined for unknown feature", () => {
    const p = defaultPermissionFor("broker", "nonexistent" as never);
    expect(p).toBeUndefined();
  });

  it("admin has delete on every feature", () => {
    FEATURE_KEYS.forEach((f) => {
      expect(can(admin, f, "delete")).toBe(true);
    });
  });
});


