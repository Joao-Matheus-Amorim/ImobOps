"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opens (or creates) the WhatsApp conversation for this contact and deep-links
// to the inbox with it pre-selected.
export function OpenWhatsAppButton({
  phone,
  name,
}: {
  phone: string | null;
  name?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!phone) {
    return (
      <Button size="sm" variant="outline" disabled title="Cliente sem telefone/WhatsApp">
        <MessageCircle /> WhatsApp
      </Button>
    );
  }

  async function open() {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/conversations/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name }),
      });
      const data = (await res.json().catch(() => ({}))) as { conversationId?: string; error?: string };
      if (!res.ok || !data.conversationId) {
        alert(data.error ?? "Não foi possível abrir a conversa.");
        return;
      }
      router.push(`/whatsapp?c=${data.conversationId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={() => void open()} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <MessageCircle />} WhatsApp
    </Button>
  );
}
