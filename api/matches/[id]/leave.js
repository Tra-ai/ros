import { sql } from "../../../lib/db.js";
import { requirePlayer } from "../../../lib/auth.js";
import { route, parseId, HttpError } from "../../../lib/http.js";

export default route(["POST"], async (req, res) => {
  const auth = await requirePlayer(req);
  const id = parseId(req.query.id);
  const pid = auth.playerId;

  const [locked, removed, cancelled] = await sql.transaction([
    sql`SELECT id FROM matches WHERE id = ${id}::bigint FOR UPDATE`,
    sql`
      DELETE FROM match_players
      WHERE match_id = ${id}::bigint AND player_id = ${pid}::bigint
        AND EXISTS (SELECT 1 FROM matches WHERE id = ${id}::bigint AND status = 'waiting')
      RETURNING player_id
    `,
    // Host leaving (or last player leaving) cancels a still-waiting match.
    sql`
      UPDATE matches SET status = 'cancelled'
      WHERE id = ${id}::bigint AND status = 'waiting'
        AND (host_player_id = ${pid}::bigint
             OR NOT EXISTS (SELECT 1 FROM match_players WHERE match_id = ${id}::bigint))
      RETURNING id
    `
  ]);

  if (!locked.length) throw new HttpError(404, "Match not found");
  if (!removed.length) throw new HttpError(409, "You are not in this match, or it already started");
  return res.status(200).json({ left: true, matchCancelled: cancelled.length > 0 });
});
