create table if not exists public.daily_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  puzzle_date date not null,
  score integer not null default 0,
  guess_count integer not null default 0 check (guess_count >= 0 and guess_count <= 9),
  cells jsonb not null default '{}'::jsonb,
  rarity_total integer not null default 0,
  rarity_hits integer not null default 0,
  rarity_average numeric,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, puzzle_date)
);

alter table public.daily_results add column if not exists rarity_total integer not null default 0;
alter table public.daily_results add column if not exists rarity_hits integer not null default 0;
alter table public.daily_results add column if not exists rarity_average numeric;

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

create or replace function public.get_daily_leaderboard(target_puzzle_date date)
returns table (
  display_name text,
  score integer,
  rarity_average numeric
)
language sql
security definer
set search_path = public, auth
as $$
  with completed_boards as (
    select
      coalesce(
        nullif(u.raw_user_meta_data ->> 'display_name', ''),
        split_part(u.email, '@', 1),
        'Player'
      ) as display_name,
      dr.score,
      dr.rarity_average,
      dr.updated_at
    from public.daily_results dr
    join auth.users u on u.id = dr.user_id
    where dr.puzzle_date = target_puzzle_date
      and dr.guess_count >= 9
  ),
    select
      display_name,
      score,
      rarity_average
    from completed_boards
    order by score desc, rarity_average asc nulls last, updated_at asc;
$$;

grant execute on function public.get_daily_leaderboard(date) to anon, authenticated;
