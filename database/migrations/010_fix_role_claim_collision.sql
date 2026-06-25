-- The access token hook was overwriting the standard `role` claim (which
-- PostgREST/GoTrue require to be the literal Postgres role "authenticated")
-- with the application role (e.g. "admin"). That made PostgREST attempt
-- `SET ROLE admin`, which doesn't exist as a database role, causing every
-- REST request to fail with 401. Move the app role to its own claim.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
  v_tenancy uuid;
  v_role text;
begin
  select u.tenancy_id, u.role::text
    into v_tenancy, v_role
  from public.users u
  where u.auth_user_id = (event ->> 'user_id')::uuid
    and u.active = true
  limit 1;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  if v_tenancy is not null then
    claims := jsonb_set(claims, '{tenancy_id}', to_jsonb(v_tenancy::text));
    claims := jsonb_set(claims, '{app_role}', to_jsonb(coalesce(v_role, 'viewer')));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

create or replace function public.auth_role() returns text
  language sql stable
  set search_path = ''
  as $$
    select coalesce(auth.jwt() ->> 'app_role', 'viewer')
  $$;
