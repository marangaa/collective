import path from "node:path";

import type { Database } from "./index";

/**
 * Applies drizzle-kit generated SQL migrations (src/migrations).
 * Driver chosen the same way as createDb: URL scheme.
 */
export async function migrateDb(db: Database, databaseUrl: string) {
  const migrationsFolder = path.join(import.meta.dir, "migrations");
  if (databaseUrl.startsWith("pglite:") || databaseUrl.startsWith("file:")) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    return migrate(db as never, { migrationsFolder });
  }
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  return migrate(db, { migrationsFolder });
}
