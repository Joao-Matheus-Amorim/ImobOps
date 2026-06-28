import { test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { brokerAuthFile, loginAs } from "../utils/auth";
import { ensureE2EUser } from "../utils/supabase-seed";

setup("authenticate as broker", async ({ page }) => {
  await mkdir(dirname(brokerAuthFile), { recursive: true });
  await ensureE2EUser("broker");
  await loginAs(page, "broker");
  await page.context().storageState({ path: brokerAuthFile });
});
