import bcrypt from "bcryptjs";
import { sql } from "../../lib/db.js";
import { createToken } from "../../lib/auth.js";
import { route, readBody, HttpError } from "../../lib/http.js";
import { rateLimit, clientIp } from "../../lib/rateLimit.js";

let dummyHash;

export default route(["POST"], async (req, res) => {
  const { email, password } = readBody(req);
  if (typeof email !== "string" || typeof password !== "string" || email.length > 254 || password.length > 72) {
    throw new HttpError(400, "Email and password required");
  }
  const normalizedEmail = email.toLowerCase().trim();

  // Per-IP and per-account limits against brute force / credential stuffing.
  await rateLimit(`login:ip:${clientIp(req)}`, 30, 900);
  await rateLimit(`login:email:${normalizedEmail}`, 10, 900);

  const rows = await sql`
    SELECT id, username, email, password_hash, level, xp, rank_points
    FROM players WHERE lower(email) = ${normalizedEmail} LIMIT 1
  `;

  // Always run one bcrypt compare so response time doesn't reveal whether the email exists.
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const hash = rows.length ? rows[0].password_hash : dummyHash;
  const valid = await bcrypt.compare(password, hash);
  if (!rows.length || !valid) throw new HttpError(401, "Invalid email or password");

  const { password_hash, ...player } = rows[0];
  const token = await createToken(player);
  return res.status(200).json({ player, token });
});
