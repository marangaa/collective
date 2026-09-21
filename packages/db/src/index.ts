import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { DatabaseConfig } from "./config";

/**
 * Create the server database connection.
 *
 * The application deliberately supports Neon/Postgres only. Use Neon’s pooled
 * connection string for the long-lived API process; migrations should use the
 * direct connection string when the deployment environment provides both.
 */
export function createDb({ DATABASE_URL }: DatabaseConfig) {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Add the Neon PostgreSQL connection string to the server environment.");
  }
  if (!DATABASE_URL.startsWith("postgres://") && !DATABASE_URL.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL must be a PostgreSQL/Neon connection string");
  }

  const client = postgres(DATABASE_URL, { prepare: false });
  return drizzle({ client });
}

export type Database = ReturnType<typeof drizzle>;

