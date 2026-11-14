import { sql } from "../../../lib/db.js";
import { requirePlayer } from "../../../lib/auth.js";
import { route, parseId, HttpError } from "../../../lib/http.js";

// Host marks a waiting match as "starting". The real-time game server
// (separate WebSocket service) should pick up matches in this state.
export default route(["POST"], async (req, res) => {
  const auth = await requirePlayer(req);
  const id = parseId(req.query.id);

  const updated = await sql`
    UPDATE matches SET status = 'starting'
    WHERE id = ${id}::bigint AND host_player_id = ${auth.playerId}::bigint AND status = 'waiting'
    RETURNING id, status
  `;
  if (updated.length) return res.status(200).json({ match: updated[0] });

  const rows = await sql`SELECT host_player_id, status FROM matches WHERE id = ${id}::bigint`;
  if (!rows.length) throw new HttpError(404, "Match not found");
  if (String(rows[0].host_player_id) !== String(auth.playerId)) throw new HttpError(403, "Only the host can start the match");
  throw new HttpError(409, "Match is no longer waiting");
});
