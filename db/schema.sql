PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS category_eligibility;
DROP TABLE IF EXISTS career_pitching_stats;
DROP TABLE IF EXISTS career_batting_stats;
DROP TABLE IF EXISTS player_awards;
DROP TABLE IF EXISTS fielding_seasons;
DROP TABLE IF EXISTS pitching_seasons;
DROP TABLE IF EXISTS batting_seasons;
DROP TABLE IF EXISTS player_positions;
DROP TABLE IF EXISTS player_teams;
DROP TABLE IF EXISTS players;

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ja TEXT,
  bats TEXT,
  throws TEXT,
  birth_country TEXT,
  played_in_mlb INTEGER NOT NULL DEFAULT 0,
  hall_of_fame INTEGER NOT NULL DEFAULT 0,
  meikyukai INTEGER NOT NULL DEFAULT 0,
  switch_hitter INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE player_teams (
  player_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  PRIMARY KEY (player_id, team_name),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE player_positions (
  player_id TEXT NOT NULL,
  position_name TEXT NOT NULL,
  PRIMARY KEY (player_id, position_name),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE batting_seasons (
  player_id TEXT NOT NULL,
  year INTEGER,
  team_name TEXT,
  games INTEGER,
  avg REAL,
  obp REAL,
  slg REAL,
  hits INTEGER,
  home_runs INTEGER,
  runs_batted_in INTEGER,
  runs INTEGER,
  stolen_bases INTEGER,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE pitching_seasons (
  player_id TEXT NOT NULL,
  year INTEGER,
  team_name TEXT,
  wins INTEGER,
  losses INTEGER,
  era REAL,
  strikeouts INTEGER,
  saves INTEGER,
  holds INTEGER,
  innings_pitched REAL,
  complete_games INTEGER,
  shutouts INTEGER,
  no_hitter INTEGER NOT NULL DEFAULT 0,
  perfect_game INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE fielding_seasons (
  player_id TEXT NOT NULL,
  year INTEGER,
  team_name TEXT,
  position_name TEXT,
  games INTEGER,
  innings REAL,
  putouts INTEGER,
  assists INTEGER,
  errors INTEGER,
  fielding_pct REAL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE player_awards (
  player_id TEXT NOT NULL,
  award_name TEXT NOT NULL,
  year INTEGER,
  team_name TEXT,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE career_batting_stats (
  player_id TEXT PRIMARY KEY,
  hits INTEGER,
  home_runs INTEGER,
  runs_batted_in INTEGER,
  runs INTEGER,
  stolen_bases INTEGER,
  avg REAL,
  obp REAL,
  slg REAL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE career_pitching_stats (
  player_id TEXT PRIMARY KEY,
  wins INTEGER,
  strikeouts INTEGER,
  saves INTEGER,
  holds INTEGER,
  innings_pitched REAL,
  complete_games INTEGER,
  shutouts INTEGER,
  games_pitched INTEGER,
  era REAL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE category_eligibility (
  category_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  PRIMARY KEY (category_id, player_id),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX idx_player_teams_team_name ON player_teams(team_name);
CREATE INDEX idx_player_positions_position_name ON player_positions(position_name);
CREATE INDEX idx_batting_seasons_player_id ON batting_seasons(player_id);
CREATE INDEX idx_batting_seasons_team_name ON batting_seasons(team_name);
CREATE INDEX idx_pitching_seasons_player_id ON pitching_seasons(player_id);
CREATE INDEX idx_pitching_seasons_team_name ON pitching_seasons(team_name);
CREATE INDEX idx_fielding_seasons_player_id ON fielding_seasons(player_id);
CREATE INDEX idx_player_awards_player_id ON player_awards(player_id);
CREATE INDEX idx_player_awards_award_name ON player_awards(award_name);
CREATE INDEX idx_category_eligibility_player_id ON category_eligibility(player_id);
