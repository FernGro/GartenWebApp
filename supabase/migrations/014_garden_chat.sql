-- Garden-Chat: Gruppenchat je Garten mit @mentions, privaten System-Erinnerungen und Overdue-Alerts

-- Retention-Einstellung am Garten (0 = nie löschen)
alter table public.gardens
  add column if not exists chat_retention_days integer not null default 90;

-- Haupt-Tabelle für Chat-Nachrichten
create table if not exists public.garden_chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  garden_id           uuid not null references public.gardens(id) on delete cascade,
  author_id           uuid references public.profiles(id) on delete set null,
  content             text not null check (char_length(content) between 1 and 2000),
  message_type        text not null default 'user'
                        check (message_type in ('user', 'system_reminder', 'system_overdue')),
  visible_to_user_id  uuid references public.profiles(id) on delete cascade,
  related_task_id     uuid references public.tasks(id) on delete set null,
  created_at          timestamptz not null default now()
);

-- @mentions je Nachricht
create table if not exists public.garden_chat_mentions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.garden_chat_messages(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  unique (message_id, user_id)
);

-- Indizes
create index if not exists garden_chat_messages_garden_created_idx
  on public.garden_chat_messages(garden_id, created_at desc);
create index if not exists garden_chat_messages_task_type_idx
  on public.garden_chat_messages(related_task_id, message_type)
  where related_task_id is not null;

-- RLS
alter table public.garden_chat_messages enable row level security;
alter table public.garden_chat_mentions enable row level security;

-- Mitglieder lesen Nachrichten: öffentlich ODER privat an sich selbst
create policy "chat read members"
  on public.garden_chat_messages for select
  using (
    public.is_garden_member(garden_id) and
    (visible_to_user_id is null or visible_to_user_id = auth.uid())
  );

-- Mitglieder schreiben nur eigene User-Nachrichten (kein System, kein Privat-Post an andere)
create policy "chat insert members"
  on public.garden_chat_messages for insert
  with check (
    public.is_garden_member(garden_id) and
    author_id = auth.uid() and
    message_type = 'user' and
    visible_to_user_id is null
  );

-- Eigene Nachrichten löschen; Admins/Owner löschen alle
create policy "chat delete own or admin"
  on public.garden_chat_messages for delete
  using (
    public.is_garden_member(garden_id) and
    (
      author_id = auth.uid() or
      public.has_garden_role(garden_id, array['owner','admin']::garden_role[])
    )
  );

-- Mentions lesen: Garten-Mitglieder
create policy "chat mentions read"
  on public.garden_chat_mentions for select
  using (
    exists (
      select 1 from public.garden_chat_messages m
      where m.id = message_id
        and public.is_garden_member(m.garden_id)
    )
  );

-- Mentions schreiben: nur für eigene Nachrichten
create policy "chat mentions insert"
  on public.garden_chat_mentions for insert
  with check (
    exists (
      select 1 from public.garden_chat_messages m
      where m.id = message_id
        and public.is_garden_member(m.garden_id)
        and m.author_id = auth.uid()
    )
  );

-- Realtime für Chat-Nachrichten aktivieren
alter publication supabase_realtime add table public.garden_chat_messages;
