import { z } from "zod";
import { router, protectedProcedure, getOrgId } from "../trpc";

export const reportsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      const reports = await ctx.db.memoryChunk.findMany({
        where: {
          organizationId: orgId,
          level: "OPERATIONAL",
          category: "weekly_report",
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      });

      return { reports };
    }),

  orgInfo: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);

    const org = await ctx.db.organization.findUnique({
      where: { id: orgId },
      select: { slug: true, name: true },
    });

    return { slug: org?.slug ?? "", name: org?.name ?? "" };
  }),
});
