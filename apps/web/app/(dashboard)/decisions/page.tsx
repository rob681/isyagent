"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

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
  const utils = trpc.useUtils();

  const { data: decisions, isLoading } = trpc.decisions.list.useQuery({
    limit: 30,
  });

  const { data: stats } = trpc.decisions.stats.useQuery();

  const actMutation = trpc.decisions.act.useMutation({
    onSuccess: () => {
      utils.decisions.list.invalidate();
      utils.decisions.stats.invalidate();
    },
  });

  const handleAction = (id: string, action: "APPROVED" | "REJECTED") => {
    actMutation.mutate({ id, action });
  };

  const pendingCount = stats?.pending ?? 0;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

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
        <div className="flex items-center gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-brand-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </div>
          {(stats?.todayApproved ?? 0) > 0 && (
            <div>
              <p className="text-2xl font-bold text-green-600">{stats!.todayApproved}</p>
              <p className="text-xs text-muted-foreground">Aprobadas hoy</p>
            </div>
          )}
        </div>
      </div>

      {/* Decision Cards */}
      <div className="space-y-4">
        {decisions?.map((decision) => {
          const SkillIcon = SKILL_ICONS[decision.skillName] ?? Zap;
          const isPending = decision.status === "PENDING";
          const isActing = actMutation.isLoading && actMutation.variables?.id === decision.id;

          return (
            <Card
              key={decision.id}
              className={!isPending ? "opacity-60" : ""}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <SkillIcon className="h-5 w-5 text-brand-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm">{decision.title}</h3>
                      <Badge className={URGENCY_COLORS[decision.urgency]}>
                        {URGENCY_LABELS[decision.urgency]}
                      </Badge>
                      {decision.client && (
                        <Badge variant="outline" className="text-xs">
                          {decision.client.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {decision.description}
                    </p>

                    {isPending ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(decision.id, "APPROVED")}
                          disabled={isActing}
                          className="gap-1"
                        >
                          {isActing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(decision.id, "REJECTED")}
                          disabled={isActing}
                          className="gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </Button>
                        <span className="text-xs text-muted-foreground ml-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(decision.createdAt), {
                            addSuffix: false,
                            locale: es,
                          })}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              decision.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {decision.status === "APPROVED" ? "Aprobado" : "Rechazado"}
                          </Badge>
                          {decision.actor && (
                            <span className="text-xs text-muted-foreground">
                              por {decision.actor.name}
                            </span>
                          )}
                        </div>

                        {/* Execution result */}
                        {decision.status === "APPROVED" && decision.executionResult && (
                          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-xs">
                            <p className="font-medium text-green-800 mb-1">Ejecutado correctamente</p>
                            {(decision.executionResult as any).taskId && (
                              <p className="text-green-700">
                                Tarea #{(decision.executionResult as any).taskNumber} creada en IsyTask: {(decision.executionResult as any).title}
                              </p>
                            )}
                            {(decision.executionResult as any).postId && (
                              <p className="text-green-700">
                                Post borrador creado en IsySocial ({(decision.executionResult as any).network})
                              </p>
                            )}
                          </div>
                        )}
                        {decision.executionError && (
                          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs">
                            <p className="font-medium text-red-800 mb-1">Error de ejecución</p>
                            <p className="text-red-700">{decision.executionError as string}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!decisions || decisions.length === 0) && (
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
