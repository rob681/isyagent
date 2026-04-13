import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isyagent/db";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 180; // Opus needs more time

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
});

const PLANNER_MODEL = "claude-opus-4-20250514";
const EXECUTOR_MODEL = "claude-sonnet-4-20250514";

/**
 * POST /api/agent/plan
 * Body: { task: string }
 *
 * Two-stage pipeline:
 * 1. Opus (Planner) — decomposes the task into concrete steps
 * 2. Sonnet (Executor) — executes each step using available skills
 *
 * Streams SSE events:
 * - { type: "plan_step", index, total, title }
 * - { type: "step_result", index, content }
 * - { type: "decision_created", decision }
 * - { type: "summary", content }
 * - { type: "done" }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { task } = await req.json();
  if (!task?.trim()) return new Response("task is required", { status: 400 });

  const orgId = session.user.organizationId;
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        // ── Load org context ──────────────────────────────────────────────
        const [memories, skills] = await Promise.all([
          db.memoryChunk.findMany({
            where: { organizationId: orgId, level: "IDENTITY" },
            select: { content: true, category: true },
            take: 20,
          }),
          db.skillConfig.findMany({
            where: { organizationId: orgId, isEnabled: true },
            select: { skillName: true },
          }),
        ]);

        const memoryContext = memories
          .map((m) => `[${m.category ?? "info"}] ${m.content}`)
          .join("\n");
        const skillList = skills.map((s) => s.skillName).join(", ");

        // ── Stage 1: Opus as Planner ──────────────────────────────────────
        send({ type: "status", message: "🧠 Analizando tarea con Opus..." });

        const plannerPrompt = `Eres un planificador estratégico para una agencia digital. Debes descomponer la siguiente tarea en pasos concretos y ejecutables.

## Contexto del negocio
${memoryContext || "No hay memorias cargadas."}

## Habilidades disponibles
${skillList || "Ninguna"}

## Tarea a planificar
${task}

## Instrucciones
1. Analiza la tarea en profundidad
2. Descompónla en máximo 5 pasos concretos y ordenados
3. Para cada paso indica: qué hacer, qué skill usar (si aplica), y qué resultado se espera
4. Sé específico y orientado a la acción

Responde ÚNICAMENTE con JSON válido (sin markdown):
{
  "analysis": "breve análisis de la tarea en 1-2 frases",
  "steps": [
    {
      "title": "Título conciso del paso",
      "description": "Qué hay que hacer exactamente",
      "skill": "skillName o null si es solo análisis",
      "expectedResult": "Qué se logra con este paso"
    }
  ],
  "estimatedTime": "estimación de tiempo total"
}`;

        const planResponse = await anthropic.messages.create({
          model: PLANNER_MODEL,
          max_tokens: 2048,
          messages: [{ role: "user", content: plannerPrompt }],
        });

        const planText = planResponse.content[0]?.type === "text" ? planResponse.content[0].text : "{}";

        let plan: { analysis: string; steps: Array<{ title: string; description: string; skill: string | null; expectedResult: string }>; estimatedTime: string };

        try {
          plan = JSON.parse(planText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        } catch {
          plan = {
            analysis: "No se pudo parsear el plan.",
            steps: [{ title: "Ejecutar tarea", description: task, skill: null, expectedResult: "Resultado de la tarea" }],
            estimatedTime: "Desconocido",
          };
        }

        // Log Opus usage
        await db.lLMUsage.create({
          data: {
            organizationId: orgId,
            tier: "OPUS",
            model: PLANNER_MODEL,
            inputTokens: planResponse.usage.input_tokens,
            outputTokens: planResponse.usage.output_tokens,
            totalTokens: planResponse.usage.input_tokens + planResponse.usage.output_tokens,
            costCents: Math.ceil(
              (planResponse.usage.input_tokens * 15 + planResponse.usage.output_tokens * 75) / 1000000
            ),
            purpose: "planner",
          },
        }).catch(() => {});

        send({
          type: "plan_ready",
          analysis: plan.analysis,
          totalSteps: plan.steps.length,
          estimatedTime: plan.estimatedTime,
        });

        // ── Stage 2: Sonnet as Executor (step by step) ───────────────────
        const stepResults: string[] = [];

        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i];

          send({
            type: "plan_step",
            index: i + 1,
            total: plan.steps.length,
            title: step.title,
            skill: step.skill,
          });

          const executorPrompt = `Eres el ejecutor de un plan de agencia digital. Tu rol es ejecutar un paso específico y dar un resultado concreto.

## Contexto del negocio
${memoryContext || "No hay memorias."}

## Pasos anteriores completados
${stepResults.length > 0 ? stepResults.map((r, idx) => `Paso ${idx + 1}: ${r}`).join("\n") : "Este es el primer paso."}

## Paso a ejecutar (${i + 1}/${plan.steps.length})
**${step.title}**
${step.description}
Resultado esperado: ${step.expectedResult}
${step.skill ? `Skill a usar: ${step.skill}` : ""}

Ejecuta este paso y proporciona:
1. Un análisis breve de lo que encontraste/hiciste
2. El resultado concreto obtenido
3. Si se necesita crear una tarea o post, proporciona los datos exactos

Responde de forma concisa y directa.`;

          let stepContent = "";

          const stepStream = anthropic.messages.stream({
            model: EXECUTOR_MODEL,
            max_tokens: 1024,
            messages: [{ role: "user", content: executorPrompt }],
          });

          stepStream.on("text", (text: string) => {
            stepContent += text;
            send({ type: "step_text", index: i + 1, text });
          });

          const stepFinal = await stepStream.finalMessage();
          stepResults.push(stepContent.slice(0, 200));

          // Log Sonnet usage
          await db.lLMUsage.create({
            data: {
              organizationId: orgId,
              tier: "SONNET",
              model: EXECUTOR_MODEL,
              inputTokens: stepFinal.usage.input_tokens,
              outputTokens: stepFinal.usage.output_tokens,
              totalTokens: stepFinal.usage.input_tokens + stepFinal.usage.output_tokens,
              costCents: Math.ceil(
                (stepFinal.usage.input_tokens * 0.3 + stepFinal.usage.output_tokens * 1.5) / 100000
              ),
              purpose: "executor",
            },
          }).catch(() => {});

          // Create decision if step has a skill
          if (step.skill && ["createTask", "draftPost", "generateContent"].includes(step.skill)) {
            const decision = await db.decision.create({
              data: {
                organizationId: orgId,
                title: step.title,
                description: `Plan multi-paso: ${plan.analysis}\n\nPaso ${i + 1}: ${step.description}`,
                skillName: step.skill,
                skillInput: { titulo: step.title, descripcion: step.description, source: "planner" } as any,
                urgency: 0,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });

            send({
              type: "decision_created",
              decision: { id: decision.id, title: decision.title, skillName: step.skill, urgency: 0 },
            });
          }

          send({ type: "step_done", index: i + 1 });
        }

        // ── Final summary ─────────────────────────────────────────────────
        send({
          type: "summary",
          analysis: plan.analysis,
          stepsCompleted: plan.steps.length,
          estimatedTime: plan.estimatedTime,
        });

        send({ type: "done" });
        controller.close();
      } catch (error: any) {
        console.error("[Plan] Error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: error?.message ?? "Error en el planificador" })}\n\n`
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
    },
  });
}
