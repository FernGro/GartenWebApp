alter table public.tasks
add column if not exists assignment_locked boolean not null default false,
add column if not exists locked_by uuid references public.profiles(id) on delete set null,
add column if not exists locked_at timestamptz;

create index if not exists tasks_locked_idx
on public.tasks(garden_id, assignment_locked)
where assignment_locked = true;
