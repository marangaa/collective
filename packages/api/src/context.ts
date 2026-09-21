import type { Database } from "@collective/db";

export type Context = {
  db: Database;
  session: { id: string; userId: string } | null;
  user: { id: string; role: string | null; isAnonymous: boolean } | null;
};
