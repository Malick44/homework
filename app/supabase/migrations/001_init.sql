-- Home Lessons schema. Every row belongs to the signed-in user (auth.uid()).

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  color text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  color text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  week_start smallint check (week_start in (0, 1)),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  child_id uuid not null,
  subject_id uuid,
  title text not null,
  skill text not null default '',
  date date,
  minutes int not null default 20 check (minutes between 1 and 600),
  plan text not null default '',
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  rating smallint not null default 0 check (rating between 0 and 3),
  spent int not null default 0 check (spent between 0 and 600),
  note text not null default '',
  done_at timestamptz,
  created_at bigint not null,
  updated_at bigint not null,
  -- A lesson can only point at a child/subject owned by the same user.
  foreign key (child_id, user_id) references public.children (id, user_id) on delete cascade,
  -- Removing a subject keeps its lessons; they show under "Other".
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);

create index if not exists lessons_user_child_date on public.lessons (user_id, child_id, date);

alter table public.children enable row level security;
alter table public.subjects enable row level security;
alter table public.settings enable row level security;
alter table public.lessons  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['children', 'subjects', 'settings', 'lessons'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Live sync across devices.
do $$
declare t text;
begin
  foreach t in array array['children', 'subjects', 'settings', 'lessons'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.lessons replica identity full;
alter table public.children replica identity full;
alter table public.subjects replica identity full;
