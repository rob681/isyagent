import { NextRequest, NextResponse } from "next/server";
import { db } from "@isyagent/db";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
});

const MODEL = "claude-haiku-4-5-20251001"; // Cheapest — just summarization

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const results: Array<{ orgId: string; success: boolean; error?: string }> = [];

  try {
    const organizations = await db.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        llmCurrentMonthCents: true,
        llmMonthlyBudgetCents: true,
      },
    });

    for (const org of organizations) {
      try {
        // ── Gather weekly stats ──────────────────────────────────────────────
        const [decisionsTotal, decisionsApproved, decisionsRejected, llmUsage, conversations] =
          await Promise.all([
            db.decision.count({
              where: { organizationId: org.id, createdAt: { gte: weekStart } },
            }),
            db.decision.count({
              where: {
                organizationId: org.id,
                status: "APPROVED",
                createdAt: { gte: weekStart },
              },
            }),
            db.decision.count({
              where: {
                organizationId: org.id,
                status: "REJECTED",
                createdAt: { gte: weekStart },
              },
            }),
            db.lLMUsage.aggregate({
              where: { organizationId: org.id, createdAt: { gte: weekStart } },
              _sum: { totalTokens: true, costCents: true },
            }),
            db.conversation.count({
              where: { organizationId: org.id, createdAt: { gte: weekStart } },
            }),
          ]);

        const pendingDecisions = await db.decision.count({
          where: { organizationId: org.id, status: "PENDING" },
        });

        const topSkills = await db.decision.groupBy({
          by: ["skillName"],
          where: { organizationId: org.id, createdAt: { gte: weekStart } },
          _count: { skillName: true },
          orderBy: { _count: { skillName: "desc" } },
          take: 3,
        });

        const totalTokens = llmUsage._sum.totalTokens ?? 0;
        const costCents = llmUsage._sum.costCents ?? 0;
        const budgetPct = org.llmMonthlyBudgetCents > 0
          ? Math.round((org.llmCurrentMonthCents / org.llmMonthlyBudgetCents) * 100)
          : 0;

        const skillsSummary = topSkills.map((s) => `${s.skillName} (${s._count.skillName}x)`).join(", ") || "ninguna";

        // ── Generate Haiku summary ───────────────────────────────────────────
        const prompt = `Genera un resumen ejecutivo semanal para la agencia "${org.name}". Sé conciso (máximo 4 puntos breves).

Datos de la semana:
- Conversaciones con el agente: ${conversations}
- Decisiones generadas: ${decisionsTotal} (${decisionsApproved} aprobadas, ${decisionsRejected} rechazadas, ${pendingDecisions} pendientes)
- Skills más usados: ${skillsSummary}
- Tokens consumidos: ${totalTokens.toLocaleString()} (~$${(costCents / 100).toFixed(2)} USD)
- Presupuesto mensual usado: ${budgetPct}%

Formato: 4 puntos con emoji al inicio. Termina con una recomendación accionable breve.`;

        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        });

        const summaryText = response.content[0]?.type === "text" ? response.content[0].text : "";

        const reportContent = `SEMANA: ${weekStart.toLocaleDateString("es-ES")} – ${now.toLocaleDateString("es-ES")}

📊 MÉTRICAS
- Conversaciones: ${conversations}
- Decisiones: ${decisionsTotal} (${decisionsApproved} aprobadas · ${decisionsRejected} rechazadas · ${pendingDecisions} pendientes)
- Skills usados: ${skillsSummary}
- Costo IA esta semana: $${(costCents / 100).toFixed(2)} USD (${budgetPct}% presupuesto mensual)

🤖 RESUMEN
${summaryText}`;

        // ── Store as MemoryChunk ──────────────────────────────────────────────
        await db.memoryChunk.create({
          data: {
            organizationId: org.id,
            level: "OPERATIONAL",
            category: "weekly_report",
            content: reportContent,
            isEditable: false,
          },
        });

        // Log Haiku usage
        await db.lLMUsage.create({
          data: {
            organizationId: org.id,
            tier: "HAIKU",
            model: MODEL,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            costCents: Math.ceil(
              (response.usage.input_tokens * 0.08 + response.usage.output_tokens * 0.4) / 1000
            ),
            purpose: "weekly_report",
          },
        }).catch(() => {});

        // Create notification
        await db.notification.create({
          data: {
            organizationId: org.id,
            title: "Reporte semanal disponible",
            body: `Tu reporte de la semana del ${weekStart.toLocaleDateString("es-ES")} está listo. ${decisionsTotal} decisiones generadas.`,
            type: "WEEKLY_REPORT",
          },
        }).catch(() => {});

        results.push({ orgId: org.id, success: true });
      } catch (err: any) {
        console.error(`[WeeklyReport] Failed for org ${org.id}:`, err);
        results.push({ orgId: org.id, success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("[WeeklyReport] Fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
