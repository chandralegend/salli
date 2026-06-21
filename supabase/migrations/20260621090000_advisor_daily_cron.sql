-- Daily Wealth Advisor schedule (Supabase pg_cron → API).
--
-- The API URL and cron secret are NOT hard-coded here (no secrets in git). Set them
-- once per environment as database settings, then this job reads them at run time:
--
--   ALTER DATABASE postgres SET app.salli_advisor_url = 'https://api.salli.lk/advisor/cron/run-due';
--   ALTER DATABASE postgres SET app.salli_cron_secret = '<CRON_SECRET>';
--
-- Local dev: url = 'http://host.docker.internal:8000/advisor/cron/run-due'
-- If the settings are unset the job simply no-ops (safe).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-running this migration replaces the schedule cleanly.
select cron.unschedule('salli-daily-advisor')
where exists (select 1 from cron.job where jobname = 'salli-daily-advisor');

-- 06:00 UTC daily. The job fires the secured endpoint, which fans out to due paid users.
select cron.schedule(
  'salli-daily-advisor',
  '0 6 * * *',
  $job$
  select
    case
      when current_setting('app.salli_advisor_url', true) is null then null
      else net.http_post(
        url     := current_setting('app.salli_advisor_url', true),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Cron-Secret', coalesce(current_setting('app.salli_cron_secret', true), '')
        ),
        body    := '{}'::jsonb
      )
    end;
  $job$
);
