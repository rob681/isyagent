import { z } from "zod";
import { router, protectedProcedure, adminProcedure, getOrgId } from "../trpc";
import { updateSkillConfigSchema } from "@isyagent/shared";
import { SKILL_LABELS } from "@isyagent/shared";

export const skillsRouter = router({
  // List skill configs for this org
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);

    const configs = await ctx.db.skillConfig.findMany({
      where: { organizationId: orgId },
      orderBy: { skillName: "asc" },
    });

    // Merge with known skills to show unconfigured ones too
    const allSkills = Object.entries(SKILL_LABELS).map(([name, meta]) => {
      const existing = configs.find((c) => c.skillName === name);
      return {
        skillName: name,
        ...meta,
        isEnabled: existing?.isEnabled ?? false,
        autonomyLevel: existing?.autonomyLevel ?? "L1",
        config: existing?.config ?? {},
        id: existing?.id ?? null,
      };
    });

    return allSkills;
  }),

  // Update a skill config (enable/disable, change autonomy level)
  update: adminProcedure
    .input(updateSkillConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      return ctx.db.skillConfig.upsert({
        where: {
          organizationId_skillName: {
            organizationId: orgId,
            skillName: input.skillName,
          },
        },
        create: {
          organizationId: orgId,
          skillName: input.skillName,
          isEnabled: input.isEnabled ?? true,
          autonomyLevel: (input.autonomyLevel as any) ?? "L1",
          config: (input.config as any) ?? {},
        },
        update: {
          ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
          ...(input.autonomyLevel && { autonomyLevel: input.autonomyLevel as any }),
          ...(input.config && { config: input.config as any }),
        },
      });
    }),
});
