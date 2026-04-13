/**
 * POST /api/events
 *
 * Cross-product event bus endpoint.
 * IsyTask and IsySocial call this webhook to notify IsyAgent of events.
 *
 * Auth: Bearer token (CRON_SECRET) or matching organization's agencyId.
 *
 * Payload:
 * {
 *   source: "isytask" | "isysocial",
 *   event: "task.completed" | "task.created" | "post.published" | "client.created" | ...,
 *   agencyId: "cmmkplwq70001npm7x2t66sko",
 *   data: { ... event-specific payload ... }
 * }
 *
 * Effect: Creates OPERATIONAL memory chunks so the agent "remembers"
 * what happened across products.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const db = new PrismaClient();

interface EventPayload {
  source: "isytask" | "isysocial";
  event: string;
  agencyId: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

// Map event types to human-readable descriptions
const EVENT_TEMPLATES: Record<string, (data: Record<string, unknown>) => string> = {
  "task.created": (d) =>
    `Nueva tarea creada en IsyTask: "${d.title}" para ${d.clientName || "un cliente"}. Categoría: ${d.category || "N/A"}.`,
  "task.completed": (d) =>
    `Tarea finalizada en IsyTask: "${d.title}" (#${d.taskNumber}). ${d.outcomeNote ? `Nota: ${d.outcomeNote}` : ""}`,
  "task.status_changed": (d) =>
    `Tarea #${d.taskNumber} "${d.title}" cambió de estado: ${d.fromStatus} → ${d.toStatus}.`,
  "task.comment_added": (d) =>
    `Nuevo comentario en tarea #${d.taskNumber}: "${String(d.comment).slice(0, 100)}" por ${d.authorName}.`,
  "post.published": (d) =>
    `Post publicado en IsySocial: "${d.title || "Sin título"}" en ${d.network} para ${d.clientName || "un cliente"}.`,
  "post.approved": (d) =>
    `Post aprobado para publicación: "${d.title}" en ${d.network}.`,
  "post.scheduled": (d) =>
    `Post programado en IsySocial: "${d.title}" en ${d.network} para ${d.scheduledAt}.`,
  "client.created": (d) =>
    `Nuevo cliente registrado: "${d.clientName}" en ${d.source === "isytask" ? "IsyTask" : "IsySocial"}.`,
};

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const payload: EventPayload = await req.json();

    if (!payload.source || !payload.event || !payload.agencyId) {
      return NextResponse.json(
        { error: "Faltan campos: source, event, agencyId" },
        { status: 400 }
      );
    }

    // Find the IsyAgent organization linked to this agencyId
    const fieldName = payload.source === "isytask" ? "isytaskAgencyId" : "isysocialAgencyId";
    const org = await db.organization.findFirst({
      where: { [fieldName]: payload.agencyId },
      select: { id: true, name: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: `No se encontró organización vinculada al agencyId ${payload.agencyId}` },
        { status: 404 }
      );
    }

    // Generate memory content from event
    const template = EVENT_TEMPLATES[payload.event];
    const content = template
      ? template(payload.data)
      : `Evento ${payload.event} recibido de ${payload.source}: ${JSON.stringify(payload.data).slice(0, 500)}`;

    // Create OPERATIONAL memory chunk
    const chunk = await db.memoryChunk.create({
      data: {
        organizationId: org.id,
        level: "OPERATIONAL",
        category: `${payload.source}:${payload.event.split(".")[0]}`, // e.g. "isytask:task"
        content,
        isEditable: false,
        embedding: undefined,
      },
    });

    // Create notification for important events
    const importantEvents = ["task.completed", "post.published", "client.created"];
    if (importantEvents.includes(payload.event)) {
      await db.notification.create({
        data: {
          organizationId: org.id,
          title: `Evento: ${payload.event}`,
          body: content.slice(0, 200),
          type: "DECISION_CREATED", // Reuse type for now
          entityId: chunk.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      chunkId: chunk.id,
      organizationId: org.id,
    });
  } catch (err: any) {
    console.error("[EventBus] Error:", err);
    return NextResponse.json(
      { error: err.message || "Error procesando evento" },
      { status: 500 }
    );
  }
}
