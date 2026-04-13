/**
 * Notification helper — creates notifications in agent_notifications table
 */

import { PrismaClient } from "../../../../apps/web/generated/prisma";

interface NotifyParams {
  organizationId: string;
  userId?: string | null; // null = broadcast to all org members
  title: string;
  body: string;
  type: "DECISION_CREATED" | "SKILL_EXECUTED" | "SKILL_FAILED" | "INGEST_COMPLETE";
  entityId?: string;
}

export async function createNotification(db: PrismaClient, params: NotifyParams) {
  try {
    await db.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? undefined,
        title: params.title,
        body: params.body,
        type: params.type,
        entityId: params.entityId,
      },
    });
  } catch (err) {
    // Don't let notification failures break the main flow
    console.error("[Notify] Failed to create notification:", err);
  }
}
