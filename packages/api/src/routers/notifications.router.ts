import { z } from "zod";
import { router, protectedProcedure, getOrgId } from "../trpc";

export const notificationsRouter = router({
  // List recent notifications (unread first)
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      const userId = ctx.session.user.id;

      return ctx.db.notification.findMany({
        where: {
          organizationId: orgId,
          OR: [{ userId }, { userId: null }], // Personal + broadcast
          ...(input.unreadOnly && { isRead: false }),
        },
        orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
        take: input.limit,
      });
    }),

  // Count unread
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);
    const userId = ctx.session.user.id;

    return ctx.db.notification.count({
      where: {
        organizationId: orgId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
    });
  }),

  // Mark as read
  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      return ctx.db.notification.updateMany({
        where: { id: input.id, organizationId: orgId },
        data: { isRead: true, readAt: new Date() },
      });
    }),

  // Mark all as read
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = getOrgId(ctx);
    const userId = ctx.session.user.id;
    return ctx.db.notification.updateMany({
      where: {
        organizationId: orgId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }),
});
