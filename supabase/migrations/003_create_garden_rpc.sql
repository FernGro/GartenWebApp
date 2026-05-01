create or replace function public.create_garden_with_owner(garden_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_garden_id uuid;
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if garden_name is null or length(trim(garden_name)) = 0 then
    raise exception 'Garden name is required';
  end if;

  insert into public.profiles (id, display_name)
  values (current_user_id, 'Gartenmitglied')
  on conflict (id) do nothing;

  insert into public.gardens (name, created_by)
  values (trim(garden_name), current_user_id)
  returning id into new_garden_id;

  insert into public.garden_members (garden_id, user_id, role, is_active)
  values (new_garden_id, current_user_id, 'owner', true)
  on conflict (garden_id, user_id)
  do update set role = 'owner', is_active = true;

  return new_garden_id;
end;
$$;

grant execute on function public.create_garden_with_owner(text) to authenticated;
