-- Erledigungen brauchen keine Owner/Admin-Bestaetigung mehr.
-- Ueberfaellige/verschobene Aufgaben duerfen auch ausserhalb des 7-Tage-Fensters erledigt werden
-- (gleiches Verhalten wie completeTaskAction).

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

    if old.status not in ('overdue', 'postponed', 'pending_review')
      and not public.is_task_completion_window(new.due_date) then
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

-- Offene Pruefungen werden als erledigt uebernommen.
update public.tasks
set status = 'done',
    completed_by = coalesce(completed_by, assigned_to),
    completed_at = coalesce(completed_at, updated_at, now())
where status = 'pending_review'
  and coalesce(completed_by, assigned_to) is not null
  and (assigned_to is null or coalesce(completed_by, assigned_to) = assigned_to);
