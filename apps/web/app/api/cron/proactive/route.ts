import { NextRequest, NextResponse } from "next/server";
import { db } from "@isyagent/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Auth: Bearer CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const createdDecisionIds: string[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Get all active organizations
    const organizations = await db.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        isytaskAgencyId: true,
        isysocialAgencyId: true,
      },
    });

    for (const org of organizations) {
      // ── Check IsyTask: overdue tasks ─────────────────────────────────────────
      if (org.isytaskAgencyId) {
        try {
          const overdueTasks: any[] = await db.$queryRaw`
            SELECT COUNT(*) as count
            FROM public."tasks"
            WHERE "agencyId" = ${org.isytaskAgencyId}
              AND "status" != 'FINALIZADA'
              AND "createdAt" < ${sevenDaysAgo}
          `;
          const overdueCount = Number(overdueTasks[0]?.count ?? 0);

          if (overdueCount > 0) {
            // Deduplicate: skip if already a PENDING decision with same skillName
            const existing = await db.decision.findFirst({
              where: {
                organizationId: org.id,
                status: "PENDING",
                skillName: "summarizeClient",
                title: { contains: "Tareas atrasadas" },
              },
            });

            if (!existing) {
              const decision = await db.decision.create({
                data: {
                  organizationId: org.id,
                  title: "Tareas atrasadas detectadas",
                  description: `Se detectaron ${overdueCount} tarea${overdueCount !== 1 ? "s" : ""} con más de 7 días sin finalizar en IsyTask. Considera revisar el estado de estas tareas.`,
                  skillName: "summarizeClient",
                  skillInput: { period: "week", source: "proactive_cron" },
                  status: "PENDING",
                  urgency: 1,
                },
              });
              createdDecisionIds.push(decision.id);
            }
          }
        } catch (err) {
          console.error(`[ProactiveCron] IsyTask check failed for org ${org.id}:`, err);
        }
      }

      // ── Check IsySocial: no posts in last 7 days ─────────────────────────────
      if (org.isysocialAgencyId) {
        try {
          const recentPosts: any[] = await db.$queryRaw`
            SELECT COUNT(*) as count
            FROM isysocial."iso_posts"
            WHERE "agencyId" = ${org.isysocialAgencyId}
              AND "createdAt" >= ${sevenDaysAgo}
          `;
          const recentPostCount = Number(recentPosts[0]?.count ?? 0);

          if (recentPostCount === 0) {
            // Deduplicate
            const existing = await db.decision.findFirst({
              where: {
                organizationId: org.id,
                status: "PENDING",
                skillName: "draftPost",
                title: { contains: "Sin publicaciones" },
              },
            });

            if (!existing) {
              const decision = await db.decision.create({
                data: {
                  organizationId: org.id,
                  title: "Sin publicaciones esta semana",
                  description: "No se han creado publicaciones en IsySocial en los últimos 7 días. ¿Quieres que el agente prepare un borrador?",
                  skillName: "draftPost",
                  skillInput: { source: "proactive_cron" },
                  status: "PENDING",
                  urgency: 1,
                },
              });
              createdDecisionIds.push(decision.id);
            }
          }
        } catch (err) {
          console.error(`[ProactiveCron] IsySocial check failed for org ${org.id}:`, err);
        }
      }
    }

    console.log(`[ProactiveCron] Created ${createdDecisionIds.length} decisions`);
    return NextResponse.json({
      success: true,
      created: createdDecisionIds.length,
      decisionIds: createdDecisionIds,
    });
  } catch (err: any) {
    console.error("[ProactiveCron] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
