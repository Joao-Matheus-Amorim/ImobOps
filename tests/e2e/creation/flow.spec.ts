import { expect, test } from "@playwright/test";
import { track, cleanupAll } from "../utils/cleanup";

const TAG = `[E2E ${Date.now()}]`;

test.describe.configure({ mode: "serial" });

test.describe("entity creation flow", () => {
  let ownerId: string;
  let tenantId: string;
  let buyerId: string;
  let propertyId: string;
  let rentalId: string;
  let listingId: string;

  test.afterAll(async () => {
    await cleanupAll();
  });

  test("1. create owner client via API", async ({ request }) => {
    const res = await request.post("/api/clients", {
      data: { kind: "pf", name: `${TAG} Proprietário`, phone: "(11) 99999-0001" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    ownerId = body.client.id;
    track("clients", ownerId);
  });

  test("2. create tenant client via API", async ({ request }) => {
    const res = await request.post("/api/clients", {
      data: { kind: "pf", name: `${TAG} Locatário`, phone: "(11) 99999-0002" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    tenantId = body.client.id;
    track("clients", tenantId);
  });

  test("3. create buyer client via API", async ({ request }) => {
    const res = await request.post("/api/clients", {
      data: { kind: "pj", name: `${TAG} Comprador Ltda`, document: "00.000.000/0001-00" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    buyerId = body.client.id;
    track("clients", buyerId);
  });

  test("4. create property via API linked to owner", async ({ request }) => {
    const res = await request.post("/api/properties", {
      data: {
        kind: "apartamento",
        address: `${TAG} Rua E2E, 123`,
        areaM2: 100,
        bedrooms: 3,
        bathrooms: 2,
        ownerClientId: ownerId,
        availability: "ambos",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    propertyId = body.property.id;
    track("properties", propertyId);
  });

  test("5. property appears on /properties page", async ({ page }) => {
    await page.goto("/properties");
    await expect(page.getByRole("heading", { name: /imóveis/i }).first()).toBeVisible();
    await expect(page.getByText(TAG, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("6. create rental via API", async ({ request }) => {
    const res = await request.post("/api/rentals", {
      data: {
        propertyId,
        tenantClientId: tenantId,
        monthlyValue: 2500,
        dueDay: 10,
        startDate: "2026-07-01",
        durationMonths: 12,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    rentalId = body.contract.id;
    track("rental_contracts", rentalId);
  });

  test("7. rental appears on /rentals page", async ({ page }) => {
    await page.goto("/rentals");
    await expect(page.getByRole("heading", { name: /locaç/i }).first()).toBeVisible();
    await expect(page.getByText(TAG, { exact: false }).first().or(page.getByText("R$ 2.500,00").first())).toBeVisible({ timeout: 10_000 });
  });

  test("8. create sale listing via API", async ({ request }) => {
    const res = await request.post("/api/sales/listings", {
      data: { propertyId, askingPrice: 500000, commissionPct: 5 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    listingId = body.listing.id;
    track("sales_listings", listingId);
  });

  test("9. sale listing appears on /sales page", async ({ page }) => {
    await page.goto("/sales");
    await expect(page.getByRole("heading", { name: /vendas|listagem/i }).first()).toBeVisible();
    await expect(page.getByText(TAG, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });
});
