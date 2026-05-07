-- Letzter Chat-Lesezeitpunkt je Mitglied für Ungelesen-Badge
alter table public.garden_members
  add column if not exists last_chat_read_at timestamptz;
