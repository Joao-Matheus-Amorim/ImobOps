// Calendar domain types

import { BaseEntity } from "./domain-base";

export type CalendarTone = "meeting" | "task" | "payment" | "board" | "visit";

// A manual calendar event. Operational events are aggregated at read time.
export interface CalendarEvent extends BaseEntity {
  title: string;
  startsAt: string;
  endsAt: string | null;
  tone: CalendarTone;
  notes: string | null;
}
