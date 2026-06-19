-- ImobOps — 004 audit, AI actions, and per-user permission overrides.
-- audit_log and ai_actions are append-only: insert allowed for the user's own
-- tenancy rows; update and delete are blocked by the absence of policies.

-- ---------------------------------------------------------------------------
-- audit_log (append-only)
-- ---------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  user_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload_before jsonb,
  payload_after jsonb,
  at timestamptz not null default now()
);
create index idx_audit_tenancy on audit_log(tenancy_id);
create index idx_audit_entity on audit_log(entity_type, entity_id);
create index idx_audit_at on audit_log(at);

-- ---------------------------------------------------------------------------
-- ai_actions (append-only)
-- ---------------------------------------------------------------------------
create table ai_actions (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  user_id uuid references users(id),
  prompt text not null,
  tool_name text not null,
  tool_params jsonb not null default '{}',
  dry_run boolean not null default false,
  confirmed boolean not null default false,
  result jsonb,
  error text,
  at timestamptz not null default now()
);
create index idx_ai_actions_tenancy on ai_actions(tenancy_id);
create index idx_ai_actions_tool on ai_actions(tool_name);
create index idx_ai_actions_at on ai_actions(at);

-- ---------------------------------------------------------------------------
-- user_feature_permissions (overrides; permission beats role)
-- ---------------------------------------------------------------------------
create type permission_action_t as enum ('view','create','edit','delete');
create type permission_scope_t as enum ('own','team','all');

create table user_feature_permissions (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  feature_key text not null,
  actions permission_action_t[] not null default '{}',
  scope permission_scope_t not null default 'own',
  allowed_member_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature_key)
);
create index idx_ufp_tenancy on user_feature_permissions(tenancy_id);
create index idx_ufp_user on user_feature_permissions(user_id);

-- ---------------------------------------------------------------------------
-- RLS — append-only for logs, tenancy-isolated for permissions
-- ---------------------------------------------------------------------------
alter table audit_log enable row level security;
alter table ai_actions enable row level security;
alter table user_feature_permissions enable row level security;

-- audit_log: select + insert within own tenancy. No update/delete policy ⇒ blocked.
create policy audit_select on audit_log
  for select using (tenancy_id = auth_tenancy_id());
create policy audit_insert on audit_log
  for insert with check (tenancy_id = auth_tenancy_id());

-- ai_actions: same append-only pattern.
create policy ai_actions_select on ai_actions
  for select using (tenancy_id = auth_tenancy_id());
create policy ai_actions_insert on ai_actions
  for insert with check (tenancy_id = auth_tenancy_id());

-- user_feature_permissions: tenancy isolation; only admins may write.
create policy ufp_select on user_feature_permissions
  for select using (tenancy_id = auth_tenancy_id());
create policy ufp_admin_write on user_feature_permissions
  for all
  using (tenancy_id = auth_tenancy_id() and auth_role() = 'admin')
  with check (tenancy_id = auth_tenancy_id() and auth_role() = 'admin');
