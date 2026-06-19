"use client";

import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/types/permissions";

// Mock-mode helper: switches the simulated role by setting a cookie + refreshing.
// In SaaS mode this is replaced by real auth and is hidden.
export function RoleSwitcher({ current }: { current: Role }) {
  const router = useRouter();

  function onChange(role: Role) {
    document.cookie = `imobops_role=${role}; path=/; max-age=31536000`;
    router.refresh();
    // Hard reload so server components re-read the cookie.
    window.location.reload();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <UserCog className="size-4" />
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as Role)}
        className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground"
        aria-label="Trocar papel (modo demonstração)"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
