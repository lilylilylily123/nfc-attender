import { router } from "./trpc";
import { learnersRouter } from "./routers/learners";
import { attendanceRouter } from "./routers/attendance";

export const appRouter = router({
  learners: learnersRouter,
  attendance: attendanceRouter,
});

export type AppRouter = typeof appRouter;
