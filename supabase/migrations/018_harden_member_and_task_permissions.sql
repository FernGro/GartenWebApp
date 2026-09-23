-- Schliesst Rechte-Luecken, die ueber direkte API-Aufrufe (PostgREST) an den Server Actions vorbei ausnutzbar waren:
-- 1. Admins konnten sich selbst zum Owner machen oder Owner herabstufen/deaktivieren.
-- 2. Admins konnten Owner-Einladungen erzeugen.
-- 3. Mitglieder konnten beliebige Aufgabenfelder aendern (z.B. Punkte, fremde Zuweisung).
-- 4. Mitglieder konnten Uebernahme-Anfragen direkt als "approved" anlegen.
-- Die Guard-Trigger laufen als security invoker: nur so sieht current_user die Rolle 'authenticated'.
-- Security-definer-RPCs, Cron (service_role) und Admin-Client bleiben dadurch unberuehrt.

create or replace function public.guard_garden_member_owner_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return coalesce(new, old);
  end if;

  if public.has_garden_role(coalesce(new.garden_id, old.garden_id), array['owner']::garden_role[]) then
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

drop trigger if exists garden_members_guard_owner_changes on public.garden_members;
create trigger garden_members_guard_owner_changes
before insert or update on public.garden_members
for each row execute function public.guard_garden_member_owner_changes();

drop policy if exists "garden invites create admins" on public.garden_invites;
create policy "garden invites create admins"
on public.garden_invites for insert
with check (
  public.has_garden_role(garden_id, array['owner','admin']::garden_role[])
  and created_by = auth.uid()
  and (role <> 'owner' or public.has_garden_role(garden_id, array['owner']::garden_role[]))
);

create or replace function public.guard_member_task_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if public.has_garden_role(old.garden_id, array['owner','admin']::garden_role[]) then
    return new;
  end if;

  if new.garden_id is distinct from old.garden_id
    or new.template_id is distinct from old.template_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.points is distinct from old.points
    or new.due_date is distinct from old.due_date
    or new.created_by is distinct from old.created_by
    or new.original_assignee is distinct from old.original_assignee then
    raise exception 'Only owners/admins can edit task details';
  end if;

  if (new.assignment_locked is distinct from old.assignment_locked
      or new.locked_by is distinct from old.locked_by
      or new.locked_at is distinct from old.locked_at)
    and not (old.assigned_to = auth.uid() and new.assignment_locked = true and new.locked_by = auth.uid()) then
    raise exception 'Only the assignee can lock this task';
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    if old.assignment_locked then
      raise exception 'Task assignment is locked';
    end if;

    if not (
      old.assigned_to = auth.uid()
      or (new.assigned_to = auth.uid() and (old.assigned_to is null or old.status in ('open', 'overdue', 'postponed')))
    ) then
      raise exception 'Task can only be taken over via takeover request';
    end if;
  end if;

  if new.status is distinct from old.status
    and (old.status in ('done', 'cancelled') or new.status in ('cancelled', 'open')) then
    raise exception 'Only owners/admins can reopen or cancel tasks';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_guard_member_updates on public.tasks;
create trigger tasks_guard_member_updates
before update on public.tasks
for each row execute function public.guard_member_task_updates();

drop policy if exists "task takeover create members" on public.task_takeover_requests;
create policy "task takeover create members"
on public.task_takeover_requests for insert
with check (
  public.is_garden_member(garden_id)
  and requested_by = auth.uid()
  and (
    status = 'pending'
    or (
      status = 'approved'
      and decided_by = auth.uid()
      and exists (
        select 1 from public.tasks t
        where t.id = task_id and t.status in ('overdue', 'postponed')
      )
    )
  )
);

create or replace function public.is_task_completion_window(target_due_date date)
returns boolean
language sql
stable
set search_path = public
as $$
  select target_due_date is null
    or current_date between target_due_date - interval '7 days' and target_due_date + interval '7 days';
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

grant execute on function public.accept_garden_invite(uuid) to authenticated;
