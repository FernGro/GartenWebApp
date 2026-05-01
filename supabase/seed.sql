insert into public.task_templates (
  title,
  default_points,
  estimated_minutes,
  season_start_month,
  season_end_month,
  recurrence_type,
  recurrence_interval,
  is_weather_dependent,
  is_active
) values
  ('Rasenmaehen', 4, 60, 4, 9, 'weekly', 2, true, true),
  ('Hecke schneiden', 5, 90, 3, 10, 'seasonal', 1, true, true),
  ('Unkraut jaeten', 2, 30, 4, 9, 'monthly', 1, true, true),
  ('Blaetter entfernen', 2, 30, 10, 11, 'monthly', 1, true, true),
  ('Schneeschaufeln', 2, 25, 12, 2, 'on_demand', 1, true, true),
  ('Sonstiges klein', 1, 15, 1, 12, 'none', 1, false, true),
  ('Sonstiges mittel', 3, 45, 1, 12, 'none', 1, false, true),
  ('Sonstiges gross', 5, 90, 1, 12, 'none', 1, false, true);
