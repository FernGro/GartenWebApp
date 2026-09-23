-- Mitbewohner-Wechsel: Plaetze (Teams), Ein-/Auszugsdatum, Einladungen mit "ersetzt",
-- vorab angelegte Personen und Abrechnungszeitraeume.
-- Spec: docs/superpowers/specs/2026-09-23-mitbewohner-wechsel-design.md

alter table public.garden_members
  add column if not exists slot_id uuid not null default gen_random_uuid(),
  add column if not exists joined_on date not null default current_date,
  add column if not exists left_on date,
  add column if not exists replaces_user_id uuid references public.profiles(id) on delete set null;

update public.garden_members
set joined_on = (joined_at at time zone 'Europe/Berlin')::date
where joined_on = current_date
  and joined_at < now() - interval '1 day';

update public.garden_members
set left_on = current_date
where is_active = false
  and left_on is null;

alter table public.garden_invites
  add column if not exists replaces_user_id uuid references public.profiles(id) on delete set null;

create table if not exists public.billing_periods (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete set null,
  snapshot jsonb,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create unique index if not exists billing_periods_one_open_idx
on public.billing_periods(garden_id)
where ends_on is null;

create index if not exists billing_periods_garden_idx on public.billing_periods(garden_id, starts_on);

alter table public.billing_periods enable row level security;

drop policy if exists "billing periods read members" on public.billing_periods;
create policy "billing periods read members"
on public.billing_periods for select
to authenticated
using (public.is_garden_member(garden_id));

insert into public.billing_periods (garden_id, starts_on)
select g.id, (g.created_at at time zone 'Europe/Berlin')::date
from public.gardens g
where not exists (select 1 from public.billing_periods p where p.garden_id = g.id and p.ends_on is null);

create or replace function public.create_initial_billing_period()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.billing_periods (garden_id, starts_on)
  values (new.id, (new.created_at at time zone 'Europe/Berlin')::date)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists gardens_create_initial_billing_period on public.gardens;
create trigger gardens_create_initial_billing_period
after insert on public.gardens
for each row execute function public.create_initial_billing_period();

-- Interne Hilfsfunktion: nur aus anderen security-definer-Funktionen aufrufbar.
create or replace function public.replace_garden_member(target_garden_id uuid, new_user_id uuid, old_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_member public.garden_members%rowtype;
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
      joined_on = current_date,
      left_on = null
  where garden_id = target_garden_id and user_id = new_user_id;

  update public.garden_members
  set is_active = false,
      left_on = coalesce(left_on, current_date - 1)
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

  insert into public.garden_members (garden_id, user_id, role, is_active)
  values (invite_row.garden_id, auth.uid(), next_role, true)
  on conflict (garden_id, user_id)
  do update set is_active = true, role = next_role, left_on = null;

  if invite_row.replaces_user_id is not null and invite_row.replaces_user_id <> auth.uid() then
    perform public.replace_garden_member(invite_row.garden_id, auth.uid(), invite_row.replaces_user_id);
  end if;

  update public.garden_invites
  set accepted_by = auth.uid(), accepted_at = now()
  where id = invite_row.id;

  return invite_row.garden_id;
end;
$$;

grant execute on function public.accept_garden_invite(uuid) to authenticated;

-- Einladungen mit "ersetzt": Owner koennen nur von Owner-Einladungen ersetzt werden.
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
  ) and not public.has_garden_role(new.garden_id, array['owner']::garden_role[]) then
    raise exception 'Only owners can replace an owner';
  end if;

  return new;
end;
$$;

drop trigger if exists garden_invites_guard_replacement on public.garden_invites;
create trigger garden_invites_guard_replacement
before insert or update of replaces_user_id on public.garden_invites
for each row execute function public.guard_invite_replacement();

-- Vorab angelegte Person (Konto wird vorher per Admin-API erzeugt) in den Garten aufnehmen.
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

  if target_role = 'owner' and not public.has_garden_role(target_garden_id, array['owner']::garden_role[]) then
    raise exception 'Only owners can grant owner role';
  end if;

  if replaces_user is not null and exists (
    select 1 from public.garden_members
    where garden_id = target_garden_id and user_id = replaces_user and role = 'owner' and is_active = true
  ) and not public.has_garden_role(target_garden_id, array['owner']::garden_role[]) then
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

-- Abrechnung abschliessen: Snapshot speichern und naechsten Zeitraum oeffnen (atomar).
create or replace function public.close_billing_period(target_garden_id uuid, period_snapshot jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  open_period public.billing_periods%rowtype;
  closing_day date := (now() at time zone 'Europe/Berlin')::date;
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

  update public.billing_periods
  set ends_on = closing_day,
      closed_at = now(),
      closed_by = auth.uid(),
      snapshot = period_snapshot
  where id = open_period.id;

  insert into public.billing_periods (garden_id, starts_on)
  values (target_garden_id, closing_day + 1)
  returning id into next_id;

  return next_id;
end;
$$;

revoke execute on function public.close_billing_period(uuid, jsonb) from public, anon;
grant execute on function public.close_billing_period(uuid, jsonb) to authenticated;

-- Advisor-Hinweise: security-definer-Funktionen nicht fuer anonyme Aufrufe freigeben.
revoke execute on function public.accept_garden_invite(uuid) from public, anon;
revoke execute on function public.create_garden_with_owner(text) from public, anon;
revoke execute on function public.delete_garden(uuid) from public, anon;
revoke execute on function public.leave_garden(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_invalid_task_completion() from public, anon, authenticated;
revoke execute on function public.prevent_last_owner_loss() from public, anon, authenticated;
revoke execute on function public.create_initial_billing_period() from public, anon, authenticated;
grant execute on function public.create_garden_with_owner(text) to authenticated;
grant execute on function public.delete_garden(uuid) to authenticated;
grant execute on function public.leave_garden(uuid) to authenticated;

alter function public.set_updated_at() set search_path = public;
