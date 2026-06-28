import { test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { viewerAuthFile, loginAs } from "../utils/auth";
import { ensureE2EUser } from "../utils/supabase-seed";

setup("authenticate as viewer", async ({ page }) => {
  await mkdir(dirname(viewerAuthFile), { recursive: true });
  await ensureE2EUser("viewer");
  await loginAs(page, "viewer");
  await page.context().storageState({ path: viewerAuthFile });
});
