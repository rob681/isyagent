import { z } from "zod";
import { router, protectedProcedure, getOrgId } from "../trpc";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);

    // Count pending decisions
    const pendingDecisions = await ctx.db.decision.count({
      where: { organizationId: orgId, status: "PENDING" },
    });

    // Count active conversations
    const activeConversations = await ctx.db.conversation.count({
      where: { organizationId: orgId, status: "ACTIVE" },
    });

    // Count memory chunks
    const memoryChunks = await ctx.db.memoryChunk.count({
      where: { organizationId: orgId },
    });

    // Count total clients
    const totalClients = await ctx.db.client.count({
      where: { organizationId: orgId },
    });

    // Get org budget
    const org = await ctx.db.organization.findUnique({
      where: { id: orgId },
      select: {
        llmMonthlyBudgetCents: true,
        llmCurrentMonthCents: true,
      },
    });

    const budgetUsedPercent = org
      ? Math.round(
          (org.llmCurrentMonthCents / Math.max(org.llmMonthlyBudgetCents, 1)) * 100
        )
      : 0;

    return {
      pendingDecisions,
      activeConversations,
      memoryChunks,
      totalClients,
      budgetUsedPercent,
    };
  }),

  activity: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);

    return ctx.db.memoryChunk.findMany({
      where: { organizationId: orgId, level: "OPERATIONAL" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        content: true,
        category: true,
        createdAt: true,
      },
    });
  }),
});
