import { publicProcedure, router } from "../index";
import { auditRouter } from "./audit";
import { reportRouter } from "./report";
import { reviewRouter } from "./review";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  audit: auditRouter,
  report: reportRouter,
  review: reviewRouter,
});
export type AppRouter = typeof appRouter;
