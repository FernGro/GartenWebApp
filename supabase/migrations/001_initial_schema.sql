create extension if not exists "pgcrypto";

create type garden_role as enum ('owner', 'admin', 'member');
create type task_status as enum ('open', 'assigned', 'done', 'overdue', 'cancelled', 'postponed');
create type recurrence_type as enum ('none', 'weekly', 'monthly', 'seasonal', 'on_demand');
create type task_event_type as enum (
  'created',
  'assigned',
  'reassigned',
  'accepted',
  'completed',
  'reopened',
  'postponed',
  'cancelled',
  'commented'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gardens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garden_members (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role garden_role not null default 'member',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (garden_id, user_id)
);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid references public.gardens(id) on delete cascade,
  title text not null,
  default_points integer not null check (default_points between 1 and 5),
  estimated_minutes integer not null check (estimated_minutes > 0),
  season_start_month integer not null check (season_start_month between 1 and 12),
  season_end_month integer not null check (season_end_month between 1 and 12),
  recurrence_type recurrence_type not null default 'none',
  recurrence_interval integer not null default 1 check (recurrence_interval > 0),
  is_weather_dependent boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  template_id uuid references public.task_templates(id) on delete set null,
  title text not null,
  description text,
  points integer not null check (points between 1 and 5),
  status task_status not null default 'open',
  due_date date,
  assigned_to uuid references public.profiles(id) on delete set null,
  original_assignee uuid references public.profiles(id) on delete set null,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'done') = (completed_at is not null))
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

create table public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type task_event_type not null,
  from_user_id uuid references public.profiles(id) on delete set null,
  to_user_id uuid references public.profiles(id) on delete set null,
  points_delta integer,
  note text,
  created_at timestamptz not null default now()
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (from_date <= to_date)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  related_task_id uuid references public.tasks(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index garden_members_user_id_idx on public.garden_members(user_id);
create index garden_members_garden_id_idx on public.garden_members(garden_id);
create index tasks_garden_status_idx on public.tasks(garden_id, status);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_completed_by_idx on public.tasks(completed_by);
create index task_events_task_id_idx on public.task_events(task_id);
create index notifications_user_unread_idx on public.notifications(user_id, read_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger gardens_set_updated_at
before update on public.gardens
for each row execute function public.set_updated_at();

create trigger task_templates_set_updated_at
before update on public.task_templates
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.is_garden_member(target_garden_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = target_garden_id
      and gm.user_id = auth.uid()
      and gm.is_active = true
  );
$$;

create or replace function public.has_garden_role(target_garden_id uuid, allowed_roles garden_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.garden_members gm
    where gm.garden_id = target_garden_id
      and gm.user_id = auth.uid()
      and gm.is_active = true
      and gm.role = any(allowed_roles)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Gartenmitglied')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.gardens enable row level security;
alter table public.garden_members enable row level security;
alter table public.task_templates enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_events enable row level security;
alter table public.availability enable row level security;
alter table public.notifications enable row level security;

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
      and peer.is_active = true
  )
);

create policy "profiles update self"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "gardens read members"
on public.gardens for select
using (public.is_garden_member(id));

create policy "gardens insert authenticated"
on public.gardens for insert
with check (auth.uid() = created_by);

create policy "gardens update admins"
on public.gardens for update
using (public.has_garden_role(id, array['owner','admin']::garden_role[]))
with check (public.has_garden_role(id, array['owner','admin']::garden_role[]));

create policy "garden members read members"
on public.garden_members for select
using (public.is_garden_member(garden_id));

create policy "garden members insert admins"
on public.garden_members for insert
with check (
  public.has_garden_role(garden_id, array['owner','admin']::garden_role[])
  or (
    role = 'owner'
    and user_id = auth.uid()
    and exists (
      select 1
      from public.gardens g
      where g.id = garden_id
        and g.created_by = auth.uid()
    )
  )
);

create policy "garden members update admins"
on public.garden_members for update
using (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]))
with check (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));

create policy "task templates read members"
on public.task_templates for select
using (garden_id is null or public.is_garden_member(garden_id));

create policy "task templates write admins"
on public.task_templates for all
using (garden_id is not null and public.has_garden_role(garden_id, array['owner','admin']::garden_role[]))
with check (garden_id is not null and public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));

create policy "tasks read members"
on public.tasks for select
using (public.is_garden_member(garden_id));

create policy "tasks insert members"
on public.tasks for insert
with check (public.is_garden_member(garden_id) and created_by = auth.uid());

create policy "tasks update members"
on public.tasks for update
using (public.is_garden_member(garden_id))
with check (public.is_garden_member(garden_id));

create policy "task comments read members"
on public.task_comments for select
using (public.is_garden_member(garden_id));

create policy "task comments insert members"
on public.task_comments for insert
with check (public.is_garden_member(garden_id) and user_id = auth.uid());

create policy "task events read members"
on public.task_events for select
using (public.is_garden_member(garden_id));

create policy "task events insert members"
on public.task_events for insert
with check (public.is_garden_member(garden_id) and actor_id = auth.uid());

create policy "availability read members"
on public.availability for select
using (public.is_garden_member(garden_id));

create policy "availability manage self"
on public.availability for all
using (public.is_garden_member(garden_id) and user_id = auth.uid())
with check (public.is_garden_member(garden_id) and user_id = auth.uid());

create policy "availability manage admins"
on public.availability for all
using (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]))
with check (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));

create policy "notifications read own"
on public.notifications for select
using (user_id = auth.uid() and public.is_garden_member(garden_id));

create policy "notifications update own"
on public.notifications for update
using (user_id = auth.uid() and public.is_garden_member(garden_id))
with check (user_id = auth.uid() and public.is_garden_member(garden_id));

create policy "notifications insert members"
on public.notifications for insert
with check (public.is_garden_member(garden_id));
