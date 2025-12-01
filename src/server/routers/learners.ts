import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const learnersRouter = router({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        perPage: z.number().default(8),
        search: z.string().optional(),
        program: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { pb } = ctx;
      const { page, perPage, search, program } = input;

      const filterParts: string[] = [];
      if (search && search.trim()) {
        const safe = search.trim().replace(/"/g, '\\"');
        filterParts.push(`name ~ "${safe}"`);
      }
      if (program && program !== "all") {
        const safe = program.replace(/"/g, '\\"');
        filterParts.push(`program = "${safe}"`);
      }

      const opts: any = { sort: "-time_in" };
      if (filterParts.length > 0) opts.filter = filterParts.join(" && ");

      const response = await pb.collection("learners").getList(page, perPage, opts);

      return {
        items: response.items,
        totalItems: response.totalItems,
        totalPages: Math.max(1, Math.ceil((response.totalItems || 0) / perPage)),
      };
    }),
});
