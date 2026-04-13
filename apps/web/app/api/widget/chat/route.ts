import { db } from "@isyagent/db";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
});

const MODEL = "claude-sonnet-4-20250514";

export async function POST(req: Request) {
  const { token, content, history } = await req.json();

  if (!token || !content?.trim()) {
    return new Response("token and content are required", { status: 400 });
  }

  // Authenticate by org slug
  const org = await db.organization.findUnique({
    where: { slug: token, isActive: true },
    select: { id: true, name: true },
  });

  if (!org) {
    return new Response("Invalid token", { status: 401 });
  }

  // Load identity memories for context
  const memories = await db.memoryChunk.findMany({
    where: { organizationId: org.id, level: "IDENTITY" },
    select: { category: true, content: true },
    take: 15,
  });

  const memoryContext = memories.length > 0
    ? memories.map((m) => `[${m.category ?? "info"}] ${m.content}`).join("\n")
    : "No hay información adicional configurada.";

  const systemPrompt = `Eres el asistente virtual de ${org.name}. Eres amable, conciso y orientado a ayudar a los clientes de esta agencia.

## Información sobre la agencia
${memoryContext}

## Reglas
- Responde siempre en español (salvo que el usuario escriba en otro idioma)
- Sé amable y profesional
- Si no sabes algo, di que derivarás la consulta al equipo
- No inventes información que no esté en el contexto
- Respuestas cortas y claras — este es un chat widget`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...(history ?? []).slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content },
  ];

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 512,
          system: systemPrompt,
          messages,
        });

        stream.on("text", (text: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`)
          );
        });

        await stream.finalMessage();

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
        controller.close();
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: err?.message ?? "Error desconocido" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
