// Daily billing cron (Vercel Cron). Runs the reminder ladder for the demo tenancy.
// Protected by CRON_SECRET (Vercel sends it as a Bearer token). The overdue status
// is computed at read time, so this job only sends reminders — never owns state.
import { NextResponse } from "next/server";
import { runReminderLadder } from "@/lib/billing/reminders";
import { DEMO_TENANCY_ID } from "@/lib/constants";

const SYSTEM_CTX = { tenancyId: DEMO_TENANCY_ID, userId: "system" };

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // unset → allow (dev/mock)
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const results = await runReminderLadder(SYSTEM_CTX);
  const sent = results.filter((r) => r.sent).length;
  return NextResponse.json({ ok: true, sent, total: results.length, results });
}
