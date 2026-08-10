-- Admin moderation RPCs.
--
-- content_reports has RLS enabled with no policies, so it is unreachable from
-- the API by design. That kept the queue private but also meant the only way to
-- act on a report was pasting SQL into the dashboard. These functions give the
-- operator a reachable, auditable path without opening the table up: each one
-- is SECURITY DEFINER and refuses to run unless is_admin() is true for the
-- caller, so the table stays invisible to everyone else.
--
-- Deliberately only two actions. "Remove" makes the entry private rather than
-- deleting it, so a mistaken removal is reversible and the author does not lose
-- their writing. Banning is not here: it needs enforcement across sign-in and
-- every feed RPC, and a half-built ban is worse than none. Use the dashboard's
-- auth controls for that until it is designed properly.

-- ── Read the queue ────────────────────────────────────────────────────
create or replace function public.admin_list_reports(p_status text default 'open')
returns table (
  report_id uuid,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  post_id uuid,
  post_title text,
  post_excerpt text,
  post_is_private boolean,
  author_username text,
  reporter_username text,
  report_count bigint
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return query
  select
    r.id,
    r.reason,
    r.details,
    r.status,
    r.created_at,
    r.post_id,
    p.title,
    left(p.content, 600),
    p.is_private,
    author.username,
    reporter.username,
    (select count(*) from public.content_reports c2 where c2.post_id = r.post_id)
  from public.content_reports r
  left join public.posts p on p.id = r.post_id
  left join public.profiles author on author.id = r.reported_user_id
  left join public.profiles reporter on reporter.id = r.reporter_id
  where p_status is null or r.status = p_status
  order by r.created_at desc;
end;
$$;

-- ── Act on one report ─────────────────────────────────────────────────
-- p_action: 'remove'  -> hide the entry (reversible) and mark actioned
--           'dismiss' -> leave the entry alone, mark dismissed
create or replace function public.admin_resolve_report(p_report_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_post_id uuid;
  v_new_status text;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if p_action not in ('remove', 'dismiss') then
    raise exception 'unknown action: %', p_action;
  end if;

  select post_id into v_post_id
  from public.content_reports
  where id = p_report_id;

  if v_post_id is null then
    raise exception 'report not found';
  end if;

  if p_action = 'remove' then
    update public.posts set is_private = true where id = v_post_id;
    v_new_status := 'actioned';
  else
    v_new_status := 'dismissed';
  end if;

  update public.content_reports set status = v_new_status where id = p_report_id;
  return v_new_status;
end;
$$;

revoke all on function public.admin_list_reports(text) from public, anon;
revoke all on function public.admin_resolve_report(uuid, text) from public, anon;
grant execute on function public.admin_list_reports(text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text) to authenticated;
