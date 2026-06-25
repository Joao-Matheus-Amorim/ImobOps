import { describe, it, expect } from "vitest";
import { computeLateCharge } from "./late-charges";

describe("computeLateCharge", () => {
  it("returns principal unchanged before the due date", () => {
    const b = computeLateCharge(1000, "2026-06-10", "2026-06-05", 2, 1);
    expect(b.daysLate).toBe(0);
    expect(b.total).toBe(1000);
    expect(b.fineAmount).toBe(0);
    expect(b.interestAmount).toBe(0);
  });

  it("returns principal unchanged on the due date", () => {
    const b = computeLateCharge(1000, "2026-06-10", "2026-06-10", 2, 1);
    expect(b.daysLate).toBe(0);
    expect(b.total).toBe(1000);
  });

  it("applies 2% fine + 1% a.m. pro rata after due date", () => {
    // 30 days late: fine 2% = 20; interest 1% * 30/30 = 10; total 1030
    const b = computeLateCharge(1000, "2026-06-10", "2026-07-10", 2, 1);
    expect(b.daysLate).toBe(30);
    expect(b.fineAmount).toBe(20);
    expect(b.interestAmount).toBe(10);
    expect(b.total).toBe(1030);
  });

  it("prorates interest by day", () => {
    // 15 days late: fine 20; interest 1% * 15/30 = 5; total 1025
    const b = computeLateCharge(1000, "2026-06-10", "2026-06-25", 2, 1);
    expect(b.daysLate).toBe(15);
    expect(b.interestAmount).toBe(5);
    expect(b.total).toBe(1025);
  });

  it("honors per-contract custom rates", () => {
    // 30 days late with 5% fine + 2% a.m.: fine 50; interest 20; total 1070
    const b = computeLateCharge(1000, "2026-06-10", "2026-07-10", 5, 2);
    expect(b.fineAmount).toBe(50);
    expect(b.interestAmount).toBe(20);
    expect(b.total).toBe(1070);
  });

  it("rounds to 2 decimals", () => {
    const b = computeLateCharge(2800, "2026-06-10", "2026-06-21", 2, 1);
    // 11 days: fine 56; interest 2800*0.01*11/30 = 10.2667 → 10.27
    expect(b.fineAmount).toBe(56);
    expect(b.interestAmount).toBe(10.27);
    expect(b.total).toBe(2866.27);
  });
});
