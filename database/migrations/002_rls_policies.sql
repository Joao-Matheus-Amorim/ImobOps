-- ImobOps — 002 RLS policies
-- Every table is isolated by tenancy_id taken from the JWT. Some tables get
-- refined per-scope policies (e.g. brokers see only their own clients).
--
-- The JWT is expected to carry a custom claim `tenancy_id` and `role`. Set these
-- via a Supabase auth hook / custom access token claims. Helper accessors below.

-- ---------------------------------------------------------------------------
-- JWT helpers
-- ---------------------------------------------------------------------------
create or replace function auth_tenancy_id() returns uuid
  language sql stable as $$
    select nullif(auth.jwt() ->> 'tenancy_id','')::uuid
  $$;

create or replace function auth_role() returns text
  language sql stable as $$
    select coalesce(auth.jwt() ->> 'role','viewer')
  $$;

-- The app user's id (users.id) for the current JWT.
create or replace function auth_app_user_id() returns uuid
  language sql stable as $$
    select id from users where auth_user_id = auth.uid() limit 1
  $$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table tenancies               enable row level security;
alter table users                   enable row level security;
alter table clients                 enable row level security;
alter table properties              enable row level security;
alter table documents               enable row level security;
alter table rental_contracts        enable row level security;
alter table installments            enable row level security;
alter table repasses                enable row level security;
alter table sale_listings           enable row level security;
alter table proposals               enable row level security;
alter table sale_contracts          enable row level security;
alter table commissions             enable row level security;
alter table condos                  enable row level security;
alter table units                   enable row level security;
alter table condo_fees              enable row level security;
alter table condo_expenses          enable row level security;
alter table condo_meetings          enable row level security;
alter table crm_leads               enable row level security;
alter table crm_activities          enable row level security;
alter table whatsapp_conversations  enable row level security;
alter table whatsapp_messages       enable row level security;

-- ---------------------------------------------------------------------------
-- Tenancy isolation (default policy on every business table)
-- ---------------------------------------------------------------------------
create policy tenancy_isolation on users
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on properties
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on documents
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on rental_contracts
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on installments
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on repasses
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on sale_listings
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on proposals
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on sale_contracts
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on commissions
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on condos
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on units
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on condo_fees
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on condo_expenses
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on condo_meetings
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on crm_activities
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on whatsapp_conversations
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());
create policy tenancy_isolation on whatsapp_messages
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());

-- tenancies: a user sees only their own tenancy.
create policy tenancy_self on tenancies
  for select using (id = auth_tenancy_id());

-- ---------------------------------------------------------------------------
-- Refined scope policies
-- ---------------------------------------------------------------------------
-- Clients: tenancy isolation + brokers see only their own (owner_user_id). Admin,
-- manager, finance, condo_admin and viewer see all within the tenancy.
create policy clients_scope on clients
  for all
  using (
    tenancy_id = auth_tenancy_id()
    and (
      auth_role() <> 'broker'
      or owner_user_id = auth_app_user_id()
    )
  )
  with check (
    tenancy_id = auth_tenancy_id()
    and (
      auth_role() <> 'broker'
      or owner_user_id = auth_app_user_id()
    )
  );

-- CRM leads: brokers see only leads assigned to them.
create policy leads_scope on crm_leads
  for all
  using (
    tenancy_id = auth_tenancy_id()
    and (
      auth_role() <> 'broker'
      or assigned_to_user_id = auth_app_user_id()
    )
  )
  with check (
    tenancy_id = auth_tenancy_id()
    and (
      auth_role() <> 'broker'
      or assigned_to_user_id = auth_app_user_id()
    )
  );

-- NOTE: more granular per-feature overrides are enforced in the application layer
-- (lib/permissions/enforce.ts) on top of these RLS policies. RLS is the hard
-- tenancy + base-scope boundary; the app refines actions (create/edit/delete) and
-- applies user_feature_permissions overrides.
