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
  BarChart3,
  BellRing,
  FileStack,
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
  BarChart3,
  BellRing,
  FileStack,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Sparkles;
  return <Cmp className={className} />;
}
