// WhatsApp instance connection for the inbox "connect number" flow.
// GET  → current connection state (polled by the UI).
// POST → start/resume connection, returning a QR code to scan when needed.
import { NextResponse } from "next/server";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";

export async function GET() {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!can(principal, "whatsapp", "view")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }
  try {
    const info = await getWhatsAppAdapter().connectionState();
    return NextResponse.json(info);
  } catch (err) {
    return NextResponse.json(
      { state: "unknown", qr: null, error: (err as Error).message },
      { status: 502 },
    );
  }
}

export async function POST() {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!can(principal, "whatsapp", "create")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }
  try {
    const info = await getWhatsAppAdapter().connect();
    return NextResponse.json(info);
  } catch (err) {
    return NextResponse.json(
      { state: "unknown", qr: null, error: (err as Error).message },
      { status: 502 },
    );
  }
}

// Log out the connected WhatsApp number.
export async function DELETE() {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!can(principal, "whatsapp", "delete")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }
  try {
    const info = await getWhatsAppAdapter().disconnect();
    return NextResponse.json(info);
  } catch (err) {
    return NextResponse.json(
      { state: "unknown", qr: null, error: (err as Error).message },
      { status: 502 },
    );
  }
}
