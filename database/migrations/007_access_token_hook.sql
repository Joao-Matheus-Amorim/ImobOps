-- Custom Access Token Hook: injects tenancy_id and role into the JWT so RLS
-- policies can read them via auth_tenancy_id()/auth_role() without a query.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_row record;
begin
  select tenancy_id, role
    into user_row
    from public.users
   where auth_user_id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_row is not null then
    claims := jsonb_set(claims, '{tenancy_id}', to_jsonb(user_row.tenancy_id));
    claims := jsonb_set(claims, '{role}', to_jsonb(user_row.role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.users to supabase_auth_admin;

create policy users_auth_admin_read on public.users
  as permissive
  for select
  to supabase_auth_admin
  using (true);
