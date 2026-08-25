-- The scheduled job itself is provisioned by scripts/setup-supabase-keep-alive.ts.
-- Keeping extensions in a migration makes the database capability reproducible,
-- while the script injects environment-specific secrets into Supabase Vault.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
