"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// ── Mock data — will be replaced with tRPC calls once DB is connected ────────
const MOCK_DECISIONS = [
  {
    id: "1",
    title: "Crear tarea: Diseño de logo para Café Buena Vista",
    description: "El agente detectó un mensaje del cliente pidiendo un rediseño de logo. Se propone crear una tarea en IsyTask con prioridad normal.",
    skillName: "createTask",
    urgency: 1,
    status: "PENDING",
    clientName: "Café Buena Vista",
    createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
  },
  {
    id: "2",
    title: "Borrador: Post de Instagram para Gimnasio Poder",
    description: "Basado en el calendario de contenido, toca publicar un post motivacional. El agente generó un copy y seleccionó una imagen del brand kit.",
    skillName: "draftPost",
    urgency: 0,
    status: "PENDING",
    clientName: "Gimnasio Poder",
    createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
  },
  {
    id: "3",
    title: "Responder DM: @mariag pregunta por precios",
    description: "Un seguidor preguntó por los precios del servicio premium. El agente preparó una respuesta basada en la memoria de servicios.",
    skillName: "replyDM",
    urgency: 2,
    status: "PENDING",
    clientName: "Studio Bella",
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
  },
];

const URGENCY_COLORS: Record<number, string> = {
  0: "bg-gray-100 text-gray-600",
  1: "bg-blue-100 text-blue-700",
  2: "bg-amber-100 text-amber-700",
};
const URGENCY_LABELS: Record<number, string> = {
  0: "Normal",
  1: "Importante",
  2: "Urgente",
};

const SKILL_ICONS: Record<string, typeof Zap> = {
  createTask: CheckCircle2,
  draftPost: Sparkles,
  replyDM: ArrowRight,
};

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState(MOCK_DECISIONS);

  const pendingCount = decisions.filter((d) => d.status === "PENDING").length;

  const handleAction = (id: string, action: "APPROVED" | "REJECTED") => {
    setDecisions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: action } : d))
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-brand-600" />
            Bandeja de Decisiones
          </h1>
          <p className="text-muted-foreground mt-1">
            Tu agente preparó {pendingCount} acciones para que las revises
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </div>
        </div>
      </div>

      {/* Decision Cards */}
      <div className="space-y-4">
        {decisions.map((decision) => {
          const SkillIcon = SKILL_ICONS[decision.skillName] ?? Zap;
          const isPending = decision.status === "PENDING";

          return (
            <Card
              key={decision.id}
              className={!isPending ? "opacity-60" : ""}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <SkillIcon className="h-5 w-5 text-brand-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm">{decision.title}</h3>
                      <Badge
                        className={URGENCY_COLORS[decision.urgency]}
                      >
                        {URGENCY_LABELS[decision.urgency]}
                      </Badge>
                      {decision.clientName && (
                        <Badge variant="outline" className="text-xs">
                          {decision.clientName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {decision.description}
                    </p>

                    {/* Actions */}
                    {isPending ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(decision.id, "APPROVED")}
                          className="gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(decision.id, "REJECTED")}
                          className="gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </Button>
                        <span className="text-xs text-muted-foreground ml-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(
                            (Date.now() - decision.createdAt.getTime()) / 60000
                          )}
                          m
                        </span>
                      </div>
                    ) : (
                      <Badge
                        variant={
                          decision.status === "APPROVED" ? "success" : "destructive"
                        }
                      >
                        {decision.status === "APPROVED"
                          ? "Aprobado"
                          : "Rechazado"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {decisions.length === 0 && (
        <Card className="p-12 text-center">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">
            No hay decisiones pendientes
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Tu agente te notificará cuando necesite tu aprobación
          </p>
        </Card>
      )}
    </div>
  );
}
