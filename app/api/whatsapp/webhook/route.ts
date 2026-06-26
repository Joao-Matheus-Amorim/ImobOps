import { processWhatsAppWebhook } from "@/services/whatsapp-service";

function signatureValid(request: Request): boolean {
  const expected = process.env.EVOLUTION_WEBHOOK_TOKEN;
  if (!expected) return true; // no token configured → accept (dev/mock)
  const got = request.headers.get("x-webhook-token");
  return got === expected;
}

export async function POST(request: Request) {
  if (!signatureValid(request)) {
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const backgroundRequest = request.clone();
  queueMicrotask(() => {
    void backgroundRequest
      .json()
      .then((payload) => processWhatsAppWebhook(payload))
      .catch((error) => {
        console.error("[whatsapp/webhook] failed to queue background job:", error);
      });
  });

  return Response.json({ status: 200 });
}
