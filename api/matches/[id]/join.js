import { sql } from "../../../lib/db.js";
import { requirePlayer } from "../../../lib/auth.js";
import { route, parseId, HttpError } from "../../../lib/http.js";

export default route(["POST"], async (req, res) => {
  const auth = await requirePlayer(req);
  const id = parseId(req.query.id);
  const pid = auth.playerId;

  // Statement 1 locks the match row; statements 2-3 then see a fresh snapshot,
  // so two simultaneous joins can never overfill a match.
  const [locked, inserted, state] = await sql.transaction([
    sql`SELECT id, status FROM matches WHERE id = ${id}::bigint FOR UPDATE`,
    sql`
      INSERT INTO match_players (match_id, player_id)
      SELECT m.id, ${pid}::bigint FROM matches m
      WHERE m.id = ${id}::bigint AND m.status = 'waiting'
        AND (SELECT COUNT(*) FROM match_players WHERE match_id = m.id) < m.max_players
      ON CONFLICT DO NOTHING
      RETURNING match_id
    `,
    sql`
      SELECT (SELECT COUNT(*) FROM match_players WHERE match_id = ${id}::bigint)::int AS player_count,
             EXISTS (SELECT 1 FROM match_players
                     WHERE match_id = ${id}::bigint AND player_id = ${pid}::bigint) AS is_member
    `
  ]);

  if (!locked.length) throw new HttpError(404, "Match not found");
  const { player_count, is_member } = state[0];
  if (is_member && !inserted.length) {
    return res.status(200).json({ joined: true, alreadyJoined: true, playerCount: player_count });
  }
  if (locked[0].status !== "waiting") throw new HttpError(409, "Match is no longer open");
  if (!inserted.length) throw new HttpError(409, "Match is full");
  return res.status(201).json({ joined: true, playerCount: player_count });
});
