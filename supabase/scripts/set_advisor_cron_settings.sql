-- Persist the two settings the daily-advisor pg_cron job reads at run time.
--
-- Run with psql -f and both variables supplied:
--   psql -v url='https://…/advisor/cron/run-due' -v secret='…' \
--        -f supabase/scripts/set_advisor_cron_settings.sql
--
-- A file rather than `psql -c`: variable interpolation (`:'url'`) only happens
-- for commands read from a file or stdin, and passing the secret this way keeps
-- it out of the process command line.
--
-- ALTER DATABASE rather than set_config, which lasts only for the session.
-- Re-running overwrites, so this is safe to repeat.

alter database postgres set app.salli_advisor_url = :'url';
alter database postgres set app.salli_cron_secret = :'secret';
