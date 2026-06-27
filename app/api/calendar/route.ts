import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContext } from "@/lib/api-auth";
import { calendarRepository } from "@/lib/repositories/calendar.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";

const bodySchema = z.object({
  title: z.string().trim().min(1, "Informe um titulo."),
  startsAt: z.string().min(1, "Informe data e horario."),
  endsAt: z.string().nullable().optional(),
  tone: z.enum(["meeting", "task", "payment", "board", "visit"]).default("meeting"),
  notes: z.string().trim().min(1).nullable().optional(),
});

export async function GET(request: Request) {
  const auth = await requireContext(request, { limit: 120 });
  if ("error" in auth) return auth.error;

  const events = await calendarRepository.listUnified(auth.ctx);
  return NextResponse.json({ ok: true, events });
}

export async function POST(request: Request) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) {
    return NextResponse.json({ error: "Data invalida." }, { status: 400 });
  }

  const event = await calendarRepository.create(ctx, {
    title: parsed.data.title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt ? endsAt.toISOString() : null,
    tone: parsed.data.tone,
    notes: parsed.data.notes ?? null,
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "calendar_event",
    entityId: event.id,
    payloadBefore: null,
    payloadAfter: event as unknown as Record<string, unknown>,
  });

  return NextResponse.json({
    ok: true,
    event: {
      id: `m-${event.id}`,
      manualId: event.id,
      title: event.title,
      startsAt: event.startsAt,
      tone: event.tone,
      source: "manual",
    },
  });
}
