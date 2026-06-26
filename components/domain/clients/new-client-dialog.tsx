"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatBrazilPhone,
  formatCpfCnpj,
  isValidBrazilPhoneLength,
  isValidCpfCnpjLength,
  normalizeBrazilPhone,
  normalizeCpfCnpj,
} from "@/lib/utils";
import {
  BUSINESS_ROLE_LABELS,
  type BusinessRole,
  type Client,
  type ClientKind,
} from "@/lib/types/domain";

const ROLE_OPTIONS = Object.entries(BUSINESS_ROLE_LABELS) as [BusinessRole, string][];

// Doubles as create (no `client`) and edit (with `client`). In edit mode it PATCHes
// the existing row; otherwise it POSTs a new one. `trigger` lets callers render their
// own opener (e.g. the pencil icon on the detail page).
export function NewClientDialog({
  client,
  trigger,
}: {
  client?: Client;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(client);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<ClientKind>(client?.kind ?? "pf");
  const [name, setName] = useState(client?.name ?? "");
  const [document, setDocument] = useState(
    client ? formatCpfCnpj(client.document ?? "", client.kind) : "",
  );
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ? formatBrazilPhone(client.phone) : "");
  const [roles, setRoles] = useState<BusinessRole[]>(client?.rolesInBusiness ?? []);

  function toggleRole(role: BusinessRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  // Reset back to the source-of-truth (the client in edit mode, blanks in create).
  function reset() {
    setKind(client?.kind ?? "pf");
    setName(client?.name ?? "");
    setDocument(client ? formatCpfCnpj(client.document ?? "", client.kind) : "");
    setEmail(client?.email ?? "");
    setPhone(client?.phone ? formatBrazilPhone(client.phone) : "");
    setRoles(client?.rolesInBusiness ?? []);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (document.trim() && !isValidCpfCnpjLength(document, kind)) {
      setError(kind === "pf" ? "Informe um CPF valido." : "Informe um CNPJ valido.");
      return;
    }
    if (phone.trim() && !isValidBrazilPhoneLength(phone)) {
      setError("Informe um telefone brasileiro valido com DDD.");
      return;
    }

    const payload = {
      kind,
      name: name.trim(),
      document: document.trim() ? normalizeCpfCnpj(document, kind) : null,
      email: email.trim() || null,
      phone: phone.trim() ? normalizeBrazilPhone(phone) : null,
      rolesInBusiness: roles,
      ...(isEdit ? {} : { whatsapp: null, address: null, tags: [] }),
    };

    setBusy(true);
    setError(null);
    const res = await fetch(
      isEdit ? `/api/clients/${client!.id}` : "/api/clients",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error ??
          (isEdit
            ? "Não foi possível salvar as alterações."
            : "Não foi possível criar o cliente."),
      );
      return;
    }

    setOpen(false);
    if (!isEdit) reset();
    router.refresh();
  }

  return (
    <>
      {trigger ? (
        <span
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          {trigger}
        </span>
      ) : (
        <Button
          size="lg"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <Plus /> Novo cliente
        </Button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {isEdit ? "Editar cliente" : "Novo cliente"}
              </h2>
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
                    onChange={(e) => {
                      const nextKind = e.target.value as ClientKind;
                      setKind(nextKind);
                      setDocument((current) => formatCpfCnpj(current, nextKind));
                    }}
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
                    inputMode="numeric"
                    maxLength={kind === "pf" ? 14 : 18}
                    placeholder={kind === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                    onChange={(e) => setDocument(formatCpfCnpj(e.target.value, kind))}
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
                    inputMode="tel"
                    maxLength={16}
                    placeholder="(11) 99999-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatBrazilPhone(e.target.value))}
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
                  {isEdit ? "Salvar alterações" : "Salvar cliente"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
