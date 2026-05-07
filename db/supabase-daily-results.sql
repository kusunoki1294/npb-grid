create table if not exists public.daily_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  puzzle_date date not null,
  score integer not null default 0,
  guess_count integer not null default 0,
  cells jsonb not null default '{}'::jsonb,
  rarity_total integer not null default 0,
  rarity_hits integer not null default 0,
  rarity_average numeric,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint daily_results_score_range_check
    check (score >= 0 and score <= 9),
  constraint daily_results_guess_count_check
    check (guess_count >= 0 and guess_count <= 9),
  constraint daily_results_score_guess_check
    check (score <= guess_count),
  constraint daily_results_cells_object_check
    check (jsonb_typeof(cells) = 'object'),
  constraint daily_results_rarity_total_check
    check (rarity_total >= 0),
  constraint daily_results_rarity_hits_check
    check (rarity_hits >= 0 and rarity_hits <= 9 and rarity_hits <= score),
  constraint daily_results_rarity_average_check
    check (rarity_average is null or rarity_average >= 0),
  constraint daily_results_completed_at_check
    check (completed_at is null or guess_count >= 9),
  primary key (user_id, puzzle_date)
);

alter table public.daily_results add column if not exists rarity_total integer not null default 0;
alter table public.daily_results add column if not exists rarity_hits integer not null default 0;
alter table public.daily_results add column if not exists rarity_average numeric;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_results_score_range_check'
  ) then
    alter table public.daily_results
      add constraint daily_results_score_range_check
      check (score >= 0 and score <= 9);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_results_score_guess_check'
  ) then
    alter table public.daily_results
      add constraint daily_results_score_guess_check
      check (score <= guess_count);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_results_cells_object_check'
  ) then
    alter table public.daily_results
      add constraint daily_results_cells_object_check
      check (jsonb_typeof(cells) = 'object');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_results_rarity_total_check'
  ) then
    alter table public.daily_results
      add constraint daily_results_rarity_total_check
      check (rarity_total >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_results_rarity_hits_check'
  ) then
    alter table public.daily_results
      add constraint daily_results_rarity_hits_check
      check (rarity_hits >= 0 and rarity_hits <= 9 and rarity_hits <= score);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_results_rarity_average_check'
  ) then
    alter table public.daily_results
      add constraint daily_results_rarity_average_check
      check (rarity_average is null or rarity_average >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_results_completed_at_check'
  ) then
    alter table public.daily_results
      add constraint daily_results_completed_at_check
      check (completed_at is null or guess_count >= 9);
  end if;
end
$$;

alter table public.daily_results enable row level security;

drop policy if exists "Users can read their own daily results" on public.daily_results;
create policy "Users can read their own daily results"
on public.daily_results
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily results" on public.daily_results;
create policy "Users can insert their own daily results"
on public.daily_results
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily results" on public.daily_results;
create policy "Users can update their own daily results"
on public.daily_results
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.get_daily_leaderboard(target_puzzle_date date)
returns table (
  user_id uuid,
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
      dr.user_id,
      coalesce(
        nullif(u.raw_user_meta_data ->> 'display_name', ''),
        'Player'
      ) as display_name,
      dr.score,
      dr.rarity_average,
      dr.updated_at
    from public.daily_results dr
    join auth.users u on u.id = dr.user_id
    where dr.puzzle_date = target_puzzle_date
      and dr.guess_count >= 9
  )
  select
    user_id,
    display_name,
    score,
    rarity_average
  from completed_boards
  order by score desc, rarity_average asc nulls last, updated_at asc;
$$;

revoke execute on function public.get_daily_leaderboard(date) from public, anon, authenticated;
