-- Report notification webhook — the record of dashboard-created state.
--
-- ⚠️ NOT auto-runnable. See "Applying this" at the bottom: the Authorization
-- header needs a real key, which deliberately is not in this file.
--
-- WHY THIS FILE EXISTS
-- Supabase Database Webhooks are created through the dashboard and live only as
-- a Postgres trigger. That is precisely the invisible-config pattern that caused
-- today's outage: profiles.status_message existed in a repo migration that had
-- never been applied, and the app broke for every user with PGRST204 while the
-- repo looked correct. Anything that only exists in the dashboard eventually
-- diverges from the repo, so this records it.
--
-- WHAT IT DOES
--   INSERT into public.content_reports
--     -> supabase_functions.http_request(...)
--     -> POST https://<ref>.supabase.co/functions/v1/notify-report
--     -> Resend -> support@retrowaveblog.com
--
-- Created 2026-08-01 and verified end to end: an anonymous report returned
-- {"reported": true}, pg_net logged status_code 200, and the function returned
-- {"ok":true,"emailed":true}.
--
-- PREREQUISITES (all already satisfied in production)
--   1. pg_net extension — installed via Integrations -> Database Webhooks.
--      Without it supabase_functions.http_request does not exist and the
--      Webhooks UI does not appear at all.
--   2. The notify-report edge function, deployed with JWT verification ON
--      (supabase/functions/notify-report/index.ts).
--   3. RESEND_API_KEY set in Edge Functions -> Secrets.
--
-- SECURITY NOTE — WHY THE KEY IS A PLACEHOLDER
-- The dashboard originally generated this trigger with the SERVICE_ROLE key
-- embedded in the header. That key bypasses all RLS, and pg_get_triggerdef()
-- exposes it to anyone who can read the schema — including anything that can
-- read a database dump or backup. It was swapped for the anon key on
-- 2026-08-01, which is public by design and is all verify_jwt requires; the
-- function touches no tables, so it needs no privileges whatsoever.
--
-- Even the anon key is left out of this file rather than committed. A key
-- pasted into a migration is a key in git history forever, and the anon key can
-- be rotated — at which point a committed copy is both wrong and misleading.

-- ── The trigger ───────────────────────────────────────────────────────
--
-- Replace <PROJECT_REF> and <ANON_KEY> before running. Get them from
-- Project Settings -> API (anon/public key), or:
--   supabase projects list
--
-- DROP TRIGGER IF EXISTS notify_on_report ON public.content_reports;
--
-- CREATE TRIGGER notify_on_report
--   AFTER INSERT ON public.content_reports
--   FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(
--     'https://<PROJECT_REF>.supabase.co/functions/v1/notify-report',
--     'POST',
--     '{"Content-type":"application/json","Authorization":"Bearer <ANON_KEY>"}',
--     '{}',
--     '5000'
--   );

-- ── Verification ──────────────────────────────────────────────────────
--
-- Confirm the trigger exists and which role its key carries:
--   select pg_get_triggerdef(t.oid)
--   from pg_trigger t join pg_class c on c.oid = t.tgrelid
--   where c.relname = 'content_reports' and not t.tgisinternal;
--
-- After filing a test report, confirm the request actually went out:
--   select status_code, content from net._http_response order by created desc limit 1;
-- Expect 200 and {"ok":true,"emailed":true}.

-- ── Guard ─────────────────────────────────────────────────────────────
--
-- Fails loudly if the webhook is missing, so a fresh environment cannot quietly
-- come up without report notifications — the exact failure mode this whole file
-- exists to prevent. Harmless where the trigger is present.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'content_reports'
      AND t.tgname = 'notify_on_report'
      AND NOT t.tgisinternal
  ) THEN
    RAISE WARNING
      'notify_on_report webhook is MISSING on public.content_reports. Content reports will be stored but nobody will be notified (App Review Guideline 1.2 expects a timely response). Recreate it using the commented CREATE TRIGGER in %',
      '20260801000000_report_notification_webhook.sql';
  END IF;
END $$;
