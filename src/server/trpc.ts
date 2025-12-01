import { initTRPC } from "@trpc/server";
import { getAdminPb, clearAdminPbCache } from "../app/api/lib/pb-admin";
import PocketBase from "pocketbase";

/**
 * Context for tRPC procedures
 * Provides authenticated PocketBase admin client
 */
export const createContext = async () => {
  let pb: PocketBase;
  try {
    pb = await getAdminPb();
  } catch (err) {
    clearAdminPbCache();
    pb = await getAdminPb();
  }
  return { pb };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
