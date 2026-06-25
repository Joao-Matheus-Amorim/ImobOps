"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Property, PropertyAvailability, PropertyKind } from "@/lib/types/domain";

const KIND_OPTIONS: { value: PropertyKind; label: string }[] = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
  { value: "sala", label: "Sala" },
];

const AVAILABILITY_OPTIONS: { value: PropertyAvailability; label: string }[] = [
  { value: "locacao", label: "Locação" },
  { value: "venda", label: "Venda" },
  { value: "ambos", label: "Locação e venda" },
  { value: "condominio_only", label: "Só condomínio" },
];

export function NewPropertyDialog({
  property,
  trigger,
}: {
  property?: Property;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(property);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<PropertyKind>(property?.kind ?? "apartamento");
  const [address, setAddress] = useState(property?.address ?? "");
  const [areaM2, setAreaM2] = useState(property?.areaM2 != null ? String(property.areaM2) : "");
  const [bedrooms, setBedrooms] = useState(property?.bedrooms != null ? String(property.bedrooms) : "");
  const [bathrooms, setBathrooms] = useState(property?.bathrooms != null ? String(property.bathrooms) : "");
  const [availability, setAvailability] = useState<PropertyAvailability>(
    property?.availability ?? "locacao",
  );

  function reset() {
    setKind(property?.kind ?? "apartamento");
    setAddress(property?.address ?? "");
    setAreaM2(property?.areaM2 != null ? String(property.areaM2) : "");
    setBedrooms(property?.bedrooms != null ? String(property.bedrooms) : "");
    setBathrooms(property?.bathrooms != null ? String(property.bathrooms) : "");
    setAvailability(property?.availability ?? "locacao");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) {
      setError("Informe o endereço.");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch(
      isEdit ? `/api/properties/${property!.id}` : "/api/properties",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          address: address.trim(),
          areaM2: areaM2 ? Number(areaM2) : null,
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
          availability,
        }),
      },
    );
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error ??
          (isEdit
            ? "Não foi possível salvar as alterações."
            : "Não foi possível criar o imóvel."),
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
          size="sm"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <Plus /> Novo imóvel
        </Button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {isEdit ? "Editar imóvel" : "Novo imóvel"}
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
                    onChange={(e) => setKind(e.target.value as PropertyKind)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="availability">Disponibilidade</Label>
                  <select
                    id="availability"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as PropertyAvailability)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {AVAILABILITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="areaM2">Área (m²)</Label>
                  <Input
                    id="areaM2"
                    type="number"
                    min={0}
                    value={areaM2}
                    onChange={(e) => setAreaM2(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bedrooms">Dormitórios</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min={0}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isEdit ? "Salvar alterações" : "Salvar imóvel"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
