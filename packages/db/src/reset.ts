/**
 * Pre-production reset: drops and recreates the public schema so the baseline
 * migration can apply cleanly. NEVER run against a database holding real data.
 *
 *   bun run src/reset.ts --yes   (from the database package with Neon DATABASE_URL loaded)
 */
import { createDb } from "./index";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required; refusing to reset without a Neon database");
const db = createDb({ DATABASE_URL });

const confirmed = process.argv.includes("--yes");
if (!confirmed) {
  console.error("Refusing to drop schema without --yes flag.");
  process.exit(1);
}

await db.execute(sql`drop schema public cascade`);
await db.execute(sql`create schema public`);
console.log(`✓ schema reset on ${DATABASE_URL.replace(/:[^:@]*@/, ":***@")}`);
process.exit(0);
