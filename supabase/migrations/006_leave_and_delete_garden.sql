-- Fix: prevent_last_owner_loss returned NEW (= NULL) in the DELETE branch for non-owner rows,
-- which silently cancelled every delete for members/inactive owners via BEFORE DELETE trigger.
create or replace function public.prevent_last_owner_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_owners integer;
begin
  -- When the parent garden is already gone (cascade delete), allow all member deletions.
  if tg_op = 'DELETE' and not exists (
    select 1 from public.gardens where id = old.garden_id
  ) then
    return old;
  end if;

  -- Only enforce when an active owner row is being changed.
  if old.role <> 'owner' or old.is_active is not true then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    select count(*)
    into remaining_owners
    from public.garden_members
    where garden_id = old.garden_id
      and role = 'owner'
      and is_active = true
      and id <> old.id;

    if remaining_owners = 0 then
      raise exception 'A garden must keep at least one active owner';
    end if;

    return old;
  end if;

  if new.role <> 'owner' or new.is_active is not true then
    select count(*)
    into remaining_owners
    from public.garden_members
    where garden_id = old.garden_id
      and role = 'owner'
      and is_active = true
      and id <> old.id;

    if remaining_owners = 0 then
      raise exception 'A garden must keep at least one active owner';
    end if;
  end if;

  return new;
end;
$$;

-- Member leaves their own garden (trigger prevents last active owner from leaving).
create or replace function public.leave_garden(target_garden_id uuid)
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
  ) then
    raise exception 'Not a member of this garden';
  end if;

  delete from public.garden_members
  where garden_id = target_garden_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.leave_garden(uuid) to authenticated;

-- Active owner deletes the entire garden (cascade removes all related data).
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
      and role = 'owner'
      and is_active = true
  ) then
    raise exception 'Only active owners can delete a garden';
  end if;

  delete from public.gardens where id = target_garden_id;
end;
$$;

grant execute on function public.delete_garden(uuid) to authenticated;
