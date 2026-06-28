import { test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { adminAuthFile, loginAsAdmin } from "../utils/auth";
import { ensureE2EAdminUser } from "../utils/supabase-seed";

setup("authenticate as admin", async ({ page }) => {
  await mkdir(dirname(adminAuthFile), { recursive: true });
  await ensureE2EAdminUser();
  await loginAsAdmin(page);
  await page.context().storageState({ path: adminAuthFile });
});
