-- Enable pg_net for HTTP calls from pg_cron
create extension if not exists pg_net with schema extensions;

-- Schedule Vista sync every 6 hours
select cron.schedule(
  'sync-vista-6h',
  '0 */6 * * *',
  $$
    select extensions.http_post(
      url     := 'https://sxanvsejlrbacjzeyqln.supabase.co/functions/v1/sync-vista-properties',
      headers := '{"Content-Type": "application/json"}'::extensions.http_header[],
      content := '{}',
      content_type := 'application/json'
    );
  $$
);
