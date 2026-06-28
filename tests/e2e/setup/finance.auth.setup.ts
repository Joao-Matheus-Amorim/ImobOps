import { test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { financeAuthFile, loginAs } from "../utils/auth";
import { ensureE2EUser } from "../utils/supabase-seed";

setup("authenticate as finance", async ({ page }) => {
  await mkdir(dirname(financeAuthFile), { recursive: true });
  await ensureE2EUser("finance");
  await loginAs(page, "finance");
  await page.context().storageState({ path: financeAuthFile });
});
