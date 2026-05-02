create type task_takeover_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create type garden_transaction_type as enum ('expense', 'payment');

create table public.task_takeover_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  current_assignee uuid references public.profiles(id) on delete set null,
  status task_takeover_status not null default 'pending',
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table public.garden_transactions (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  type garden_transaction_type not null,
  title text not null,
  amount_cents integer not null check (amount_cents > 0),
  paid_by uuid not null references public.profiles(id) on delete cascade,
  paid_to uuid references public.profiles(id) on delete set null,
  occurred_on date not null default current_date,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.garden_billing_settings (
  garden_id uuid primary key references public.gardens(id) on delete cascade,
  hourly_rate_cents integer not null default 1000 check (hourly_rate_cents >= 0),
  point_hours numeric(5,2) not null default 1 check (point_hours > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index task_takeover_requests_task_id_idx on public.task_takeover_requests(task_id);
create index task_takeover_requests_garden_status_idx on public.task_takeover_requests(garden_id, status);
create index garden_transactions_garden_date_idx on public.garden_transactions(garden_id, occurred_on);

create trigger garden_billing_settings_set_updated_at
before update on public.garden_billing_settings
for each row execute function public.set_updated_at();

alter table public.task_takeover_requests enable row level security;
alter table public.garden_transactions enable row level security;
alter table public.garden_billing_settings enable row level security;

create policy "task takeover read members"
on public.task_takeover_requests for select
using (public.is_garden_member(garden_id));

create policy "task takeover create members"
on public.task_takeover_requests for insert
with check (public.is_garden_member(garden_id) and requested_by = auth.uid());

create policy "task takeover update assignee or admins"
on public.task_takeover_requests for update
using (
  public.has_garden_role(garden_id, array['owner','admin']::garden_role[])
  or current_assignee = auth.uid()
)
with check (
  public.has_garden_role(garden_id, array['owner','admin']::garden_role[])
  or current_assignee = auth.uid()
);

create policy "garden transactions read members"
on public.garden_transactions for select
using (public.is_garden_member(garden_id));

create policy "garden transactions create members"
on public.garden_transactions for insert
with check (public.is_garden_member(garden_id) and created_by = auth.uid());

create policy "garden transactions update admins"
on public.garden_transactions for update
using (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]))
with check (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));

create policy "garden billing settings read members"
on public.garden_billing_settings for select
using (public.is_garden_member(garden_id));

create policy "garden billing settings write admins"
on public.garden_billing_settings for all
using (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]))
with check (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));

create or replace function public.is_task_completion_window(target_due_date date)
returns boolean
language sql
immutable
as $$
  select target_due_date is null
    or current_date between target_due_date - interval '7 days' and target_due_date + interval '7 days';
$$;

create or replace function public.prevent_invalid_task_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'done' and old.status <> 'done' then
    if new.assigned_to is not null and new.completed_by is distinct from new.assigned_to then
      raise exception 'Only the assigned member can complete this task';
    end if;

    if not public.is_task_completion_window(new.due_date) then
      raise exception 'Task can only be completed within 7 days before or after due date';
    end if;

    if new.completed_by is null or new.completed_at is null then
      raise exception 'Completed task requires completed_by and completed_at';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_prevent_invalid_completion on public.tasks;
create trigger tasks_prevent_invalid_completion
before update of status, completed_by, completed_at on public.tasks
for each row execute function public.prevent_invalid_task_completion();
