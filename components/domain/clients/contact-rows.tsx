"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Mail, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBrazilPhone } from "@/lib/utils";

// Contact rows for the client detail. Phone and WhatsApp both open the in-app
// inbox conversation for this contact (single connected number). Email opens the
// mail client; address is plain text.
export function ContactRows({
  phone,
  whatsapp,
  email,
  address,
  name,
}: {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const inboxPhone = whatsapp ?? phone;

  async function openInbox() {
    if (!inboxPhone || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/conversations/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: inboxPhone, name }),
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
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <InboxRow icon={<Phone className="size-4" />} label="Telefone" value={phone ? formatBrazilPhone(phone) : null} onClick={openInbox} disabled={!inboxPhone || busy} busy={busy} />
      <InboxRow icon={<MessageCircle className="size-4" />} label="WhatsApp" value={whatsapp ? formatBrazilPhone(whatsapp) : null} onClick={openInbox} disabled={!inboxPhone || busy} busy={busy} />
      <LinkRow icon={<Mail className="size-4" />} label="E-mail" value={email} href={email ? `mailto:${email}` : undefined} />
      <LinkRow icon={<MapPin className="size-4" />} label="Endereço" value={address} />
    </div>
  );
}

function Shell({
  icon,
  label,
  value,
  busy,
  interactive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  busy?: boolean;
  interactive: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-primary/10 bg-background/25 px-3 py-2",
        interactive && "transition hover:border-primary/35 hover:bg-primary/8",
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
        {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function InboxRow({
  icon,
  label,
  value,
  onClick,
  disabled,
  busy,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  if (disabled && !busy) {
    return <Shell icon={icon} label={label} value={value} interactive={false} />;
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="text-left">
      <Shell icon={icon} label={label} value={value} interactive busy={busy} />
    </button>
  );
}

function LinkRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  href?: string;
}) {
  const shell = <Shell icon={icon} label={label} value={value} interactive={Boolean(href)} />;
  return href && value ? <a href={href}>{shell}</a> : shell;
}
