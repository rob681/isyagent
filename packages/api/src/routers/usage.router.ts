import { router, protectedProcedure, getOrgId } from "../trpc";

export const usageRouter = router({
  // Summary: current month totals, budget, daily breakdown, tier breakdown
  summary: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);

    // Get org budget info
    const org = await ctx.db.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { llmMonthlyBudgetCents: true, llmCurrentMonthCents: true },
    });

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Totals this month
    const monthAgg = await ctx.db.lLMUsage.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { totalTokens: true, costCents: true, inputTokens: true, outputTokens: true },
      _count: true,
    });

    // Today's count
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = await ctx.db.lLMUsage.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: todayStart },
      },
    });

    // Daily usage — last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyRaw = await ctx.db.lLMUsage.groupBy({
      by: ["createdAt"],
      where: {
        organizationId: orgId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { totalTokens: true, costCents: true },
    });

    // Aggregate by date string (YYYY-MM-DD)
    const dailyMap = new Map<string, { tokens: number; costCents: number }>();
    for (const row of dailyRaw) {
      const dateKey = row.createdAt.toISOString().slice(0, 10);
      const existing = dailyMap.get(dateKey) ?? { tokens: 0, costCents: 0 };
      existing.tokens += row._sum.totalTokens ?? 0;
      existing.costCents += row._sum.costCents ?? 0;
      dailyMap.set(dateKey, existing);
    }

    const dailyUsage = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, tokens: data.tokens, costCents: data.costCents }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By tier
    const byTierRaw = await ctx.db.lLMUsage.groupBy({
      by: ["tier"],
      where: {
        organizationId: orgId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { totalTokens: true, costCents: true, inputTokens: true, outputTokens: true },
      _count: true,
    });

    const byTier = byTierRaw.map((row) => ({
      tier: row.tier,
      totalTokens: row._sum.totalTokens ?? 0,
      inputTokens: row._sum.inputTokens ?? 0,
      outputTokens: row._sum.outputTokens ?? 0,
      costCents: row._sum.costCents ?? 0,
      count: row._count,
    }));

    return {
      totalTokensThisMonth: monthAgg._sum.totalTokens ?? 0,
      totalCostCentsThisMonth: monthAgg._sum.costCents ?? 0,
      totalCallsThisMonth: monthAgg._count,
      callsToday: todayCount,
      budgetCents: org.llmMonthlyBudgetCents,
      currentMonthCents: org.llmCurrentMonthCents,
      dailyUsage,
      byTier,
    };
  }),

  // Recent: last 20 LLM usage entries
  recent: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);

    return ctx.db.lLMUsage.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        tier: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costCents: true,
        purpose: true,
        conversationId: true,
        createdAt: true,
      },
    });
  }),
});
