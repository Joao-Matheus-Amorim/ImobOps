// Server-Sent Events stream for the WhatsApp inbox. The browser opens one
// connection; the server pushes a tiny event whenever a message is persisted
// for this tenancy, so the client can refetch instantly (no polling).
import { getPrincipal, getSessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { subscribeWhatsAppEvents } from "@/lib/whatsapp/events";

// SSE must stream; never cache or statically render.
export const dynamic = "force-dynamic";

export async function GET() {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user || !can(principal, "whatsapp", "view")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const tenancyId = user.tenancyId;

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      // Initial hello so the client knows the stream is live.
      send({ type: "ready" });

      unsubscribe = subscribeWhatsAppEvents((event) => {
        if (event.tenancyId !== tenancyId) return;
        try {
          send(event);
        } catch {
          // controller closed; cleanup happens in cancel()
        }
      });

      // Keep the connection alive through proxies (ngrok, etc.).
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* closed */
        }
      }, 25_000);
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
