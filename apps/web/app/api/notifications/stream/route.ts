/**
 * SSE endpoint for real-time notifications.
 * Keeps the connection open and pushes new notifications as they arrive.
 * Client reconnects automatically (EventSource spec).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isyagent/db";

export const maxDuration = 300; // 5 min max, then client reconnects

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let closed = false;

  // Track last seen notification to avoid duplicates
  let lastSeenAt = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Send current unread count immediately
      try {
        const count = await db.notification.count({
          where: {
            organizationId: orgId,
            isRead: false,
            OR: [{ userId }, { userId: null }],
          },
        });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "unread_count", count })}\n\n`
          )
        );
      } catch {
        // non-fatal
      }

      // Poll for new notifications every 4 seconds
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          const newNotifs = await db.notification.findMany({
            where: {
              organizationId: orgId,
              createdAt: { gt: lastSeenAt },
              OR: [{ userId }, { userId: null }],
            },
            orderBy: { createdAt: "asc" },
            take: 10,
            select: {
              id: true,
              title: true,
              body: true,
              type: true,
              entityId: true,
              isRead: true,
              createdAt: true,
            },
          });

          if (newNotifs.length > 0) {
            lastSeenAt = newNotifs[newNotifs.length - 1].createdAt;

            // Send each notification
            for (const notif of newNotifs) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "notification", notification: notif })}\n\n`
                )
              );
            }

            // Also send updated unread count
            const count = await db.notification.count({
              where: {
                organizationId: orgId,
                isRead: false,
                OR: [{ userId }, { userId: null }],
              },
            });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "unread_count", count })}\n\n`
              )
            );
          }

          // Heartbeat to keep connection alive
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (err) {
          // DB error — don't crash the stream
          console.warn("[SSE] Poll error:", err);
        }
      }, 4000);

      // Close after maxDuration - 10s so client can reconnect cleanly
      setTimeout(() => {
        clearInterval(interval);
        closed = true;
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "reconnect" })}\n\n`
            )
          );
          controller.close();
        } catch {
          // already closed
        }
      }, (maxDuration - 10) * 1000);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
