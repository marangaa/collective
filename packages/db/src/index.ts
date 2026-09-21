import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { DatabaseConfig } from "./config";

/**
 * Driver is chosen by DATABASE_URL scheme:
 *   postgres://…  → Neon (or any Postgres) via postgres.js
 *   pglite:./dir  → embedded PGlite for zero-dependency local dev
 *   file:./dir    → treated as PGlite data dir (legacy scaffold value)
 */
export function createDb(env: DatabaseConfig) {
  const url = env.DATABASE_URL;

  if (url.startsWith("pglite:") || url.startsWith("file:")) {
    const dataDir = url.replace(/^(pglite|file):/, "") || "./local.db";
    const client = new PGlite(dataDir);
    return drizzlePglite({ client }) as unknown as Database;
  }

  const client = postgres(url, { prepare: false });
  return drizzlePostgres({ client });
}

export type Database = ReturnType<typeof drizzlePostgres>;

