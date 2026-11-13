import bcrypt from "bcryptjs";
import { sql } from "../../lib/db.js";
import { createToken } from "../../lib/auth.js";
import { route, readBody, HttpError } from "../../lib/http.js";
import { rateLimit, clientIp } from "../../lib/rateLimit.js";

export default route(["POST"], async (req, res) => {
  await rateLimit(`register:${clientIp(req)}`, 10, 3600);

  const { username, email, password } = readBody(req);
  if (typeof username !== "string" || !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    throw new HttpError(400, "Username must be 3-20 letters, numbers or underscores");
  }
  if (typeof email !== "string" || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, "Valid email required");
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    throw new HttpError(400, "Password must be 8-72 characters");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 12);

  let player;
  try {
    // No SELECT-then-INSERT race: the unique indexes (lower(email), lower(username))
    // are the source of truth.
    const rows = await sql`
      INSERT INTO players (username, email, password_hash)
      VALUES (${username}, ${normalizedEmail}, ${passwordHash})
      RETURNING id, username, email, level, xp, rank_points
    `;
    player = rows[0];
  } catch (error) {
    if (error.code === "23505") throw new HttpError(409, "Email or username already exists");
    throw error;
  }
  const token = await createToken(player);
  return res.status(201).json({ player, token });
});
