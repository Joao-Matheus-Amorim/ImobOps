import {
  LayoutDashboard,
  Building2,
  Building,
  CalendarDays,
  Wallet,
  Users,
  Sparkles,
  Contact,
  KeyRound,
  Handshake,
  MessageCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Building,
  CalendarDays,
  Wallet,
  Users,
  Sparkles,
  Contact,
  KeyRound,
  Handshake,
  MessageCircle,
  Settings,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Sparkles;
  return <Cmp className={className} />;
}
