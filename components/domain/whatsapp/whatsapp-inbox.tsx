"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, MessageSquareText, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface InboxMessage {
  id: string;
  direction: "in" | "out";
  body: string;
  sentAt: string;
  sentBy: string;
}

interface InboxConversation {
  id: string;
  phone: string;
  contactName: string | null;
  status: string;
  lastMessageAt: string;
  triageClassification: string | null;
  messages: InboxMessage[];
}

interface QuickTemplate {
  id: string;
  title: string;
  body: string;
}

// Fill {nome}/{telefone} placeholders from the conversation's contact.
function fillTemplate(body: string, c: { contactName: string | null; phone: string }) {
  const nome = c.contactName?.trim() || "";
  return body.replace(/\{nome\}/g, nome).replace(/\{telefone\}/g, formatPhone(c.phone));
}

// SSE drives instant updates; this slow poll is a safety net if the stream drops.
const FALLBACK_POLL_MS = 20000;

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

function formatPhone(phone: string) {
  // 5521984495249 -> +55 21 98449-5249
  const m = phone.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  if (!m) return phone;
  return `+55 ${m[1]} ${m[2]}-${m[3]}`;
}

// Prefer the WhatsApp display name; fall back to the formatted number.
function displayName(c: { contactName: string | null; phone: string }) {
  return c.contactName?.trim() || formatPhone(c.phone);
}

export function WhatsAppInbox({
  initial,
  templates = [],
}: {
  initial: InboxConversation[];
  templates?: QuickTemplate[];
}) {
  // Deep-link: ?c=<conversationId> (e.g. from a client's "WhatsApp" button)
  // pre-selects that conversation; otherwise the most recent one.
  const deepLinkId = useSearchParams().get("c");
  const [conversations, setConversations] = useState<InboxConversation[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    deepLinkId ?? initial[0]?.id ?? null,
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [startingChat, setStartingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: InboxConversation[] };
      setConversations(data.conversations);
    } catch {
      // keep last good state; next tick retries
    }
  }, []);

  // Real-time updates via SSE: the server pushes an event whenever a message is
  // persisted (inbound, bot reply, or our own send) and we refetch instantly.
  useEffect(() => {
    const source = new EventSource("/api/whatsapp/stream");
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { type?: string };
        if (data.type === "message") void refresh();
      } catch {
        /* ignore malformed event */
      }
    };
    // Browser auto-reconnects on error; nothing to do here.
    return () => source.close();
  }, [refresh]);

  // Safety net: a slow poll in case the SSE connection silently drops.
  useEffect(() => {
    const id = setInterval(refresh, FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  // Auto-scroll to the newest message when the open conversation changes.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length, selectedId]);

  async function handleSend() {
    if (!selected || !draft.trim() || sending) return;
    const body = draft.trim();
    setSending(true);
    setDraft("");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: selected.phone, body }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`Falha ao enviar: ${err.error ?? res.status}`);
        setDraft(body); // restore so the user doesn't lose the text
        return;
      }
      await refresh();
    } finally {
      setSending(false);
    }
  }


  // Start a conversation with a typed number, even if it has no history yet.
  async function startNewChat(e: React.FormEvent) {
    e.preventDefault();
    const digits = newPhone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setStartingChat(true);
    try {
      const res = await fetch("/api/whatsapp/conversations/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });
      const data = (await res.json().catch(() => ({}))) as { conversationId?: string; error?: string };
      if (!res.ok || !data.conversationId) {
        alert(data.error ?? "Não foi possível abrir a conversa.");
        return;
      }
      await refresh();
      setSelectedId(data.conversationId);
      setNewChatOpen(false);
      setNewPhone("");
    } finally {
      setStartingChat(false);
    }
  }

  return (
    <div className="grid min-h-[620px] gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Conversation list */}
      <Card className="overflow-hidden rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-0">
        <div className="relative flex items-center justify-between border-b border-primary/12 px-4 py-3">
          <p className="section-label text-primary/80">Conversas</p>
          <button
            type="button"
            onClick={() => setNewChatOpen((v) => !v)}
            className={cn(
              "grid size-7 place-items-center rounded-lg border transition",
              newChatOpen
                ? "border-primary/45 bg-primary/10 text-primary"
                : "border-primary/20 text-muted-foreground hover:text-primary",
            )}
            aria-label="Nova conversa"
            title="Nova conversa"
          >
            <Plus className="size-4" />
          </button>

          {newChatOpen ? (
            <form
              onSubmit={startNewChat}
              className="absolute right-3 top-12 z-20 w-72 rounded-2xl border border-primary/18 bg-[#102f4d] p-3 shadow-2xl"
            >
              <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                Nova conversa
              </p>
              <input
                autoFocus
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Número com DDD (ex: 21 99999-9999)"
                inputMode="tel"
                className="w-full rounded-xl border border-primary/18 bg-background/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/45"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setNewChatOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={startingChat || newPhone.replace(/\D/g, "").length < 10}>
                  Abrir
                </Button>
              </div>
            </form>
          ) : null}
        </div>
        <div className="max-h-[620px] space-y-2 overflow-y-auto p-3 thin-scrollbar">
          {conversations.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              Sem conversas ainda. Use o + para iniciar uma.
            </p>
          ) : null}
          {conversations.map((conversation) => {
            const last = conversation.messages.at(-1);
            const isActive = conversation.id === selectedId;
            return (
              <button
                type="button"
                key={conversation.id}
                onClick={() => setSelectedId(conversation.id)}
                className={cn(
                  "flex w-full gap-3 rounded-2xl border p-3 text-left transition",
                  isActive
                    ? "border-primary/45 bg-primary/12"
                    : "border-primary/12 bg-background/22 hover:border-primary/35 hover:bg-primary/8",
                )}
              >
                <Avatar name={displayName(conversation)} className="size-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {displayName(conversation)}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatTime(last?.sentAt ?? conversation.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {last?.body ?? "—"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={conversation.status} />
                    {conversation.triageClassification ? (
                      <Badge variant="outline">{conversation.triageClassification}</Badge>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Message panel */}
      <Card className="flex min-h-[620px] flex-col overflow-hidden rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-0">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">Selecione uma conversa.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-primary/12 px-5 py-4">
              <Avatar name={displayName(selected)} className="size-9" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {displayName(selected)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.contactName ? `${formatPhone(selected.phone)} · ` : ""}
                  {selected.status}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5 thin-scrollbar">
              {selected.messages.map((message) => {
                const outbound = message.direction === "out";
                return (
                  <div
                    key={message.id}
                    className={cn("flex", outbound ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-4 py-2 text-sm",
                        outbound
                          ? "bg-primary/20 text-foreground"
                          : "border border-primary/14 bg-background/30 text-foreground",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <p className="mt-1 text-right text-[10px] text-muted-foreground">
                        {outbound && message.sentBy === "bot" ? "🤖 " : ""}
                        {formatTime(message.sentAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="relative flex items-center gap-2 border-t border-primary/12 p-3">
              {/* Quick-reply templates */}
              {templates.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Modelos de mensagem"
                    onClick={() => setTemplatesOpen((v) => !v)}
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl border transition",
                      templatesOpen
                        ? "border-primary/45 bg-primary/10 text-primary"
                        : "border-primary/18 bg-background/30 text-muted-foreground hover:text-primary",
                    )}
                  >
                    <MessageSquareText className="size-4" />
                  </button>
                  {templatesOpen ? (
                    <div className="absolute bottom-12 left-0 z-20 max-h-72 w-80 overflow-y-auto rounded-2xl border border-primary/18 bg-[#102f4d] p-2 shadow-2xl thin-scrollbar">
                      <p className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Respostas rápidas
                      </p>
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setDraft(fillTemplate(t.body, selected));
                            setTemplatesOpen(false);
                          }}
                          className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-primary/8"
                        >
                          <p className="text-sm font-medium text-foreground">{t.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{t.body}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Escreva uma resposta…"
                className="flex-1 rounded-xl border border-primary/18 bg-background/30 px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/45"
              />
              <Button onClick={() => void handleSend()} disabled={sending || !draft.trim()}>
                <Send /> Enviar
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
