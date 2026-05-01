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

Run:

```bash
npm run data:build
```

## Step 4

Inspect:

- `data/processed/players.json`
- `data/processed/battingSeasons.json`
- `data/processed/careerStats.json`
- `data/processed/eligibility.json`

## If It Fails

The most likely issue is column-name mismatch.

Fix the candidate column lists in:

- [scripts/importRawStats.js](/Users/shugo/Desktop/npb/scripts/importRawStats.js)

## Current Accepted Header Variants

Registry/player identity:

- name: `name`, `player_name`, `playerName`, `name_en`, `english_name`
- Japanese name: `name_japanese`, `nameJa`, `player_name_japanese`, `japanese_name`
- team: `team`, `franchise`, `club`
- position: `position`, `primary_position`, `pos`
- bats: `bats`, `bat`, `bats_throws_bat`
- throws: `throws`, `throw`, `bats_throws_throw`
- birth country: `birth_country`, `country`, `birthCountry`

Batting stats:

- year: `year`, `season`, `season_year`
- games: `g`, `games`
- avg: `avg`, `average`, `batting_average`
- obp: `obp`, `on_base_percentage`
- slg: `slg`, `slugging_percentage`
- hits: `h`, `hits`
- home runs: `hr`, `home_runs`
- RBI: `rbi`, `runs_batted_in`
- runs: `r`, `runs`
- stolen bases: `sb`, `stolen_bases`
