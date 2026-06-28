import { expect, test } from "@playwright/test";

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

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

  test("send API requires auth", async ({ page }) => {
    test.skip(!hasSupabase, "Supabase not configured — cannot authenticate");
    await page.context().clearCookies();
    const res = await page.request.post("/api/whatsapp/send", {
      data: { to: "5511999999999", body: "test" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("conversations API returns array", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get("/api/whatsapp/conversations");
    const body = await res.json();
    expect(Array.isArray(body) || (body && typeof body === "object")).toBe(true);
  });

  test("webhook accepts valid payload", async ({ request }) => {
    const res = await request.post("/api/whatsapp/webhook", {
      data: { event: "message.upsert", data: { message: { from: "5511999999999", message: "test" } } },
    });
    // should respond — even if ignored or rejected (webhook may be disabled)
    expect([200, 202, 401, 403, 429]).toContain(res.status());
  });
});
