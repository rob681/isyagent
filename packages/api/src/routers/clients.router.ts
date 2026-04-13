import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, getOrgId } from "../trpc";

export const clientsRouter = router({
  // List all clients for the org
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);
    return ctx.db.client.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        isytaskClientId: true,
        isysocialClientId: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  // Get a single client with counts
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      const client = await ctx.db.client.findFirst({
        where: { id: input.id, organizationId: orgId },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          isytaskClientId: true,
          isysocialClientId: true,
          _count: {
            select: {
              memoryChunks: true,
              decisions: true,
            },
          },
        },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      return client;
    }),

  // Create a new client
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      return ctx.db.client.create({
        data: {
          organizationId: orgId,
          name: input.name,
          description: input.description,
        },
      });
    }),

  // Update a client
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isytaskClientId: z.string().nullable().optional(),
        isysocialClientId: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      const existing = await ctx.db.client.findFirst({
        where: { id: input.id, organizationId: orgId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      const { id, ...data } = input;
      return ctx.db.client.update({
        where: { id },
        data,
      });
    }),

  // Upsert a memory chunk for a client (IDENTITY level)
  upsertMemory: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        content: z.string().min(1),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      // Verify client belongs to org
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: orgId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      return ctx.db.memoryChunk.create({
        data: {
          organizationId: orgId,
          clientId: input.clientId,
          level: "IDENTITY",
          category: input.category,
          content: input.content,
          isEditable: true,
        },
      });
    }),

  // Get memory chunks for a client
  getMemory: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      // Verify client belongs to org
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: orgId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      return ctx.db.memoryChunk.findMany({
        where: { organizationId: orgId, clientId: input.clientId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          category: true,
          level: true,
          isEditable: true,
          createdAt: true,
        },
      });
    }),

  // Get decisions for a client
  getDecisions: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: orgId },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      return ctx.db.decision.findMany({
        where: { organizationId: orgId, clientId: input.clientId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          description: true,
          skillName: true,
          status: true,
          urgency: true,
          createdAt: true,
        },
      });
    }),
});
