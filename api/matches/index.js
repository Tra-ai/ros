import { sql } from "../../lib/db.js";
import { requirePlayer } from "../../lib/auth.js";
import { route, readBody, HttpError } from "../../lib/http.js";
import { rateLimit } from "../../lib/rateLimit.js";
import { expireStaleMatches } from "../../lib/matches.js";

const MODES = ["solo", "duo", "squad"];
const SIZES = [20, 50, 100];
const MAX_WAITING_PER_HOST = 3;

export default route(["GET", "POST"], async (req, res) => {
  if (req.method === "GET") {
    await expireStaleMatches();
    const rows = await sql`
      SELECT m.id, m.mode, m.map_name, m.status, m.max_players, m.created_at,
             (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id)::int AS player_count
      FROM matches m
      WHERE m.status = 'waiting'
      ORDER BY m.created_at DESC LIMIT 30
    `;
    return res.status(200).json({ matches: rows });
  }

  const auth = await requirePlayer(req);
  await rateLimit(`match:create:${auth.playerId}`, 10, 600);
  await expireStaleMatches();

  const { mode = "solo", mapName = "island", maxPlayers = 50 } = readBody(req);
  if (!MODES.includes(mode)) throw new HttpError(400, "Invalid mode");
  if (!SIZES.includes(maxPlayers)) throw new HttpError(400, "Invalid maxPlayers (use 20, 50 or 100)");
  if (typeof mapName !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(mapName)) {
    throw new HttpError(400, "Invalid mapName");
  }

  // One atomic statement: create the match (unless host already has too many open ones)
  // and add the host as its first player.
  const rows = await sql`
    WITH new_match AS (
      INSERT INTO matches (host_player_id, mode, map_name, max_players)
      SELECT ${auth.playerId}::bigint, ${mode}::text, ${mapName}::text, ${maxPlayers}::int
      WHERE (SELECT COUNT(*) FROM matches
             WHERE host_player_id = ${auth.playerId}::bigint AND status = 'waiting') < ${MAX_WAITING_PER_HOST}::int
      RETURNING id, mode, map_name, status, max_players, created_at
    ), joined AS (
      INSERT INTO match_players (match_id, player_id)
      SELECT id, ${auth.playerId}::bigint FROM new_match
    )
    SELECT *, 1 AS player_count FROM new_match
  `;
  if (!rows.length) {
    throw new HttpError(429, `You already have ${MAX_WAITING_PER_HOST} open matches`);
  }
  return res.status(201).json({ match: rows[0] });
});
