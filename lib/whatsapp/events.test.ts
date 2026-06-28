import { describe, expect, it } from "vitest";
import { publishWhatsAppEvent, subscribeWhatsAppEvents } from "./events";

describe("whatsapp events", () => {
  it("delivers a published event to subscribers", () => {
    const received: unknown[] = [];
    const unsubscribe = subscribeWhatsAppEvents((event) => {
      received.push(event);
    });

    const event = {
      type: "message.upsert" as const,
      tenancyId: "tenant-1",
      conversationId: "conversation-1",
      externalId: "message-1",
    };

    publishWhatsAppEvent(event);
    unsubscribe();

    expect(received).toEqual([event]);
  });
});
