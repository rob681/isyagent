import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, getOrgId } from "../trpc";

export const teamRouter = router({
  // List team members
  list: adminProcedure.query(async ({ ctx }) => {
    const orgId = getOrgId(ctx);

    return ctx.db.organizationUser.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, isActive: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }),

  // Invite a new member (creates a pending OrganizationUser)
  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      // Check if user already exists in this org
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        const existingMember = await ctx.db.organizationUser.findFirst({
          where: { organizationId: orgId, userId: existingUser.id },
        });

        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este usuario ya es miembro de la organización",
          });
        }

        // User exists but isn't in this org — add them directly
        const membership = await ctx.db.organizationUser.create({
          data: {
            organizationId: orgId,
            userId: existingUser.id,
            role: input.role,
          },
        });

        // Send invite email if RESEND_API_KEY is set
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "IsyAgent <noreply@isyagent.dev>",
                to: input.email,
                subject: "Te invitaron a IsyAgent",
                html: `<p>Hola,</p><p>Has sido invitado a unirte a una organización en <strong>IsyAgent</strong>.</p><p>Ingresa a <a href="https://app.isyagent.dev">app.isyagent.dev</a> con tu cuenta para acceder.</p><p>¡Bienvenido!</p>`,
              }),
            });
          } catch (emailErr) {
            console.error("[TeamRouter] Failed to send invite email:", emailErr);
          }
        }

        return { membership, isExistingUser: true };
      }

      // User doesn't exist — create a placeholder invite
      // We'll use a special "pending" user approach
      const placeholderUser = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.email.split("@")[0], // Temporary name
          isActive: false, // Inactive until they register
        },
      });

      const membership = await ctx.db.organizationUser.create({
        data: {
          organizationId: orgId,
          userId: placeholderUser.id,
          role: input.role,
        },
      });

      // Send invite email if RESEND_API_KEY is set
      const resendKeyNew = process.env.RESEND_API_KEY;
      if (resendKeyNew) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKeyNew}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "IsyAgent <noreply@isyagent.dev>",
              to: input.email,
              subject: "Te invitaron a IsyAgent",
              html: `<p>Hola,</p><p>Has sido invitado a unirte a una organización en <strong>IsyAgent</strong>.</p><p>Crea tu cuenta en <a href="https://app.isyagent.dev/register">app.isyagent.dev/register</a> usando este correo para acceder.</p><p>¡Bienvenido!</p>`,
            }),
          });
        } catch (emailErr) {
          console.error("[TeamRouter] Failed to send invite email:", emailErr);
        }
      }

      return { membership, isExistingUser: false, inviteUserId: placeholderUser.id };
    }),

  // Update member role
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      const currentUserId = ctx.session.user.id;

      // Can't change own role
      if (input.userId === currentUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes cambiar tu propio rol",
        });
      }

      const member = await ctx.db.organizationUser.findFirst({
        where: { organizationId: orgId, userId: input.userId },
      });

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Can't change OWNER role
      if (member.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No se puede cambiar el rol del propietario",
        });
      }

      return ctx.db.organizationUser.update({
        where: { id: member.id },
        data: { role: input.role },
      });
    }),

  // Remove member
  remove: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      const currentUserId = ctx.session.user.id;

      if (input.userId === currentUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes eliminarte a ti mismo",
        });
      }

      const member = await ctx.db.organizationUser.findFirst({
        where: { organizationId: orgId, userId: input.userId },
      });

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (member.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No se puede eliminar al propietario",
        });
      }

      return ctx.db.organizationUser.delete({ where: { id: member.id } });
    }),
});
