alter table public.task_templates
add column if not exists custom_interval_days integer check (custom_interval_days is null or custom_interval_days > 0),
add column if not exists season_start_day integer not null default 1 check (season_start_day between 1 and 31),
add column if not exists season_end_day integer not null default 31 check (season_end_day between 1 and 31);
