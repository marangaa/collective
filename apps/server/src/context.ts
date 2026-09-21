import type { Context as ApiContext } from "@collective/api/context";
import type { Context as HonoContext } from "hono";

import { auth } from "./auth";
import { db } from "./services";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext(options: CreateContextOptions): Promise<ApiContext> {
  const current = await auth.api.getSession({ headers: options.context.req.raw.headers });
  return {
    db,
    session: current?.session ? { id: current.session.id, userId: current.session.userId } : null,
    user: current?.user
      ? {
          id: current.user.id,
          role: current.user.role ?? null,
          isAnonymous: current.user.isAnonymous ?? false,
        }
      : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
