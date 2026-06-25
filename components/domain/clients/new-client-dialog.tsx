"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_ROLE_LABELS, type BusinessRole, type ClientKind } from "@/lib/types/domain";

const ROLE_OPTIONS = Object.entries(BUSINESS_ROLE_LABELS) as [BusinessRole, string][];

export function NewClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<ClientKind>("pf");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState<BusinessRole[]>([]);

  function toggleRole(role: BusinessRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function reset() {
    setKind("pf");
    setName("");
    setDocument("");
    setEmail("");
    setPhone("");
    setRoles([]);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        name: name.trim(),
        document: document.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        whatsapp: null,
        address: null,
        tags: [],
        rolesInBusiness: roles,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Não foi possível criar o cliente.");
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <Button
        size="lg"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Plus /> Novo cliente
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Novo cliente</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {error ? (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="kind">Tipo</Label>
                  <select
                    id="kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ClientKind)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="pf">Pessoa física</option>
                    <option value="pj">Pessoa jurídica</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="document">{kind === "pf" ? "CPF" : "CNPJ"}</Label>
                  <Input
                    id="document"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Função no negócio</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map(([role, label]) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        roles.includes(role)
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-primary/18 bg-card/35 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
