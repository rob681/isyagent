import { z } from "zod";
import { router, protectedProcedure, adminProcedure, getOrgId } from "../trpc";
import { onboardingSchema } from "@isyagent/shared";

export const onboardingRouter = router({
  // Complete onboarding: create client + initial memory sources
  complete: protectedProcedure
    .input(onboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      // Update org name if provided
      await ctx.db.organization.update({
        where: { id: orgId },
        data: { name: input.organizationName },
      });

      // Create client if provided
      let clientId: string | null = null;
      if (input.clientName) {
        const client = await ctx.db.client.create({
          data: {
            organizationId: orgId,
            name: input.clientName,
            description: input.description,
          },
        });
        clientId = client.id;
      }

      // Queue memory sources for ingestion
      const sources: { type: string; label: string; sourceUrl?: string; rawContent?: string }[] = [];

      if (input.websiteUrl) {
        sources.push({
          type: "WEBSITE",
          label: `Website: ${input.websiteUrl}`,
          sourceUrl: input.websiteUrl,
        });
      }

      if (input.instagramHandle) {
        sources.push({
          type: "INSTAGRAM_HANDLE",
          label: `Instagram: @${input.instagramHandle.replace("@", "")}`,
          sourceUrl: `https://instagram.com/${input.instagramHandle.replace("@", "")}`,
        });
      }

      if (input.description) {
        sources.push({
          type: "MANUAL_TEXT",
          label: "Descripción del negocio",
          rawContent: input.description,
        });
      }

      // Create all sources
      for (const src of sources) {
        const source = await ctx.db.memorySource.create({
          data: {
            organizationId: orgId,
            clientId,
            type: src.type as any,
            label: src.label,
            sourceUrl: src.sourceUrl,
            rawContent: src.rawContent,
          },
        });

        // For manual text, create chunk inline
        if (src.type === "MANUAL_TEXT" && src.rawContent) {
          await ctx.db.memoryChunk.create({
            data: {
              organizationId: orgId,
              clientId,
              sourceId: source.id,
              level: "IDENTITY",
              category: "description",
              content: src.rawContent,
              isEditable: true,
              embedding: undefined,
            },
          });
          await ctx.db.memorySource.update({
            where: { id: source.id },
            data: { processedAt: new Date() },
          });
        }
      }

      return { success: true, clientId };
    }),

  // Get current organization info (for settings)
  getOrg: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);
    return ctx.db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isytaskAgencyId: true,
        isysocialAgencyId: true,
        llmMonthlyBudgetCents: true,
      },
    });
  }),

  // Update cross-product agency IDs
  updateAgencyIds: adminProcedure
    .input(
      z.object({
        isytaskAgencyId: z.string().optional(),
        isysocialAgencyId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      return ctx.db.organization.update({
        where: { id: orgId },
        data: {
          isytaskAgencyId: input.isytaskAgencyId || null,
          isysocialAgencyId: input.isysocialAgencyId || null,
        },
      });
    }),
});
