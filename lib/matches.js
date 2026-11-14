import { sql } from "./db.js";

// Waiting matches nobody started are cancelled after this long, so abandoned
// lobbies don't clutter the list or count against a host's open-match limit.
export const WAITING_TTL_MINUTES = 30;

export async function expireStaleMatches() {
  await sql`
    UPDATE matches SET status = 'cancelled'
    WHERE status = 'waiting'
      AND created_at < NOW() - make_interval(mins => ${WAITING_TTL_MINUTES}::int)
  `;
}
