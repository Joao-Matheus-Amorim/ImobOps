-- ImobOps — 001 core schema
-- Multi-tenant from day 1: every business table carries tenancy_id.
-- Audit columns: created_at, updated_at, created_by on every entity table.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type role_t as enum ('admin','manager','broker','finance','condo_admin','viewer');
create type tenancy_plan_t as enum ('single','saas_starter','saas_pro');
create type client_kind_t as enum ('pf','pj');
create type business_role_t as enum ('locador','locatario','fiador','comprador','vendedor','lead','proprietario_condomino');
create type property_kind_t as enum ('apartamento','casa','comercial','terreno','sala');
create type property_status_t as enum ('disponivel','alugado','vendido','em_obra','inativo');
create type property_availability_t as enum ('locacao','venda','ambos','condominio_only');
create type document_kind_t as enum ('contrato','boleto','comprovante','rg','cpf','laudo','ata','outro');
create type index_type_t as enum ('igpm','ipca','none');
create type rental_status_t as enum ('ativo','encerrado','inadimplente','em_renovacao');
create type installment_status_t as enum ('a_vencer','pago','atrasado','cancelado');
create type repasse_status_t as enum ('pendente','pago');
create type listing_status_t as enum ('ativa','sob_proposta','vendida','cancelada');
create type proposal_status_t as enum ('em_analise','contraproposta','aceita','recusada');
create type sale_contract_status_t as enum ('em_andamento','fechado','cancelado');
create type commission_status_t as enum ('pendente','paga');
create type condo_fee_status_t as enum ('a_vencer','pago','atrasado');
create type apportionment_t as enum ('igual','fracao_ideal');
create type condo_expense_status_t as enum ('lancada','rateada','paga');
create type meeting_kind_t as enum ('ordinaria','extraordinaria');
create type lead_source_t as enum ('whatsapp','site','indicacao','outros');
create type lead_interest_t as enum ('locacao','venda','condominio','outro');
create type funnel_stage_t as enum ('novo','qualificado','visita_agendada','proposta','fechado_ganho','fechado_perdido');
create type activity_kind_t as enum ('ligacao','visita','whatsapp','email','proposta','nota');
create type conversation_status_t as enum ('aberta','em_atendimento','encerrada');
create type triage_t as enum ('locacao','venda','condominio','financeiro','outro');
create type message_direction_t as enum ('in','out');
create type message_sender_t as enum ('user','system','ai','bot');

-- ---------------------------------------------------------------------------
-- Core
-- ---------------------------------------------------------------------------
create table tenancies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan tenancy_plan_t not null default 'single',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  auth_user_id uuid,
  role role_t not null default 'viewer',
  display_name text not null,
  avatar_url text,
  phone text,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_users_tenancy on users(tenancy_id);
create index idx_users_auth on users(auth_user_id);

create table clients (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  kind client_kind_t not null,
  name text not null,
  document text,
  email text,
  phone text,
  whatsapp text,
  address text,
  tags text[] not null default '{}',
  roles_in_business business_role_t[] not null default '{}',
  owner_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_clients_tenancy on clients(tenancy_id);
create index idx_clients_owner on clients(owner_user_id);

create table properties (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  kind property_kind_t not null,
  address text not null,
  area_m2 numeric,
  bedrooms int,
  bathrooms int,
  parking_spots int,
  owner_client_id uuid references clients(id),
  status property_status_t not null default 'disponivel',
  availability property_availability_t not null default 'ambos',
  condo_id uuid,
  photos text[] not null default '{}',
  description text,
  owner_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_properties_tenancy on properties(tenancy_id);
create index idx_properties_status on properties(status);
create index idx_properties_condo on properties(condo_id);

create table documents (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  kind document_kind_t not null,
  storage_path text not null,
  mime text not null,
  size bigint not null,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_documents_tenancy on documents(tenancy_id);
create index idx_documents_entity on documents(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Rental
-- ---------------------------------------------------------------------------
create table rental_contracts (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  property_id uuid not null references properties(id),
  landlord_client_id uuid not null references clients(id),
  tenant_client_id uuid not null references clients(id),
  guarantor_client_id uuid references clients(id),
  monthly_value numeric not null,
  due_day int not null check (due_day between 1 and 28),
  start_date date not null,
  end_date date not null,
  duration_months int not null,
  index_type index_type_t not null default 'igpm',
  admin_fee_pct numeric not null default 0,
  status rental_status_t not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_rentals_tenancy on rental_contracts(tenancy_id);
create index idx_rentals_status on rental_contracts(status);

create table installments (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  contract_id uuid not null references rental_contracts(id) on delete cascade,
  reference_month text not null,
  due_date date not null,
  amount numeric not null,
  status installment_status_t not null default 'a_vencer',
  paid_at timestamptz,
  paid_amount numeric,
  receipt_document_id uuid references documents(id),
  boleto_document_id uuid references documents(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_installments_tenancy on installments(tenancy_id);
create index idx_installments_contract on installments(contract_id);
create index idx_installments_status on installments(status);
create index idx_installments_due on installments(due_date);
create index idx_installments_ref on installments(reference_month);

create table repasses (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  contract_id uuid not null references rental_contracts(id) on delete cascade,
  reference_month text not null,
  gross_amount numeric not null,
  admin_fee_amount numeric not null,
  net_amount numeric not null,
  status repasse_status_t not null default 'pendente',
  paid_at timestamptz,
  receipt_document_id uuid references documents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_repasses_tenancy on repasses(tenancy_id);
create index idx_repasses_status on repasses(status);
create index idx_repasses_ref on repasses(reference_month);

-- ---------------------------------------------------------------------------
-- Sale
-- ---------------------------------------------------------------------------
create table sale_listings (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  property_id uuid not null references properties(id),
  asking_price numeric not null,
  status listing_status_t not null default 'ativa',
  commission_pct numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_listings_tenancy on sale_listings(tenancy_id);
create index idx_listings_status on sale_listings(status);

create table proposals (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  listing_id uuid not null references sale_listings(id) on delete cascade,
  buyer_client_id uuid not null references clients(id),
  broker_user_id uuid not null references users(id),
  offered_price numeric not null,
  conditions text,
  status proposal_status_t not null default 'em_analise',
  history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_proposals_tenancy on proposals(tenancy_id);
create index idx_proposals_listing on proposals(listing_id);
create index idx_proposals_status on proposals(status);

create table sale_contracts (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  listing_id uuid not null references sale_listings(id),
  buyer_client_id uuid not null references clients(id),
  seller_client_id uuid not null references clients(id),
  final_price numeric not null,
  signed_at timestamptz,
  payment_terms text,
  status sale_contract_status_t not null default 'em_andamento',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_sale_contracts_tenancy on sale_contracts(tenancy_id);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  sale_contract_id uuid not null references sale_contracts(id) on delete cascade,
  broker_user_id uuid not null references users(id),
  pct numeric not null,
  amount numeric not null,
  status commission_status_t not null default 'pendente',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_commissions_tenancy on commissions(tenancy_id);
create index idx_commissions_status on commissions(status);

-- ---------------------------------------------------------------------------
-- Condo
-- ---------------------------------------------------------------------------
create table condos (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  name text not null,
  address text not null,
  unit_count int not null default 0,
  manager_user_id uuid references users(id),
  admin_fee_pct numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_condos_tenancy on condos(tenancy_id);

-- properties.condo_id references condos(id) (added after condos exists)
alter table properties add constraint fk_properties_condo
  foreign key (condo_id) references condos(id);

create table units (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  condo_id uuid not null references condos(id) on delete cascade,
  label text not null,
  owner_client_id uuid references clients(id),
  current_resident_client_id uuid references clients(id),
  area_m2 numeric,
  fraction_pct numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_units_tenancy on units(tenancy_id);
create index idx_units_condo on units(condo_id);

create table condo_fees (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  reference_month text not null,
  due_date date not null,
  amount numeric not null,
  status condo_fee_status_t not null default 'a_vencer',
  paid_at timestamptz,
  receipt_document_id uuid references documents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_condo_fees_tenancy on condo_fees(tenancy_id);
create index idx_condo_fees_unit on condo_fees(unit_id);
create index idx_condo_fees_status on condo_fees(status);
create index idx_condo_fees_ref on condo_fees(reference_month);

create table condo_expenses (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  condo_id uuid not null references condos(id) on delete cascade,
  reference_month text not null,
  description text not null,
  total_amount numeric not null,
  apportionment apportionment_t not null default 'igual',
  status condo_expense_status_t not null default 'lancada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_condo_expenses_tenancy on condo_expenses(tenancy_id);
create index idx_condo_expenses_condo on condo_expenses(condo_id);

create table condo_meetings (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  condo_id uuid not null references condos(id) on delete cascade,
  date date not null,
  kind meeting_kind_t not null default 'ordinaria',
  summary text,
  ata_document_id uuid references documents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_condo_meetings_tenancy on condo_meetings(tenancy_id);

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------
create table crm_leads (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  client_id uuid references clients(id),
  source lead_source_t not null,
  interest lead_interest_t not null,
  assigned_to_user_id uuid references users(id),
  funnel_stage funnel_stage_t not null default 'novo',
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_leads_tenancy on crm_leads(tenancy_id);
create index idx_leads_stage on crm_leads(funnel_stage);
create index idx_leads_assigned on crm_leads(assigned_to_user_id);

create table crm_activities (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  lead_id uuid not null references crm_leads(id) on delete cascade,
  kind activity_kind_t not null,
  description text,
  scheduled_at timestamptz,
  done_at timestamptz,
  by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_activities_tenancy on crm_activities(tenancy_id);
create index idx_activities_lead on crm_activities(lead_id);

-- ---------------------------------------------------------------------------
-- WhatsApp
-- ---------------------------------------------------------------------------
create table whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  client_id uuid references clients(id),
  phone text not null,
  last_message_at timestamptz not null default now(),
  assigned_to_user_id uuid references users(id),
  status conversation_status_t not null default 'aberta',
  triage_classification triage_t,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_conversations_tenancy on whatsapp_conversations(tenancy_id);
create index idx_conversations_phone on whatsapp_conversations(phone);

create table whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  conversation_id uuid not null references whatsapp_conversations(id) on delete cascade,
  direction message_direction_t not null,
  body text not null,
  media_url text,
  template_key text,
  external_id text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  sent_by message_sender_t not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index idx_messages_tenancy on whatsapp_messages(tenancy_id);
create index idx_messages_conversation on whatsapp_messages(conversation_id);
