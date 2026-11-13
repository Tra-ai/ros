import { sql } from "../../../lib/db.js";
import { route, parseId, HttpError } from "../../../lib/http.js";

export default route(["GET"], async (req, res) => {
  const id = parseId(req.query.id);
  const matches = await sql`
    SELECT id, host_player_id, mode, map_name, status, max_players, created_at
    FROM matches WHERE id = ${id}::bigint
  `;
  if (!matches.length) throw new HttpError(404, "Match not found");
  const players = await sql`
    SELECT p.id, p.username
    FROM match_players mp JOIN players p ON p.id = mp.player_id
    WHERE mp.match_id = ${id}::bigint
    ORDER BY mp.joined_at ASC
  `;
  return res.status(200).json({ match: matches[0], players });
});
