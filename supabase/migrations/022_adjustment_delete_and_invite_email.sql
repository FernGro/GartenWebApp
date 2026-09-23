-- 1. Owner und Admins koennen Korrekturen (member_adjustments) loeschen, z. B. versehentlich doppelte Eintraege.
-- 2. Einladungen mit eingetragener E-Mail funktionieren nur fuer genau diese E-Mail.

drop policy if exists "member adjustments delete admins" on public.member_adjustments;
create policy "member adjustments delete admins"
on public.member_adjustments for delete
using (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));

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
