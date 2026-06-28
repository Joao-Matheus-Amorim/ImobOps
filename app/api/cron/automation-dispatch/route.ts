import { NextResponse } from "next/server";
import { defaultSystemTenancyId } from "@/lib/constants";
import { dispatchDueAutomations } from "@/lib/automation/dispatcher";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const results = await dispatchDueAutomations({ tenancyId: defaultSystemTenancyId(), userId: "system" });
  return NextResponse.json({ ok: true, total: results.length, results });
}
