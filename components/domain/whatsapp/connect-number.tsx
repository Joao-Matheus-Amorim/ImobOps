"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, LogOut, QrCode, RefreshCw, DownloadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type State = "open" | "connecting" | "close" | "unknown";

interface ConnInfo {
  state: State;
  qr: string | null;
  error?: string;
}

const POLL_MS = 3000;

export function ConnectNumber({ initialConfigured }: { initialConfigured: boolean }) {
  const [state, setState] = useState<State>(initialConfigured ? "unknown" : "open");
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/import", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        conversationsImported?: number;
        messagesImported?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Falha ao importar conversas.");
        return;
      }
      alert(
        `Importadas ${data.conversationsImported ?? 0} conversa(s) e ${data.messagesImported ?? 0} mensagem(ns) dos últimos 30 dias.`,
      );
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const checkState = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/instance", { cache: "no-store" });
      const data = (await res.json()) as ConnInfo;
      setState(data.state);
      if (data.state === "open") {
        setQr(null); // connected — drop the QR
      }
    } catch {
      // keep last state
    }
  }, []);

  // On mount, learn the current state once.
  useEffect(() => {
    if (initialConfigured) void checkState();
  }, [initialConfigured, checkState]);

  // While a QR is showing, poll until connected, then stop.
  useEffect(() => {
    if (qr && state !== "open") {
      pollRef.current = setInterval(checkState, POLL_MS);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
    if (pollRef.current) clearInterval(pollRef.current);
  }, [qr, state, checkState]);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/instance", { method: "POST" });
      const data = (await res.json()) as ConnInfo;
      if (data.error) setError(data.error);
      setState(data.state);
      setQr(data.qr);
      if (data.state === "open") setQr(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Desconectar este número do WhatsApp? Você precisará escanear o QR de novo para reconectar.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/instance", { method: "DELETE" });
      const data = (await res.json()) as ConnInfo;
      if (data.error) setError(data.error);
      setState(data.state);
      setQr(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const connected = state === "open";

  return (
    <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-5 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
      <div className="flex items-center justify-between">
        <p className="section-label text-primary/80">Conectar WhatsApp (QR Code)</p>
        {connected ? (
          <Badge>
            <CheckCircle2 className="size-3.5" /> Conectado
          </Badge>
        ) : (
          <Badge variant="outline">{state === "connecting" ? "Aguardando scan" : "Desconectado"}</Badge>
        )}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {connected
          ? "Seu número está conectado. As mensagens já chegam no inbox abaixo."
          : "Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho, e escaneie o QR."}
      </p>

      <div className="mt-5 flex items-center gap-4">
        {qr && !connected ? (
          <div className="grid place-items-center rounded-2xl border border-primary/30 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR Code do WhatsApp" width={180} height={180} />
          </div>
        ) : (
          <div className="grid size-[76px] place-items-center rounded-2xl border border-dashed border-primary/45 bg-primary/8 text-primary shadow-glow-sm">
            {connected ? <CheckCircle2 className="size-9" /> : <QrCode className="size-9" />}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {connected ? (
            <>
              <Button onClick={() => void handleImport()} disabled={importing}>
                {importing ? <Loader2 className="animate-spin" /> : <DownloadCloud />}
                Importar conversas
              </Button>
              <Button variant="outline" onClick={() => void handleDisconnect()} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <LogOut />}
                Desconectar
              </Button>
            </>
          ) : (
            <Button onClick={() => void handleConnect()} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <QrCode />}
              {qr ? "Gerar novo QR" : "Conectar número"}
            </Button>
          )}
          <button
            type="button"
            onClick={() => void checkState()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary"
          >
            <RefreshCw className="size-3.5" /> Verificar status
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-red-400">Erro: {error}</p> : null}
    </Card>
  );
}
