import { CalendarExperience } from "@/components/domain/calendar/calendar-experience";
import { guardPage } from "@/lib/guard-page";
import { calendarRepository } from "@/lib/repositories/calendar.repository";

export const metadata = { title: "Calendario" };

export default async function CalendarPage() {
  const { ctx } = await guardPage("calendar");
  const events = await calendarRepository.listUnified(ctx);
  return <CalendarExperience initialEvents={events} />;
}
