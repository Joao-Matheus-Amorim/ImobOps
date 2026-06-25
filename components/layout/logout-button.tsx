"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { routes } from "@/lib/routes";

// Signs out of Supabase (no-op in mock mode) and returns to the login screen.
export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push(routes.login);
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      title="Sair"
      className="grid size-10 place-items-center rounded-full border border-primary/20 bg-card/45 text-muted-foreground transition hover:border-primary/55 hover:text-primary hover:shadow-glow-sm"
    >
      <LogOut className="size-4" />
    </button>
  );
}
