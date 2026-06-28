import { expect, test } from "@playwright/test";

test.describe("WhatsApp", () => {
  test("page loads inbox", async ({ page }) => {
    await page.goto("/whatsapp");
    await expect(page).toHaveURL(/\/whatsapp$/);
    await expect(page.getByText("WhatsApp", { exact: false }).first()).toBeVisible();
  });

  test("send API rejects missing fields", async ({ request }) => {
    const res = await request.post("/api/whatsapp/send", {
      data: { to: "", body: "" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Informe body ou templateKey");
  });

  test("send API rejects short number", async ({ request }) => {
    const res = await request.post("/api/whatsapp/send", {
      data: { to: "12", body: "test" },
    });
    expect(res.status()).toBe(400);
  });

  test("send API requires auth", async ({ request }) => {
    // use no cookie / explicit unauthenticated request
    const res = await request.post("/api/whatsapp/send", {
      data: { to: "5511999999999", body: "test" },
      headers: { cookie: "" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("conversations API returns array", async ({ request }) => {
    const res = await request.get("/api/whatsapp/conversations");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("webhook accepts valid payload", async ({ request }) => {
    const res = await request.post("/api/whatsapp/webhook", {
      data: { event: "message.upsert", data: { message: { from: "5511999999999", message: "test" } } },
    });
    // should be ok (even if ignored)
    expect(res.ok()).toBeTruthy();
  });
});
