import { describe, it, expect } from "vitest";
import { can, enforceScope, resolvePermissions, PermissionError, type Principal } from "./enforce";
import { isWithinScope, filterByScope } from "./scope";
import type { UserFeaturePermission } from "@/lib/types/permissions";

const admin: Principal = { id: "u-admin", role: "admin", teamMemberIds: [] };
const broker: Principal = { id: "u-broker", role: "broker", teamMemberIds: ["u-broker2"] };
const finance: Principal = { id: "u-fin", role: "finance", teamMemberIds: [] };
const viewer: Principal = { id: "u-view", role: "viewer", teamMemberIds: [] };

describe("role defaults", () => {
  it("admin can do everything", () => {
    expect(can(admin, "clients", "delete")).toBe(true);
    expect(can(admin, "finance", "edit")).toBe(true);
    expect(can(admin, "condos", "create")).toBe(true);
  });

  it("broker can create own clients but only view rentals", () => {
    expect(can(broker, "clients", "create")).toBe(true);
    expect(can(broker, "rentals", "view")).toBe(true);
    expect(can(broker, "rentals", "edit")).toBe(false);
    expect(can(broker, "finance", "view")).toBe(false);
  });

  it("finance manages money areas but only views clients", () => {
    expect(can(finance, "finance", "edit")).toBe(true);
    expect(can(finance, "repasses", "edit")).toBe(true);
    expect(can(finance, "clients", "view")).toBe(true);
    expect(can(finance, "clients", "edit")).toBe(false);
  });

  it("viewer is view-only", () => {
    expect(can(viewer, "sales", "view")).toBe(true);
    expect(can(viewer, "sales", "create")).toBe(false);
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
});

describe("scope checks", () => {
  it("own scope sees only own records", () => {
    expect(isWithinScope("own", "u1", [], { ownerUserId: "u1" })).toBe(true);
    expect(isWithinScope("own", "u1", [], { ownerUserId: "u2" })).toBe(false);
  });

  it("team scope sees own + team members", () => {
    expect(isWithinScope("team", "u1", ["u2"], { ownerUserId: "u2" })).toBe(true);
    expect(isWithinScope("team", "u1", ["u2"], { ownerUserId: "u3" })).toBe(false);
  });

  it("all scope sees everything", () => {
    expect(isWithinScope("all", "u1", [], { ownerUserId: "u9" })).toBe(true);
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
});
