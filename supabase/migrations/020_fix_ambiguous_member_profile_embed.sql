-- Fixes fuer 019.
-- 1. Die zusaetzliche FK garden_members.replaces_user_id -> profiles machte die PostgREST-Einbettung
--    profiles(...) mehrdeutig (HTTP 300). Die App sah dadurch keine Mitglieder und behandelte
--    Owner/Admins wie normale Mitglieder. Die Spalte bleibt, nur die FK entfaellt.
-- 2. Ersetzen des letzten Owners uebergibt die Owner-Rolle, statt die Annahme scheitern zu lassen.
-- 3. Owner duerfen nur ueber Einladungen von Owners ersetzt werden (Pruefung bei Annahme).
-- 4. Wer schon Mitglied ist, uebernimmt beim Annehmen keinen fremden Platz.
-- 5. Abschluss: alter Zeitraum endet gestern, neuer beginnt heute (nichts faellt zwischen die Zeitraeume).
-- 6. Datumswerte nach deutscher Zeit.

alter table public.garden_members drop constraint if exists garden_members_replaces_user_id_fkey;
alter table public.garden_invites drop constraint if exists garden_invites_replaces_user_id_fkey;

create or replace function public.replace_garden_member(target_garden_id uuid, new_user_id uuid, old_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_member public.garden_members%rowtype;
  today date := (now() at time zone 'Europe/Berlin')::date;
begin
  if new_user_id = old_user_id then
    raise exception 'A member cannot replace themselves';
  end if;

  select * into old_member
  from public.garden_members
  where garden_id = target_garden_id and user_id = old_user_id;

  if old_member.id is null then
    raise exception 'Replaced person is not a member of this garden';
  end if;

  update public.garden_members
  set slot_id = old_member.slot_id,
      replaces_user_id = old_user_id,
      joined_on = today,
      left_on = null
  where garden_id = target_garden_id and user_id = new_user_id;

  if old_member.role = 'owner' and old_member.is_active and not exists (
    select 1 from public.garden_members
    where garden_id = target_garden_id and role = 'owner' and is_active and user_id <> old_user_id
  ) then
    update public.garden_members
    set role = 'owner'
    where garden_id = target_garden_id and user_id = new_user_id;
  end if;

  update public.garden_members
  set is_active = false,
      left_on = coalesce(left_on, today - 1)
  where id = old_member.id;

  update public.tasks
  set assigned_to = new_user_id,
      status = case when status = 'open' then 'assigned'::task_status else status end
  where garden_id = target_garden_id
    and assigned_to = old_user_id
    and status in ('open', 'assigned', 'overdue', 'postponed');
end;
$$;

revoke execute on function public.replace_garden_member(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.accept_garden_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.garden_invites%rowtype;
  existing_role garden_role;
  next_role garden_role;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into invite_row
  from public.garden_invites
  where token = invite_token
    and accepted_at is null
    and expires_at > now()
  limit 1;

  if invite_row.id is null then
    raise exception 'Invite not found or expired';
  end if;

  select role
  into existing_role
  from public.garden_members
  where garden_id = invite_row.garden_id
    and user_id = auth.uid()
  limit 1;

  if existing_role is null then
    next_role := invite_row.role;
  elsif public.role_rank(existing_role) >= public.role_rank(invite_row.role) then
    next_role := existing_role;
  else
    next_role := invite_row.role;
  end if;

  if existing_role is null
    and invite_row.replaces_user_id is not null
    and exists (
      select 1 from public.garden_members
      where garden_id = invite_row.garden_id and user_id = invite_row.replaces_user_id and role = 'owner' and is_active
    )
    and not exists (
      select 1 from public.garden_members
      where garden_id = invite_row.garden_id and user_id = invite_row.created_by and role = 'owner' and is_active
    ) then
    raise exception 'Only owners can replace an owner';
  end if;

  insert into public.garden_members (garden_id, user_id, role, is_active, joined_on)
  values (invite_row.garden_id, auth.uid(), next_role, true, (now() at time zone 'Europe/Berlin')::date)
  on conflict (garden_id, user_id)
  do update set
    is_active = true,
    role = next_role,
    joined_on = case when public.garden_members.is_active then public.garden_members.joined_on else excluded.joined_on end,
    left_on = null;

  if existing_role is null and invite_row.replaces_user_id is not null and invite_row.replaces_user_id <> auth.uid() then
    perform public.replace_garden_member(invite_row.garden_id, auth.uid(), invite_row.replaces_user_id);
  end if;

  update public.garden_invites
  set accepted_by = auth.uid(), accepted_at = now()
  where id = invite_row.id;

  return invite_row.garden_id;
end;
$$;

revoke execute on function public.accept_garden_invite(uuid) from public, anon;
grant execute on function public.accept_garden_invite(uuid) to authenticated;

create or replace function public.close_billing_period(target_garden_id uuid, period_snapshot jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  open_period public.billing_periods%rowtype;
  today date := (now() at time zone 'Europe/Berlin')::date;
  next_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_garden_role(target_garden_id, array['owner','admin']::garden_role[]) then
    raise exception 'Insufficient permissions';
  end if;

  select * into open_period
  from public.billing_periods
  where garden_id = target_garden_id and ends_on is null
  for update;

  if open_period.id is null then
    raise exception 'No open billing period';
  end if;

  if today - 1 < open_period.starts_on then
    raise exception 'Billing period started today and cannot be closed yet';
  end if;

  update public.billing_periods
  set ends_on = today - 1,
      closed_at = now(),
      closed_by = auth.uid(),
      snapshot = period_snapshot
  where id = open_period.id;

  insert into public.billing_periods (garden_id, starts_on)
  values (target_garden_id, today)
  returning id into next_id;

  return next_id;
end;
$$;

revoke execute on function public.close_billing_period(uuid, jsonb) from public, anon;
grant execute on function public.close_billing_period(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
