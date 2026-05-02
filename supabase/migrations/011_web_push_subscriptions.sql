create table public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, garden_id, endpoint)
);

create index web_push_subscriptions_user_garden_idx
on public.web_push_subscriptions(user_id, garden_id)
where is_active = true;

create trigger web_push_subscriptions_set_updated_at
before update on public.web_push_subscriptions
for each row execute function public.set_updated_at();

alter table public.web_push_subscriptions enable row level security;

create policy "web push read own"
on public.web_push_subscriptions for select
using (user_id = auth.uid() and public.is_garden_member(garden_id));

create policy "web push insert own"
on public.web_push_subscriptions for insert
with check (user_id = auth.uid() and public.is_garden_member(garden_id));

create policy "web push update own"
on public.web_push_subscriptions for update
using (user_id = auth.uid() and public.is_garden_member(garden_id))
with check (user_id = auth.uid() and public.is_garden_member(garden_id));

create policy "web push delete own"
on public.web_push_subscriptions for delete
using (user_id = auth.uid() and public.is_garden_member(garden_id));
