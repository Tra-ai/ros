-- Safe to re-run on an existing database (everything is IF NOT EXISTS / ON CONFLICT).

CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  rank_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive uniqueness (the app lowercases emails, but the DB now enforces it too).
CREATE UNIQUE INDEX IF NOT EXISTS players_username_lower_idx ON players (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS players_email_lower_idx ON players (lower(email));
CREATE INDEX IF NOT EXISTS players_rank_idx ON players (rank_points DESC, xp DESC);

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  host_player_id BIGINT NOT NULL REFERENCES players(id),
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('solo','duo','squad')),
  map_name VARCHAR(80) NOT NULL DEFAULT 'island',
  status VARCHAR(20) NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','starting','running','finished','cancelled')),
  max_players INTEGER NOT NULL DEFAULT 50 CHECK (max_players IN (20,50,100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS matches_waiting_created_idx
  ON matches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS matches_host_idx ON matches(host_player_id, status);

CREATE TABLE IF NOT EXISTS match_players (
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, player_id)
);
CREATE INDEX IF NOT EXISTS match_players_player_idx ON match_players(player_id);

-- Hosts of matches created before this table existed become members of their own match.
INSERT INTO match_players (match_id, player_id)
SELECT id, host_player_id FROM matches WHERE status = 'waiting'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
