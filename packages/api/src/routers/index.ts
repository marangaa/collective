import { publicProcedure, router } from "../index";
import { auditRouter } from "./audit";
import { reportRouter } from "./report";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  audit: auditRouter,
  report: reportRouter,
});
export type AppRouter = typeof appRouter;
