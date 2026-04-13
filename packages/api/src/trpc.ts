import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "@isyagent/db";

export interface Context {
  db: typeof db;
  session: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    organizationId: string;
    role: string;
  } | null;
}

export function createTRPCContext(opts: {
  session: Context["session"];
}): Context {
  return {
    db,
    session: opts.session,
  };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ── Protected: must be logged in ──────────────────────────────────────────────
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// ── Admin: must be OWNER or ADMIN ─────────────────────────────────────────────
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!["OWNER", "ADMIN"].includes(ctx.session.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Se requiere rol de administrador" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// Helper to get organizationId from context
export function getOrgId(ctx: { session: NonNullable<Context["session"]> }): string {
  return ctx.session.organizationId;
}
