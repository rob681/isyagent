import { z } from "zod";
import { router, protectedProcedure, getOrgId } from "../trpc";
import { sendMessageSchema, createConversationSchema } from "@isyagent/shared";

export const conversationsRouter = router({
  // List conversations for current org
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      const conversations = await ctx.db.conversation.findMany({
        where: {
          organizationId: orgId,
          status: input.status,
          ...(input.clientId && { clientId: input.clientId }),
        },
        include: {
          client: { select: { id: true, name: true, logoUrl: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, role: true, createdAt: true },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });

      const hasMore = conversations.length > input.limit;
      const items = hasMore ? conversations.slice(0, input.limit) : conversations;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      };
    }),

  // Get a single conversation with messages
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      const conversation = await ctx.db.conversation.findFirst({
        where: { id: input.id, organizationId: orgId },
        include: {
          client: { select: { id: true, name: true, logoUrl: true } },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              content: true,
              llmTier: true,
              skillName: true,
              toolInput: true,
              toolOutput: true,
              userId: true,
              user: { select: { name: true, avatarUrl: true } },
              createdAt: true,
            },
          },
        },
      });

      return conversation;
    }),

  // Create a new conversation
  create: protectedProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      return ctx.db.conversation.create({
        data: {
          organizationId: orgId,
          clientId: input.clientId,
          title: input.title ?? "Nueva conversación",
        },
      });
    }),

  // Send a message (creates conversation if needed, stores user message, returns mock assistant reply for now)
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);
      const userId = ctx.session.user.id;

      // Create or reuse conversation
      let conversationId = input.conversationId;
      if (!conversationId) {
        const conv = await ctx.db.conversation.create({
          data: {
            organizationId: orgId,
            clientId: input.clientId,
            title: input.content.slice(0, 80),
          },
        });
        conversationId = conv.id;
      }

      // Store user message
      const userMsg = await ctx.db.message.create({
        data: {
          conversationId,
          role: "user",
          content: input.content,
          userId,
        },
      });

      // TODO: Replace with AgentOrchestrator.chat() in Step 4
      // For now, return a simple echo-based reply
      const assistantContent = getPlaceholderReply(input.content);

      const assistantMsg = await ctx.db.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: assistantContent,
          llmTier: "SONNET",
          llmModel: "placeholder",
        },
      });

      // Update conversation timestamp
      await ctx.db.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return {
        conversationId,
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      };
    }),

  // Archive a conversation
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = getOrgId(ctx);

      return ctx.db.conversation.update({
        where: { id: input.id, organizationId: orgId },
        data: { status: "ARCHIVED" },
      });
    }),
});

// Placeholder responses until Anthropic streaming is connected
function getPlaceholderReply(userInput: string): string {
  const lower = userInput.toLowerCase();
  if (lower.includes("tarea") || lower.includes("task")) {
    return "Entendido. Voy a preparar una propuesta de tarea para que la revises.\n\n📋 **Acción propuesta:** Crear tarea en IsyTask\n\nLa enviaré a tu Bandeja de Decisiones para que la apruebes.";
  }
  if (lower.includes("post") || lower.includes("publicación") || lower.includes("instagram")) {
    return "¡Perfecto! Déjame revisar la memoria de marca del cliente y preparar un borrador.\n\n📝 **Acción propuesta:** Crear borrador de publicación\n\nAparecerá en tu Bandeja de Decisiones.";
  }
  if (lower.includes("mensaje") || lower.includes("dm") || lower.includes("responder")) {
    return "Revisé los mensajes recientes. Puedo preparar respuestas basándome en la memoria de servicios y precios. ¿Quieres que lo haga?";
  }
  return "Entendido. Puedo crear tareas, redactar publicaciones, revisar mensajes o darte un resumen. ¿Qué prefieres?";
}
