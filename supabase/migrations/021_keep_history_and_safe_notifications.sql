-- 1. Namen ausgezogener Mitbewohner bleiben fuer den Garten sichtbar (Abrechnung, Historie).
-- 2. "Garten verlassen" markiert die Person als ausgezogen statt die Mitgliedschaft zu loeschen,
--    damit sie in der laufenden Abrechnung bleibt.
-- 3. Meldungen fuer andere Personen legt nur noch der Server (service_role) an; Mitglieder koennen
--    keine gefaelschten Meldungen fuer andere einfuegen.

drop policy if exists "profiles read garden peers" on public.profiles;
create policy "profiles read garden peers"
on public.profiles for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.garden_members mine
    join public.garden_members peer on peer.garden_id = mine.garden_id
    where mine.user_id = auth.uid()
      and mine.is_active = true
      and peer.user_id = profiles.id
  )
);

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
      and is_active = true
  ) then
    raise exception 'Not a member of this garden';
  end if;

  update public.garden_members
  set is_active = false,
      left_on = (now() at time zone 'Europe/Berlin')::date
  where garden_id = target_garden_id
    and user_id = auth.uid();

  update public.tasks
  set assigned_to = null,
      status = 'open'
  where garden_id = target_garden_id
    and assigned_to = auth.uid()
    and status in ('assigned', 'overdue', 'postponed');
end;
$$;

revoke execute on function public.leave_garden(uuid) from public, anon;
grant execute on function public.leave_garden(uuid) to authenticated;

drop policy if exists "notifications insert members" on public.notifications;
drop policy if exists "notifications insert own" on public.notifications;
create policy "notifications insert own"
on public.notifications for insert
with check (user_id = auth.uid() and public.is_garden_member(garden_id));

-- 4. Der erste Abrechnungszeitraum beginnt beim fruehesten erledigten Dienst oder der fruehesten
--    Buchung, falls diese vor der Garten-Erstellung liegen (nachgetragene Dienste).
update public.billing_periods p
set starts_on = least(
  p.starts_on,
  coalesce((select min((t.completed_at at time zone 'Europe/Berlin')::date) from public.tasks t where t.garden_id = p.garden_id and t.status = 'done'), p.starts_on),
  coalesce((select min(x.occurred_on) from public.garden_transactions x where x.garden_id = p.garden_id), p.starts_on)
)
where p.ends_on is null
  and not exists (select 1 from public.billing_periods closed where closed.garden_id = p.garden_id and closed.ends_on is not null);
