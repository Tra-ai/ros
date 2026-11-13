import { SignJWT, jwtVerify } from "jose";
import { HttpError } from "./http.js";

function secretKey() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export async function createToken(player) {
  return new SignJWT({ playerId: String(player.id), username: player.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

// Any bad / expired / tampered token is a 401 (it used to bubble up as a 500).
export async function requirePlayer(req) {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!match) throw new HttpError(401, "Unauthorized");
  const key = secretKey(); // config errors stay 500, not 401
  try {
    const { payload } = await jwtVerify(match[1], key, { algorithms: ["HS256"] });
    if (!payload.playerId) throw new Error("no playerId");
    return payload;
  } catch {
    throw new HttpError(401, "Unauthorized");
  }
}
