import { sql } from "../lib/db.js";
import { route } from "../lib/http.js";

export default route(["GET"], async (req, res) => {
  const rows = await sql`
    SELECT username, level, xp, rank_points
    FROM players
    ORDER BY rank_points DESC, xp DESC, id ASC
    LIMIT 50
  `;
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  return res.status(200).json({ leaderboard: rows });
});
