import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, getOrgId } from "../trpc";
import { decisionActionSchema } from "@isyagent/shared";

export const decisionsRouter = router({
  // List decisions (the Decision Inbox — primary landing page)
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED", "AUTO_EXECUTED"]).optional(),
        clientId: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      return ctx.db.decision.findMany({
        where: {
          organizationId: orgId,
          ...(input.status && { status: input.status }),
          ...(input.clientId && { clientId: input.clientId }),
        },
        include: {
          client: { select: { id: true, name: true, logoUrl: true } },
          actor: { select: { id: true, name: true } },
          conversation: { select: { id: true, title: true } },
        },
        orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
        take: input.limit,
      });
    }),

  // Get decision detail
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      const decision = await ctx.db.decision.findFirst({
        where: { id: input.id, organizationId: orgId },
        include: {
          client: true,
          actor: { select: { id: true, name: true } },
          conversation: { select: { id: true, title: true } },
        },
      });

      if (!decision) throw new TRPCError({ code: "NOT_FOUND" });
      return decision;
    }),

  // Approve or reject a decision
  act: protectedProcedure
    .input(decisionActionSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      const userId = ctx.session.user.id;

      const decision = await ctx.db.decision.findFirst({
        where: { id: input.id, organizationId: orgId, status: "PENDING" },
      });

      if (!decision) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Decisión no encontrada o ya procesada",
        });
      }

      const updated = await ctx.db.decision.update({
        where: { id: input.id },
        data: {
          status: input.action,
          statusNote: input.note,
          actorId: userId,
          decidedAt: new Date(),
        },
      });

      // If approved, execute the skill
      if (input.action === "APPROVED") {
        // TODO: Execute skill via Skills Registry
        // For now, just mark as approved — skill execution comes in Phase 2
      }

      return updated;
    }),

  // Stats for the dashboard counter badges
  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);

    const [pending, todayApproved, todayRejected] = await Promise.all([
      ctx.db.decision.count({
        where: { organizationId: orgId, status: "PENDING" },
      }),
      ctx.db.decision.count({
        where: {
          organizationId: orgId,
          status: "APPROVED",
          decidedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      ctx.db.decision.count({
        where: {
          organizationId: orgId,
          status: "REJECTED",
          decidedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return { pending, todayApproved, todayRejected };
  }),
});
