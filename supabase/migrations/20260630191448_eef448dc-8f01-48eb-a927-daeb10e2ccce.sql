
-- =========================================================
-- HEMO schema
-- =========================================================

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  nickname text,
  avatar_url text,
  pronoun_role text check (pronoun_role in ('her','him','they')) default 'her',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles self read" on public.profiles for select to authenticated using (true);
create policy "profiles self write" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- COUPLES
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid references auth.users(id) on delete cascade,
  relationship_start date,
  her_nickname text,
  him_nickname text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.couples to authenticated;
grant all on public.couples to service_role;
alter table public.couples enable row level security;

create or replace function public.is_couple_member(_couple_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.couples
    where id = _couple_id and (user_a = _user_id or user_b = _user_id)
  );
$$;

create policy "couples members read" on public.couples for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);
create policy "couples create own" on public.couples for insert to authenticated
  with check (auth.uid() = user_a);
create policy "couples members update" on public.couples for update to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b)
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- INVITE CODES
create table public.invite_codes (
  code text primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  used boolean not null default false,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invite_codes to authenticated;
grant all on public.invite_codes to service_role;
alter table public.invite_codes enable row level security;
create policy "invite read by code" on public.invite_codes for select to authenticated using (true);
create policy "invite create by author" on public.invite_codes for insert to authenticated
  with check (auth.uid() = created_by);
create policy "invite update authed" on public.invite_codes for update to authenticated using (true) with check (true);

-- MOODS
create table public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  mood text not null,
  emoji text,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.moods to authenticated;
grant all on public.moods to service_role;
alter table public.moods enable row level security;
create policy "moods couple read" on public.moods for select to authenticated
  using (auth.uid() = user_id or (couple_id is not null and public.is_couple_member(couple_id, auth.uid())));
create policy "moods self write" on public.moods for insert to authenticated with check (auth.uid() = user_id);
create policy "moods self update" on public.moods for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "moods self delete" on public.moods for delete to authenticated using (auth.uid() = user_id);

-- CHECK INS
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  kind text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.check_ins to authenticated;
grant all on public.check_ins to service_role;
alter table public.check_ins enable row level security;
create policy "checkins couple read" on public.check_ins for select to authenticated
  using (auth.uid() = user_id or (couple_id is not null and public.is_couple_member(couple_id, auth.uid())));
create policy "checkins self write" on public.check_ins for insert to authenticated with check (auth.uid() = user_id);
create policy "checkins self delete" on public.check_ins for delete to authenticated using (auth.uid() = user_id);

-- LIVE STATUS
create table public.statuses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  activity text,
  custom_text text,
  focus_until timestamptz,
  estimated_finish timestamptz,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.statuses to authenticated;
grant all on public.statuses to service_role;
alter table public.statuses enable row level security;
create policy "statuses couple read" on public.statuses for select to authenticated
  using (auth.uid() = user_id or (couple_id is not null and public.is_couple_member(couple_id, auth.uid())));
create policy "statuses self upsert" on public.statuses for insert to authenticated with check (auth.uid() = user_id);
create policy "statuses self update" on public.statuses for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- GOALS
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  title text not null,
  description text,
  scope text not null default 'today' check (scope in ('today','weekly','monthly','dream')),
  shared boolean not null default false,
  progress int not null default 0,
  done boolean not null default false,
  due_date date,
  emoji text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.goals to authenticated;
grant all on public.goals to service_role;
alter table public.goals enable row level security;
create policy "goals couple read" on public.goals for select to authenticated
  using (auth.uid() = user_id or (shared and couple_id is not null and public.is_couple_member(couple_id, auth.uid())));
create policy "goals self write" on public.goals for insert to authenticated with check (auth.uid() = user_id);
create policy "goals self update" on public.goals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals self delete" on public.goals for delete to authenticated using (auth.uid() = user_id);

-- HABITS
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text,
  color text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.habits to authenticated;
grant all on public.habits to service_role;
alter table public.habits enable row level security;
create policy "habits self all" on public.habits for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique(habit_id, logged_on)
);
grant select, insert, update, delete on public.habit_logs to authenticated;
grant all on public.habit_logs to service_role;
alter table public.habit_logs enable row level security;
create policy "habit_logs self all" on public.habit_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- REFLECTIONS
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  best_moment text,
  hardest_moment text,
  grateful_for text,
  achievement text,
  improve text,
  message text,
  for_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique(user_id, for_date)
);
grant select, insert, update, delete on public.reflections to authenticated;
grant all on public.reflections to service_role;
alter table public.reflections enable row level security;
create policy "reflections couple read" on public.reflections for select to authenticated
  using (auth.uid() = user_id or (couple_id is not null and public.is_couple_member(couple_id, auth.uid())));
create policy "reflections self write" on public.reflections for insert to authenticated with check (auth.uid() = user_id);
create policy "reflections self update" on public.reflections for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- MESSAGES (notes, "I need you", twist, voice)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('note','need','twist','voice')),
  category text,
  body text,
  media_url text,
  duration_ms int,
  reaction text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages couple read" on public.messages for select to authenticated
  using (public.is_couple_member(couple_id, auth.uid()));
create policy "messages couple write" on public.messages for insert to authenticated
  with check (auth.uid() = sender_id and public.is_couple_member(couple_id, auth.uid()));
create policy "messages couple update" on public.messages for update to authenticated
  using (public.is_couple_member(couple_id, auth.uid())) with check (public.is_couple_member(couple_id, auth.uid()));

-- MEMORIES
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  caption text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.memories to authenticated;
grant all on public.memories to service_role;
alter table public.memories enable row level security;
create policy "memories couple read" on public.memories for select to authenticated
  using (public.is_couple_member(couple_id, auth.uid()));
create policy "memories couple write" on public.memories for insert to authenticated
  with check (auth.uid() = user_id and public.is_couple_member(couple_id, auth.uid()));
create policy "memories author update" on public.memories for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- TIME CAPSULES
create table public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text not null,
  unlock_at timestamptz not null,
  opened boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.time_capsules to authenticated;
grant all on public.time_capsules to service_role;
alter table public.time_capsules enable row level security;
create policy "capsule couple read" on public.time_capsules for select to authenticated
  using (public.is_couple_member(couple_id, auth.uid()));
create policy "capsule couple write" on public.time_capsules for insert to authenticated
  with check (auth.uid() = author_id and public.is_couple_member(couple_id, auth.uid()));
create policy "capsule couple update" on public.time_capsules for update to authenticated
  using (public.is_couple_member(couple_id, auth.uid())) with check (public.is_couple_member(couple_id, auth.uid()));

-- MILESTONES
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  occurred_on date not null,
  emoji text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.milestones to authenticated;
grant all on public.milestones to service_role;
alter table public.milestones enable row level security;
create policy "milestones couple read" on public.milestones for select to authenticated
  using (public.is_couple_member(couple_id, auth.uid()));
create policy "milestones couple write" on public.milestones for insert to authenticated
  with check (public.is_couple_member(couple_id, auth.uid()));
create policy "milestones couple update" on public.milestones for update to authenticated
  using (public.is_couple_member(couple_id, auth.uid())) with check (public.is_couple_member(couple_id, auth.uid()));

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger statuses_updated before update on public.statuses for each row execute function public.set_updated_at();

-- realtime
alter publication supabase_realtime add table public.statuses;
alter publication supabase_realtime add table public.moods;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.check_ins;
alter publication supabase_realtime add table public.memories;
