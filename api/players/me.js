import { sql } from "../../lib/db.js";
import { requirePlayer } from "../../lib/auth.js";
import { route, HttpError } from "../../lib/http.js";

export default route(["GET"], async (req, res) => {
  const auth = await requirePlayer(req);
  const rows = await sql`
    SELECT id, username, email, level, xp, rank_points, created_at
    FROM players WHERE id = ${auth.playerId}::bigint LIMIT 1
  `;
  if (!rows.length) throw new HttpError(404, "Player not found");
  return res.status(200).json({ player: rows[0] });
});
