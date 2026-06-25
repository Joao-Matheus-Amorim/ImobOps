-- Backing index for auth_user_id lookups (custom access token hook + login).
create unique index if not exists uniq_users_auth_user
  on public.users (auth_user_id)
  where auth_user_id is not null;
