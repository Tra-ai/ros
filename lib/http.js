export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function applyHeaders(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

// Wraps a handler: CORS, method check, and one central error handler.
export function route(methods, fn) {
  return async function handler(req, res) {
    if (applyHeaders(req, res)) return;
    if (!methods.includes(req.method)) {
      res.setHeader("Allow", methods.join(", "));
      return res.status(405).json({ error: "Method not allowed" });
    }
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error(`${req.method} ${req.url}:`, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function readBody(req) {
  return req.body && typeof req.body === "object" ? req.body : {};
}

export function parseId(value) {
  const s = Array.isArray(value) ? value[0] : value;
  if (!/^\d{1,18}$/.test(s || "")) throw new HttpError(400, "Invalid id");
  return s;
}
