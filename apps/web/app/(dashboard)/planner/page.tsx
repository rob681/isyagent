"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Brain,
  Play,
  CheckCircle2,
  Loader2,
  Inbox,
  ChevronRight,
  Zap,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface PlanStep {
  index: number;
  total: number;
  title: string;
  skill: string | null;
  text: string;
  done: boolean;
  decision?: { id: string; title: string; skillName: string };
}

type PlanState = "idle" | "planning" | "executing" | "done" | "error";

export default function PlannerPage() {
  const [task, setTask] = useState("");
  const [state, setState] = useState<PlanState>("idle");
  const [analysis, setAnalysis] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [decisions, setDecisions] = useState<Array<{ id: string; title: string; skillName: string }>>([]);
  const abortRef = useRef<AbortController | null>(null);

  const handleRun = useCallback(async () => {
    if (!task.trim() || state === "executing" || state === "planning") return;

    setState("planning");
    setSteps([]);
    setAnalysis("");
    setEstimatedTime("");
    setDecisions([]);
    setCurrentStep(0);
    setError("");

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "status") {
              // just display in header
            }

            if (event.type === "plan_ready") {
              setAnalysis(event.analysis);
              setEstimatedTime(event.estimatedTime);
              setState("executing");
            }

            if (event.type === "plan_step") {
              setCurrentStep(event.index);
              setSteps((prev) => [
                ...prev,
                { index: event.index, total: event.total, title: event.title, skill: event.skill, text: "", done: false },
              ]);
            }

            if (event.type === "step_text") {
              setSteps((prev) =>
                prev.map((s) => (s.index === event.index ? { ...s, text: s.text + event.text } : s))
              );
            }

            if (event.type === "step_done") {
              setSteps((prev) =>
                prev.map((s) => (s.index === event.index ? { ...s, done: true } : s))
              );
            }

            if (event.type === "decision_created") {
              setDecisions((prev) => [...prev, event.decision]);
              setSteps((prev) =>
                prev.map((s) =>
                  s.index === currentStep ? { ...s, decision: event.decision } : s
                )
              );
            }

            if (event.type === "done") {
              setState("done");
            }

            if (event.type === "error") {
              setError(event.message);
              setState("error");
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message);
        setState("error");
      }
    }
  }, [task, state, currentStep]);

  const isRunning = state === "planning" || state === "executing";

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-brand-600" />
          Planificador Inteligente
        </h1>
        <p className="text-muted-foreground mt-1">
          Describe una tarea compleja. Opus la descompone en pasos y Sonnet los ejecuta uno a uno.
        </p>
      </div>

      {/* Model badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1 text-purple-700 border-purple-200 bg-purple-50">
          <Brain className="h-3 w-3" />
          Opus — Planificador
        </Badge>
        <Badge variant="outline" className="gap-1 text-brand-700 border-brand-200 bg-brand-50">
          <Zap className="h-3 w-3" />
          Sonnet — Ejecutor
        </Badge>
        {estimatedTime && (
          <Badge variant="outline" className="gap-1 text-gray-600">
            <Clock className="h-3 w-3" />
            {estimatedTime}
          </Badge>
        )}
      </div>

      {/* Task input */}
      <div className="space-y-3">
        <Textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Ej: Analiza el rendimiento de todos nuestros clientes este mes, identifica los que tienen más tareas atrasadas, y crea un resumen con acciones recomendadas para cada uno."
          rows={4}
          disabled={isRunning}
          className="resize-none"
        />
        <Button
          onClick={handleRun}
          disabled={!task.trim() || isRunning}
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {state === "planning" ? "Planificando con Opus..." : "Ejecutando pasos..."}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Ejecutar plan complejo
            </>
          )}
        </Button>
      </div>

      {/* Analysis */}
      {analysis && (
        <div className="rounded-xl border bg-purple-50 border-purple-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-800">Análisis de Opus</span>
          </div>
          <p className="text-sm text-purple-700">{analysis}</p>
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Pasos del plan
          </h2>
          {steps.map((step) => (
            <div
              key={step.index}
              className={`rounded-xl border p-4 space-y-2 transition-all ${
                step.done
                  ? "border-green-200 bg-green-50"
                  : step.index === currentStep && !step.done
                  ? "border-brand-300 bg-brand-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.done
                      ? "bg-green-100 text-green-700"
                      : step.index === currentStep
                      ? "bg-brand-100 text-brand-700"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.index}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
                {step.skill && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {step.skill}
                  </Badge>
                )}
                {step.index === currentStep && !step.done && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600 ml-auto" />
                )}
              </div>

              {step.text && (
                <p className="text-xs text-muted-foreground pl-8 whitespace-pre-wrap leading-relaxed">
                  {step.text}
                </p>
              )}

              {step.decision && (
                <div className="pl-8">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                    <Inbox className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs text-amber-800">{step.decision.title}</span>
                    <Link href="/decisions" className="text-xs text-amber-700 underline font-medium">
                      Revisar
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Done summary */}
      {state === "done" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Plan ejecutado completamente</p>
            <p className="text-xs text-green-700 mt-1">
              {steps.length} pasos completados.
              {decisions.length > 0 &&
                ` ${decisions.length} decisión(es) creadas pendientes de aprobación.`}
            </p>
            {decisions.length > 0 && (
              <Link href="/decisions">
                <Button size="sm" variant="outline" className="mt-2 gap-1 text-xs border-green-300 text-green-700">
                  <Inbox className="h-3.5 w-3.5" />
                  Ver decisiones pendientes
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">⚠️ Error: {error}</p>
        </div>
      )}

      {/* Examples */}
      {state === "idle" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Ejemplos de tareas complejas:</p>
          {[
            "Analiza todos los clientes con tareas atrasadas y propón acciones de seguimiento",
            "Crea una estrategia de contenido para Instagram para el próximo mes y genera los primeros 3 posts",
            "Resume el estado de todos los proyectos activos e identifica los cuellos de botella",
          ].map((example) => (
            <button
              key={example}
              onClick={() => setTask(example)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full text-left rounded-lg px-3 py-2 hover:bg-muted transition-colors border border-transparent hover:border-border"
            >
              <Sparkles className="h-3 w-3 shrink-0 text-brand-500" />
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
