import { CalendarExperience } from "@/components/domain/calendar/calendar-experience";
import { guardPage } from "@/lib/guard-page";
import { calendarRepository } from "@/lib/repositories/calendar.repository";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";

export const metadata = { title: "Calendario" };

export default async function CalendarPage() {
  const { ctx } = await guardPage("calendar");
  const [events, automations, clients, properties] = await Promise.all([
    calendarRepository.listUnified(ctx),
    automationRepository.listRules(ctx),
    clientsRepository.list(ctx),
    propertiesRepository.list(ctx),
  ]);
  return <CalendarExperience initialEvents={events} initialAutomations={automations} initialClients={clients.map((client) => ({ id: client.id, name: client.name, phone: client.phone, whatsapp: client.whatsapp }))} initialProperties={properties.map((property) => ({ id: property.id, address: property.address, status: property.status }))} />;
}
