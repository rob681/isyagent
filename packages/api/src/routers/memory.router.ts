import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, getOrgId } from "../trpc";
import {
  createMemorySchema,
  updateMemorySchema,
  ingestSourceSchema,
} from "@isyagent/shared";

export const memoryRouter = router({
  // List memory chunks (filterable by level, client, category)
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        level: z.enum(["IDENTITY", "OPERATIONAL", "EPISODIC"]).optional(),
        category: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      return ctx.db.memoryChunk.findMany({
        where: {
          organizationId: orgId,
          ...(input.clientId && { clientId: input.clientId }),
          ...(input.level && { level: input.level }),
          ...(input.category && { category: input.category }),
        },
        include: {
          source: { select: { id: true, label: true, type: true } },
          client: { select: { id: true, name: true } },
        },
        orderBy: [{ level: "asc" }, { updatedAt: "desc" }],
        take: input.limit,
      });
    }),

  // Create a manual memory chunk (Identity level)
  create: adminProcedure
    .input(createMemorySchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      return ctx.db.memoryChunk.create({
        data: {
          organizationId: orgId,
          clientId: input.clientId,
          level: input.level,
          category: input.category,
          content: input.content,
          isEditable: input.level === "IDENTITY",
          embedding: [], // Will be computed async
        },
      });
    }),

  // Update an editable memory chunk
  update: adminProcedure
    .input(updateMemorySchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      const chunk = await ctx.db.memoryChunk.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!chunk) throw new TRPCError({ code: "NOT_FOUND" });
      if (!chunk.isEditable) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo las memorias de identidad son editables",
        });
      }

      return ctx.db.memoryChunk.update({
        where: { id: input.id },
        data: {
          content: input.content,
          category: input.category ?? chunk.category,
          editedAt: new Date(),
          embedding: [], // Will be recomputed async
        },
      });
    }),

  // Delete a memory chunk
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      return ctx.db.memoryChunk.deleteMany({
        where: { id: input.id, organizationId: orgId },
      });
    }),

  // List ingestion sources
  sources: protectedProcedure
    .input(z.object({ clientId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      return ctx.db.memorySource.findMany({
        where: {
          organizationId: orgId,
          ...(input.clientId && { clientId: input.clientId }),
        },
        include: {
          _count: { select: { chunks: true } },
          client: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Ingest a new source (PDF, website, IG handle, manual text)
  ingest: adminProcedure
    .input(ingestSourceSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      const source = await ctx.db.memorySource.create({
        data: {
          organizationId: orgId,
          clientId: input.clientId,
          type: input.type,
          label: input.label,
          sourceUrl: input.sourceUrl,
          rawContent: input.rawContent,
        },
      });

      // TODO: Queue async processing (extract text, chunk, embed)
      // For MVP, MANUAL_TEXT is processed inline:
      if (input.type === "MANUAL_TEXT" && input.rawContent) {
        await ctx.db.memoryChunk.create({
          data: {
            organizationId: orgId,
            clientId: input.clientId,
            sourceId: source.id,
            level: "IDENTITY",
            content: input.rawContent,
            isEditable: true,
            embedding: [],
          },
        });

        await ctx.db.memorySource.update({
          where: { id: source.id },
          data: { processedAt: new Date() },
        });
      }

      return source;
    }),
});
