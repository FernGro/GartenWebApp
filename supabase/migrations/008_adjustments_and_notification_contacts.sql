create table public.member_adjustments (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points_delta integer not null default 0,
  amount_cents_delta integer not null default 0,
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notification_contacts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  whatsapp_phone text,
  telegram_chat_id text,
  telegram_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, garden_id)
);

create index member_adjustments_garden_user_idx on public.member_adjustments(garden_id, user_id);
create trigger notification_contacts_set_updated_at
before update on public.notification_contacts
for each row execute function public.set_updated_at();

alter table public.member_adjustments enable row level security;
alter table public.notification_contacts enable row level security;

create policy "member adjustments read members"
on public.member_adjustments for select
using (public.is_garden_member(garden_id));

create policy "member adjustments write admins"
on public.member_adjustments for insert
with check (
  public.has_garden_role(garden_id, array['owner','admin']::garden_role[])
  and created_by = auth.uid()
);

create policy "notification contacts read self or admins"
on public.notification_contacts for select
using (
  (user_id = auth.uid() and public.is_garden_member(garden_id))
  or public.has_garden_role(garden_id, array['owner','admin']::garden_role[])
);

create policy "notification contacts upsert self"
on public.notification_contacts for insert
with check (user_id = auth.uid() and public.is_garden_member(garden_id));

create policy "notification contacts update self"
on public.notification_contacts for update
using (user_id = auth.uid() and public.is_garden_member(garden_id))
with check (user_id = auth.uid() and public.is_garden_member(garden_id));
