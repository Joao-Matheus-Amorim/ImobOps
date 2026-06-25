-- Harden the access token hook against search_path injection. Mirrors the
-- migration applied live to Supabase (version 20260625165344); recreated here
-- so the repo reflects the real database state. Superseded in part by 010,
-- which rewrites the function body (this only pins search_path).
alter function public.custom_access_token_hook(jsonb) set search_path = '';
