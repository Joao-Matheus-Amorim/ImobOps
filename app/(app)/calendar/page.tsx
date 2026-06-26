import { CalendarExperience } from "@/components/domain/calendar/calendar-experience";
import { guardPage } from "@/lib/guard-page";

export const metadata = { title: "Calendario" };

export default async function CalendarPage() {
  await guardPage("calendar");
  return <CalendarExperience />;
}
