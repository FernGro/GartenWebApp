create or replace function public.role_rank(target_role garden_role)
returns integer
language sql
immutable
as $$
  select case target_role
    when 'owner' then 3
    when 'admin' then 2
    else 1
  end;
$$;

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

  insert into public.garden_members (garden_id, user_id, role, is_active)
  values (invite_row.garden_id, auth.uid(), next_role, true)
  on conflict (garden_id, user_id)
  do update set is_active = true, role = next_role;

  update public.garden_invites
  set accepted_by = auth.uid(), accepted_at = now()
  where id = invite_row.id;

  return invite_row.garden_id;
end;
$$;

create or replace function public.restore_garden_creator_owner(target_garden_id uuid)
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
    select 1
    from public.gardens
    where id = target_garden_id
      and created_by = auth.uid()
  ) then
    raise exception 'Only the garden creator can restore owner role';
  end if;

  insert into public.garden_members (garden_id, user_id, role, is_active)
  values (target_garden_id, auth.uid(), 'owner', true)
  on conflict (garden_id, user_id)
  do update set role = 'owner', is_active = true;
end;
$$;

grant execute on function public.role_rank(garden_role) to authenticated;
grant execute on function public.restore_garden_creator_owner(uuid) to authenticated;
