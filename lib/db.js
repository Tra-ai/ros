import { neon } from "@neondatabase/serverless";

// Lazy init: a missing DATABASE_URL no longer crashes at import time
// (it surfaces as a clean 500 from the route wrapper instead).
let client;
function getClient() {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is missing");
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

export const sql = (...args) => getClient()(...args);
sql.transaction = (...args) => getClient().transaction(...args);
