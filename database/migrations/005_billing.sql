-- ImobOps — 005 Billing (charges, reminders, late fees)
-- Adds the gateway billing layer (Asaas) on top of the core schema. Mirrors
-- lib/types/domain.ts (Charge, ChargeReminder) and the late-fee fields on
-- rental_contracts. Every table is tenancy-isolated under RLS, like the rest.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type charge_method_t as enum ('boleto','pix','cartao');
create type charge_status_t as enum ('pendente','paga','vencida','cancelada','falha');
create type charge_source_t as enum ('installment','condo_fee','avulsa');
create type billing_provider_t as enum ('asaas','mock');
create type reminder_trigger_t as enum ('pre_vencimento','vencimento','atraso_1','atraso_2');

-- ---------------------------------------------------------------------------
-- Late-fee config on the rental contract (multa + juros, configurable)
-- ---------------------------------------------------------------------------
alter table rental_contracts
  add column late_fee_pct numeric not null default 2,
  add column late_interest_pct_month numeric not null default 1;

-- ---------------------------------------------------------------------------
-- Charges
-- ---------------------------------------------------------------------------
create table charges (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  source_type charge_source_t not null,
  -- sourceId points to an installment, condo_fee or client depending on source_type;
  -- kept as a plain uuid (no FK) because it is polymorphic.
  source_id uuid not null,
  client_id uuid references clients(id),
  description text,
  customer_name text,
  method charge_method_t not null,
  amount numeric not null,
  due_date date not null,
  status charge_status_t not null default 'pendente',
  provider billing_provider_t not null default 'mock',
  external_id text,
  boleto_url text,
  pix_payload text,
  paid_at timestamptz,
  paid_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_charges_tenancy on charges(tenancy_id);
create index idx_charges_source on charges(source_type, source_id);
create index idx_charges_status on charges(status);
create index idx_charges_external on charges(external_id);
create index idx_charges_due on charges(due_date);

-- 1:1 active charge link from the source records.
alter table installments add column charge_id uuid references charges(id);
alter table condo_fees   add column charge_id uuid references charges(id);

-- ---------------------------------------------------------------------------
-- Charge reminders (idempotency for the dunning ladder)
-- ---------------------------------------------------------------------------
create table charge_reminders (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  charge_id uuid not null references charges(id) on delete cascade,
  trigger reminder_trigger_t not null,
  sent_at timestamptz not null default now(),
  channel text not null default 'whatsapp',
  template_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (charge_id, trigger)
);
create index idx_charge_reminders_tenancy on charge_reminders(tenancy_id);
create index idx_charge_reminders_charge on charge_reminders(charge_id);

-- ---------------------------------------------------------------------------
-- RLS — tenancy isolation (same pattern as 002)
-- ---------------------------------------------------------------------------
alter table charges          enable row level security;
alter table charge_reminders enable row level security;

create policy tenancy_isolation on charges
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on charge_reminders
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
