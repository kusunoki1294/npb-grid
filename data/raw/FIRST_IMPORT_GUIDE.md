# First Import Guide

Use this guide for the first real-data test of the pipeline.

## Goal

Make one real `registry` CSV and one real `batting` CSV import cleanly.

Once that works, add `pitching`, `fielding`, and `awards`.

## Step 1

Put one real player registry CSV in:

- `data/raw/registry/`

Minimum useful columns:

- `name`
- `name_japanese`
- `team`
- `position`
- `bats`
- `throws`
- `birth_country`
- `played_in_mlb`
- `hall_of_fame`
- `meikyukai`

Use [registry-template.csv](/Users/shugo/Desktop/npb/data/raw/registry/registry-template.csv) as the target shape.

## Step 2

Put one real batting CSV in:

- `data/raw/batting/`

Minimum useful columns:

- `name`
- `name_japanese`
- `team`
- `year`
- `games`
- `avg`
- `obp`
- `slg`
- `hits`
- `hr`
- `rbi`
- `runs`
- `sb`

Use [batting-template.csv](/Users/shugo/Desktop/npb/data/raw/batting/batting-template.csv) as the target shape.

## Step 3

Check that you actually placed real files, not only the samples:

```bash
npm run data:audit-raw
```

## Step 4

Run:

```bash
npm run data:build
npm run data:diagnostics
```

## Step 5

Inspect:

- `data/processed/players.json`
- `data/processed/battingSeasons.json`
- `data/processed/careerStats.json`
- `data/processed/eligibility.json`
- `data/processed/importDiagnostics.json`

What to verify in diagnostics:

- each source file appears under the correct dataset
- `importedRows` is close to the CSV row count you expected
- `missing required headers` is empty
- `skippedRowCount` is `0` or explainable
- `identityCollisions` is empty unless two distinct players shared a source ID

## If It Fails

The most likely issue is column-name mismatch.

Fix the candidate column lists in:

- [scripts/importRawStats.js](/Users/shugo/Desktop/npb/scripts/importRawStats.js)

## Current Accepted Header Variants

Registry/player identity:

- name: `name`, `player_name`, `name_en`, `english_name`, `full_name`, `player`, `batter_name`, `pitcher_name`, `fielder_name`
- Japanese name: `name_japanese`, `name_ja`, `player_name_japanese`, `japanese_name`, `full_name_japanese`
- player ID: `player_id`, `playerid`, `bbref_id`, `bref_id`, `register_id`, `npb_id`, `retro_id`, `statiz_id`, `fangraphs_id`, `mlbid`, `mlb_id`, `sportsnav_id`, `id`
- team: `team`, `franchise`, `club`, `tm`, `team_name`, `franchise_name`, `organization`
- position: `position`, `primary_position`, `pos`, `fielding_position`
- bats: `bats`, `bat`, `bats_throws_bat`, `bat_side`
- throws: `throws`, `throw`, `bats_throws_throw`, `throw_side`
- birth country: `birth_country`, `country`, `birthcountry`, `born_country`, `nationality`

Batting stats:

- year: `year`, `season`, `season_year`, `year_id`, `season_id`
- games: `g`, `games`, `games_played`
- avg: `avg`, `average`, `batting_average`
- obp: `obp`, `on_base_percentage`, `onbase_percentage`
- slg: `slg`, `slugging_percentage`
- hits: `h`, `hits`
- home runs: `hr`, `home_runs`, `homeruns`
- RBI: `rbi`, `runs_batted_in`, `runs_battedin`
- runs: `r`, `runs`, `runs_scored`
- stolen bases: `sb`, `stolen_bases`, `stolenbases`

Pitching stats:

- wins: `w`, `wins`
- losses: `l`, `losses`
- ERA: `era`, `earned_run_average`
- strikeouts: `so`, `strikeouts`, `k`, `strike_outs`
- saves: `sv`, `saves`
- holds: `hld`, `holds`, `hold`
- innings pitched: `ip`, `innings_pitched`, `inningspitch`
- complete games: `cg`, `complete_games`, `completegames`
- shutouts: `sho`, `shutouts`, `shutout`
- no-hitter: `no_hitter`, `no_hitters`, `nohitter`
- perfect game: `perfect_game`, `perfect_games`, `perfectgame`

Fielding stats:

- innings: `inn`, `innings`, `innings_fielded`
- putouts: `po`, `putouts`, `put_outs`
- assists: `a`, `assists`
- errors: `e`, `errors`
- fielding percentage: `fpct`, `fielding_pct`, `fielding_percentage`

Registry booleans:

- played in MLB: `played_in_mlb`, `playedinmlb`, `mlb_experience`, `played_mlb`
- hall of fame: `hall_of_fame`, `halloffame`, `hof`
- meikyukai: `meikyukai`, `meikyukai_member`, `meikyukai_flag`
