"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ShieldCheck, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface ProposedCall {
  id: string;
  name: string;
  params: Record<string, unknown>;
  requiresConfirmation: boolean;
}

interface PendingPreview {
  call: ProposedCall;
  preview: string;
  prompt: string;
}

function parseSSE(text: string): { event: string; data: Record<string, unknown> }[] {
  const events: { event: string; data: Record<string, unknown> }[] = [];
  const blocks = text.split("\n\n");
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    let event = "";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7);
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (data) {
      try { events.push({ event, data: JSON.parse(data) }); } catch { /* skip */ }
    }
  }
  return events;
}

export function AssistantChat({ canUseTools }: { canUseTools: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [thinking, setThinking] = useState(false);
  const [pending, setPending] = useState<PendingPreview | null>(null);
  const [provider, setProvider] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setStreamContent("");
    setThinking(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat?stream=true", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (res.headers.get("content-type")?.includes("text/event-stream")) {
        // SSE streaming path
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          for (const ev of parseSSE(buffer)) {
            if (ev.event === "delta") {
              const delta = ev.data.delta as string;
              if (delta) {
                assistantContent += delta;
                setStreamContent(assistantContent);
              }
            } else if (ev.event === "thinking") {
              setThinking(true);
            } else if (ev.event === "done") {
              setProvider((ev.data.provider as string) ?? "");
              setStreamContent("");
              setThinking(false);
              setMessages((m) => [...m, { role: "assistant", content: (ev.data.content as string) || "(sem resposta)" }]);

              const toolCalls = (ev.data.toolCalls ?? []) as ProposedCall[];
              const writeCall = toolCalls.find((c) => c.requiresConfirmation);
              if (writeCall) {
                const dry = await fetch(`/api/ai/tools/${writeCall.name}`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ prompt: text, params: writeCall.params, confirm: false, callId: writeCall.id }),
                });
                const dryData = await dry.json();
                if (dryData.dryRun && dryData.preview) {
                  setPending({ call: writeCall, preview: dryData.preview, prompt: text });
                }
              }
            } else if (ev.event === "error") {
              const error = ev.data.error as string;
              setMessages((m) => [...m, { role: "assistant", content: error || "Erro ao falar com o assistente." }]);
              setThinking(false);
            }
          }
          // Keep only unprocessed data in buffer
          const lastNewline = buffer.lastIndexOf("\n\n");
          if (lastNewline >= 0) buffer = buffer.slice(lastNewline + 2);
        }
      } else {
        // Fallback to JSON response
        const data = await res.json();
        if (!res.ok || data.error) {
          setMessages((m) => [...m, { role: "assistant", content: data.error ?? "Erro ao falar com o assistente." }]);
          return;
        }
        setProvider(data.provider ?? "");
        setMessages((m) => [...m, { role: "assistant", content: data.content || "(sem resposta)" }]);

        const writeCall = (data.toolCalls ?? []).find((c: ProposedCall) => c.requiresConfirmation);
        if (writeCall) {
          const dry = await fetch(`/api/ai/tools/${writeCall.name}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ prompt: text, params: writeCall.params, confirm: false, callId: writeCall.id }),
          });
          const dryData = await dry.json();
          if (dryData.dryRun && dryData.preview) {
            setPending({ call: writeCall, preview: dryData.preview, prompt: text });
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setMessages((m) => [...m, { role: "assistant", content: "Erro ao falar com o assistente." }]);
    } finally {
      setLoading(false);
      setThinking(false);
      setStreamContent("");
      abortRef.current = null;
    }
  }

  async function confirmPending() {
    if (!pending) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/tools/${pending.call.name}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: pending.prompt, params: pending.call.params, confirm: true, callId: pending.call.id }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.ok ? "✅ Ação executada com sucesso." : `❌ ${data.error ?? "Falha."}` },
      ]);
    } finally {
      setPending(null);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Sparkles className="size-8" />
              <p className="font-medium text-foreground">Assistente ImobOps</p>
              <p className="text-sm">Peça relatórios, crie registros e dispare mensagens — sempre com sua permissão.</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm"
                }
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {streamContent ? (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm">
              {streamContent}
              <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse" />
            </div>
          </div>
        ) : null}
        {thinking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="size-4 animate-pulse" /> processando…
          </div>
        ) : null}
        {loading && !streamContent && !thinking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> pensando…
          </div>
        ) : null}
      </div>

      {pending ? (
        <Card className="border-gold/40">
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center gap-2 text-gold">
              <ShieldCheck className="size-4" />
              <span className="text-sm font-medium">Confirmação necessária (dry-run)</span>
            </div>
            <p className="text-sm">{pending.preview}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={confirmPending}>Confirmar e executar</Button>
              <Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={canUseTools ? "Pergunte ou peça uma ação…" : "Pergunte algo…"}
        />
        <Button size="icon" onClick={send} disabled={loading} aria-label="Enviar">
          <Send className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {provider ? <Badge variant="secondary">provider: {provider}</Badge> : null}
        {!canUseTools ? <span>Apenas leitura — tools liberadas somente para admin no MVP.</span> : null}
      </div>
    </div>
  );
}
