# SQLite Notes

Build the database with:

```bash
npm run data:sqlite
```

Useful query commands:

```bash
npm run db:query -- categories
npm run db:query -- categories mvp
npm run db:query -- category team:yomiuri-giants
npm run db:query -- intersect team:yomiuri-giants award:mvp-winner
npm run db:query -- player sadaharu-oh
npm run db:grid
```

Main tables:

- `players`
- `player_teams`
- `player_positions`
- `batting_seasons`
- `pitching_seasons`
- `fielding_seasons`
- `player_awards`
- `career_batting_stats`
- `career_pitching_stats`
- `category_eligibility`
