create or replace function public.prevent_last_owner_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_owners integer;
begin
  if old.role <> 'owner' or old.is_active is not true then
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

drop trigger if exists garden_members_prevent_last_owner_update on public.garden_members;
create trigger garden_members_prevent_last_owner_update
before update of role, is_active on public.garden_members
for each row execute function public.prevent_last_owner_loss();

drop trigger if exists garden_members_prevent_last_owner_delete on public.garden_members;
create trigger garden_members_prevent_last_owner_delete
before delete on public.garden_members
for each row execute function public.prevent_last_owner_loss();
