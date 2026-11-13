import { sql } from "./db.js";
import { HttpError } from "./http.js";

export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  const first = typeof xff === "string" ? xff.split(",")[0].trim() : "";
  return first || req.socket?.remoteAddress || "unknown";
}

// Fixed-window counter stored in Postgres (works across serverless instances).
// Fails open if the DB check itself errors, so an outage doesn't lock everyone out.
export async function rateLimit(key, limit, windowSec) {
  let count;
  try {
    const ms = windowSec * 1000;
    const windowStart = new Date(Math.floor(Date.now() / ms) * ms).toISOString();
    const rows = await sql`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (${key.slice(0, 200)}, ${windowStart}::timestamptz, 1)
      ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
      RETURNING count
    `;
    count = rows[0].count;
    if (Math.random() < 0.02) {
      await sql`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`;
    }
  } catch (error) {
    console.error("rateLimit:", error);
    return;
  }
  if (count > limit) throw new HttpError(429, "Too many requests, please try again later");
}
