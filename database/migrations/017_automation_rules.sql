-- 017_automation_rules.sql
-- Calendar-driven automation engine. Rules are configured by users, executions run
-- as system/admin through the application dispatcher. Delete is intentionally not
-- part of the action catalog.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'automation_status_t') then
    create type automation_status_t as enum ('active','paused');
  end if;
  if not exists (select 1 from pg_type where typname = 'automation_run_status_t') then
    create type automation_run_status_t as enum ('success','error','skipped');
  end if;
end $$;

create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  name text not null,
  description text,
  status automation_status_t not null default 'active',
  timezone text not null default 'America/Sao_Paulo',
  trigger jsonb not null,
  action jsonb not null,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  check (timezone = 'America/Sao_Paulo')
);
create index if not exists idx_automation_rules_tenancy on automation_rules(tenancy_id);
create index if not exists idx_automation_rules_due on automation_rules(tenancy_id, status, next_run_at) where next_run_at is not null;
create index if not exists idx_automation_rules_trigger_kind on automation_rules((trigger->>'kind'));

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  rule_id uuid not null references automation_rules(id) on delete cascade,
  scheduled_for timestamptz not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status automation_run_status_t not null default 'skipped',
  idempotency_key text not null,
  action_kind text not null,
  payload jsonb not null default '{}',
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (tenancy_id, idempotency_key)
);
create index if not exists idx_automation_runs_tenancy on automation_runs(tenancy_id);
create index if not exists idx_automation_runs_rule on automation_runs(rule_id, scheduled_for desc);
create index if not exists idx_automation_runs_status on automation_runs(status);

alter table automation_rules enable row level security;
alter table automation_runs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_rules' and policyname = 'tenancy_isolation') then
    create policy tenancy_isolation on automation_rules
      for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_runs' and policyname = 'tenancy_isolation') then
    create policy tenancy_isolation on automation_runs
      for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
  end if;
end $$;
