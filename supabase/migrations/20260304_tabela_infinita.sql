-- Cria a tabela para manter o projeto Supabase ativo
CREATE TABLE IF NOT EXISTS "tabelaInfinita" (
  ping_at timestamptz NOT NULL DEFAULT now()
);

-- Habilita a extensão pg_cron (necessária para jobs agendados)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove o job caso já exista (idempotente)
SELECT cron.unschedule('ping-tabela-infinita')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ping-tabela-infinita'
);

-- Agenda job diário: insere uma linha e remove todas as anteriores
SELECT cron.schedule(
  'ping-tabela-infinita',
  '0 12 * * *',  -- todos os dias ao meio-dia UTC
  $$
    INSERT INTO "tabelaInfinita" (ping_at) VALUES (now());
    DELETE FROM "tabelaInfinita" WHERE ping_at < now() - interval '1 day';
  $$
);
