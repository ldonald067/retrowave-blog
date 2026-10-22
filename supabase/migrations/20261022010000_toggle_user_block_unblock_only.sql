-- toggle_user_block can only unblock (2026-10-22, findings 115 and 116 of that
-- day's /adversarial-review).
--
-- It blocked any user id it was given, and flipped: a block where there was
-- none, an unblock where there was one.
--
-- 115: an entry's owner can read the user_id of everyone who reacted to it
-- (post_reactions' SELECT policy), and get_blocked_users (20261017000000)
-- returns the name of anyone blocked whose page is public. Blocking each
-- reactor id, reading the list and toggling back named who reacted -- which
-- the app shows only as counts -- and the reactor never knew. get_blocked_users
-- is prod's only id-to-username function (queried 2026-10-22).
--
-- 116: the safety tab's unblock button calls this. A double tap, or withRetry
-- resending after a lost response, flipped the block straight back on while
-- the list and the toast said unblocked.
--
-- The app never blocks by id: the block button on a public page calls
-- block_user_by_username (20260729000000), which needs the name. So this keeps
-- its name, argument and return shape -- the shipped client works unchanged,
-- before and after the paste -- and only deletes the caller's block on that id.
-- A repeat call leaves the same state, and an id can no longer be blocked
-- without its username, so get_blocked_users names no one the caller could not
-- already name.
--
-- EXECUTE was granted to PUBLIC and anon as well as authenticated (read from
-- prod 2026-10-22; it raised for anon anyway). anon is revoked by name, since
-- Supabase's default privileges grant it directly (see 20261008000000).
--
-- The guard stops the whole paste, changing nothing, unless the live body is
-- the toggle read on 2026-10-22 and block_user_by_username exists.

begin;

do $$
begin
  if position('INSERT INTO public.user_blocks' in pg_get_functiondef('public.toggle_user_block(uuid)'::regprocedure)) = 0 then
    raise exception 'toggle_user_block in prod is not the toggle this replaces; nothing changed';
  end if;
  if to_regprocedure('public.block_user_by_username(text)') is null then
    raise exception 'block_user_by_username missing; nothing changed';
  end if;
end
$$;

create or replace function public.toggle_user_block(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.user_blocks
   where blocker_id = v_user_id
     and blocked_id = p_target_user_id;

  return jsonb_build_object('is_blocked', false);
end;
$$;

comment on function public.toggle_user_block(uuid) is
  'Unblock only, despite the name: deletes the caller''s block on this id. Blocks are made by username (block_user_by_username), so an id read off a reaction cannot be blocked to read its name from get_blocked_users (finding 115), and a repeat call leaves the same state (finding 116).';

revoke all on function public.toggle_user_block(uuid) from public, anon;
grant execute on function public.toggle_user_block(uuid) to authenticated;

commit;

notify pgrst, 'reload schema';

-- Verify (read-only; expect true, false, true):
--   select position('insert' in lower(pg_get_functiondef('public.toggle_user_block(uuid)'::regprocedure))) = 0,
--          has_function_privilege('anon', 'public.toggle_user_block(uuid)', 'execute'),
--          has_function_privilege('authenticated', 'public.toggle_user_block(uuid)', 'execute');
--   Behaviour, as authenticated in a DO block that always raises: on an id
--   with no block it inserts nothing and returns is_blocked false; on a
--   blocked id it deletes the block; a second call changes nothing.
