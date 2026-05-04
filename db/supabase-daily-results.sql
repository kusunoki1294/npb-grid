create table if not exists public.daily_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  puzzle_date date not null,
  score integer not null default 0,
  guess_count integer not null default 0 check (guess_count >= 0 and guess_count <= 9),
  cells jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, puzzle_date)
);

alter table public.daily_results enable row level security;

create policy "Users can read their own daily results"
on public.daily_results
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own daily results"
on public.daily_results
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own daily results"
on public.daily_results
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
