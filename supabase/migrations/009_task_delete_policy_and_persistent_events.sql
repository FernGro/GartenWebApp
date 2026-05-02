alter table public.task_events
drop constraint if exists task_events_task_id_fkey;

alter table public.task_events
alter column task_id drop not null;

alter table public.task_events
add constraint task_events_task_id_fkey
foreign key (task_id) references public.tasks(id) on delete set null;

create policy "tasks delete admins"
on public.tasks for delete
using (public.has_garden_role(garden_id, array['owner','admin']::garden_role[]));
