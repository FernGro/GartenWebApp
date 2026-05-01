create table public.garden_invites (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  email text,
  role garden_role not null default 'member',
  token uuid not null default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  unique (token)
);

create index garden_invites_garden_id_idx on public.garden_invites(garden_id);
create index garden_invites_token_idx on public.garden_invites(token);

alter table public.garden_invites enable row level security;

create policy "garden invites read admins"
on public.garden_invites for select
using (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));

create policy "garden invites create admins"
on public.garden_invites for insert
with check (
  public.has_garden_role(garden_id, array['owner','admin']::garden_role[])
  and created_by = auth.uid()
);

create policy "garden invites update admins"
on public.garden_invites for update
using (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]))
with check (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));

create or replace function public.accept_garden_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.garden_invites%rowtype;
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

  insert into public.garden_members (garden_id, user_id, role)
  values (invite_row.garden_id, auth.uid(), invite_row.role)
  on conflict (garden_id, user_id)
  do update set is_active = true, role = excluded.role;

  update public.garden_invites
  set accepted_by = auth.uid(), accepted_at = now()
  where id = invite_row.id;

  return invite_row.garden_id;
end;
$$;

grant execute on function public.accept_garden_invite(uuid) to authenticated;
