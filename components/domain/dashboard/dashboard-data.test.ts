import { describe, expect, it } from "vitest";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { buildDashboardData } from "./dashboard-data";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.admin };

describe("buildDashboardData", () => {
  it("returns all expected metrics from mock store", async () => {
    const data = await buildDashboardData(ctx);

    expect(data.propertyCount).toBe(3);
    expect(data.clientCount).toBe(5);
    expect(data.rentalCount).toBe(1);
    expect(data.leadCount).toBe(4);
    expect(data.rentedCount).toBe(1);
    expect(data.occupancyPct).toBe(33);
    expect(data.availableProperties).toBe(2);
    expect(data.myLeads).toBe(1);

    expect(data.chargesTodayCount).toBe(0);
    expect(data.overdueChargesCount).toBe(1);
    expect(data.unreadConversationsCount).toBe(2);
    expect(data.pendingRepassesCount).toBe(2);
    expect(data.expiringRentalsCount).toBe(0);
    expect(data.activitiesTodayCount).toBe(0);
    expect(data.recentClientsCount).toBe(5);
    expect(data.failedAutomationsCount).toBe(0);
  });

  it("isolates data by tenancy", async () => {
    const otherCtx = { tenancyId: "tenancy-other", userId: DEMO_USERS.admin };
    const data = await buildDashboardData(otherCtx);

    expect(data.propertyCount).toBe(0);
    expect(data.clientCount).toBe(0);
    expect(data.rentalCount).toBe(0);
    expect(data.leadCount).toBe(0);
    expect(data.chargesTodayCount).toBe(0);
    expect(data.overdueChargesCount).toBe(0);
    expect(data.unreadConversationsCount).toBe(0);
  });

  it("returns overdue list with at least one entry", async () => {
    const data = await buildDashboardData(ctx);
    expect(data.overdue.length).toBeGreaterThanOrEqual(1);
    expect(data.overdue[0].amount).toBeGreaterThan(0);
    expect(data.overdue[0].dueDate).toBeTruthy();
  });

  it("returns funnel with all stages", async () => {
    const data = await buildDashboardData(ctx);
    expect(data.funnel.length).toBe(6);
    const totalLeads = data.funnel.reduce((s, f) => s + f.count, 0);
    expect(totalLeads).toBe(data.leadCount);
  });

  it("returns financial metrics", async () => {
    const data = await buildDashboardData(ctx);
    expect(data.gmvMonth).toBeGreaterThan(0);
    expect(data.receivableMonth).toBeGreaterThan(0);
    expect(data.overdueAmount).toBeGreaterThan(0);
    expect(data.pendingRepasses).toBeGreaterThan(0);
  });
});
