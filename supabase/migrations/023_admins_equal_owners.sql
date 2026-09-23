-- Admins haben dieselben Rechte wie Owner: Owner-Rolle vergeben/entziehen, Owner ersetzen, Garten loeschen.
-- Weiterhin gilt: Jeder Garten behaelt mindestens einen aktiven Owner (Trigger prevent_last_owner_loss);
-- wird der letzte Owner ersetzt, uebernimmt der Nachfolger die Owner-Rolle (replace_garden_member aus 020).

create or replace function public.guard_garden_member_owner_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return coalesce(new, old);
  end if;

  if public.has_garden_role(coalesce(new.garden_id, old.garden_id), array['owner','admin']::garden_role[]) then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'owner' and not (
      new.user_id = auth.uid()
      and exists (select 1 from public.gardens g where g.id = new.garden_id and g.created_by = auth.uid())
    ) then
      raise exception 'Only owners can grant owner role';
    end if;

    return new;
  end if;

  if (old.role = 'owner' or new.role = 'owner')
    and (
      new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.user_id is distinct from old.user_id
      or new.garden_id is distinct from old.garden_id
    ) then
    raise exception 'Only owners can change owner memberships';
  end if;

  return new;
end;
$$;

drop policy if exists "garden invites create admins" on public.garden_invites;
create policy "garden invites create admins"
on public.garden_invites for insert
with check (
  public.has_garden_role(garden_id, array['owner','admin']::garden_role[])
  and created_by = auth.uid()
);

create or replace function public.guard_invite_replacement()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.replaces_user_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.garden_members
    where garden_id = new.garden_id and user_id = new.replaces_user_id
  ) then
    raise exception 'Replaced person is not a member of this garden';
  end if;

  if exists (
    select 1 from public.garden_members
    where garden_id = new.garden_id and user_id = new.replaces_user_id and role = 'owner' and is_active = true
  ) and not public.has_garden_role(new.garden_id, array['owner','admin']::garden_role[]) then
    raise exception 'Only owners can replace an owner';
  end if;

  return new;
end;
$$;

create or replace function public.add_prepared_garden_member(
  target_garden_id uuid,
  target_user_id uuid,
  target_role garden_role,
  replaces_user uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_garden_role(target_garden_id, array['owner','admin']::garden_role[]) then
    raise exception 'Insufficient permissions';
  end if;

  if target_role = 'owner' and not public.has_garden_role(target_garden_id, array['owner','admin']::garden_role[]) then
    raise exception 'Only owners can grant owner role';
  end if;

  if replaces_user is not null and exists (
    select 1 from public.garden_members
    where garden_id = target_garden_id and user_id = replaces_user and role = 'owner' and is_active = true
  ) and not public.has_garden_role(target_garden_id, array['owner','admin']::garden_role[]) then
    raise exception 'Only owners can replace an owner';
  end if;

  if exists (select 1 from public.garden_members where user_id = target_user_id) then
    raise exception 'Person is already member of a garden';
  end if;

  insert into public.garden_members (garden_id, user_id, role, is_active)
  values (target_garden_id, target_user_id, target_role, true);

  if replaces_user is not null then
    perform public.replace_garden_member(target_garden_id, target_user_id, replaces_user);
  end if;
end;
$$;

revoke execute on function public.add_prepared_garden_member(uuid, uuid, garden_role, uuid) from public, anon;
grant execute on function public.add_prepared_garden_member(uuid, uuid, garden_role, uuid) to authenticated;

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

  if invite_row.email is not null
    and lower(trim(invite_row.email)) <> lower(coalesce((select email from auth.users where id = auth.uid()), '')) then
    raise exception 'Invite is for another email address';
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
      where garden_id = invite_row.garden_id and user_id = invite_row.created_by and role in ('owner', 'admin') and is_active
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

create or replace function public.delete_garden(target_garden_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.garden_members
    where garden_id = target_garden_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and is_active = true
  ) then
    raise exception 'Only owners and admins can delete a garden';
  end if;

  delete from public.gardens where id = target_garden_id;
end;
$$;

revoke execute on function public.delete_garden(uuid) from public, anon;
grant execute on function public.delete_garden(uuid) to authenticated;
