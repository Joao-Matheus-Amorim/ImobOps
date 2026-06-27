-- 014_calendar_events.sql
-- User/AI-created calendar events (manual agenda). Operational events (visits,
-- due dates, contracts, condo meetings) are aggregated at read time from their
-- own tables, not stored here.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'calendar_tone_t') then
    create type calendar_tone_t as enum ('meeting', 'task', 'payment', 'board', 'visit');
  end if;
end $$;

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  tone calendar_tone_t not null default 'meeting',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists idx_calendar_events_tenancy on calendar_events(tenancy_id);
create index if not exists idx_calendar_events_starts on calendar_events(starts_at);

alter table calendar_events enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_events'
      and policyname = 'tenancy_isolation'
  ) then
    create policy tenancy_isolation on calendar_events
      for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
  end if;
end $$;
