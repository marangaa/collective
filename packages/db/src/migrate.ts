import path from "node:path";

import type { Database } from "./index";

/** Apply the checked-in PostgreSQL migrations to Neon. */
export async function migrateDb(db: Database) {
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  return migrate(db, { migrationsFolder: path.join(import.meta.dir, "migrations") });
}
