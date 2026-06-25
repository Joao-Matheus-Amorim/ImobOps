-- ImobOps — 006 harden JWT helper functions
-- Pin search_path on the auth_* helpers so they cannot be hijacked by a malicious
-- schema on the session search_path. Clears the Supabase security advisor WARN
-- (function_search_path_mutable). auth_app_user_id needs `public` because it reads
-- the users table; the others only call the built-in auth.jwt().

alter function auth_tenancy_id() set search_path = '';
alter function auth_role() set search_path = '';
alter function auth_app_user_id() set search_path = public;
