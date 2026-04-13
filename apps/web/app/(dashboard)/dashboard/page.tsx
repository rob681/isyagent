"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard,
  MessageSquare,
  Brain,
  Zap,
  Users,
  TrendingUp,
  Clock,
  Inbox,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = trpc.dashboard.stats.useQuery();
  const { data: activity, isLoading: loadingActivity } = trpc.dashboard.activity.useQuery();

  const kpis = stats
    ? [
        {
          label: "Decisiones pendientes",
          value: stats.pendingDecisions,
          icon: Inbox,
          color: "text-amber-600",
          bg: "bg-amber-50",
          href: "/decisions",
          highlight: stats.pendingDecisions > 0,
        },
        {
          label: "Conversaciones activas",
          value: stats.activeConversations,
          icon: MessageSquare,
          color: "text-blue-600",
          bg: "bg-blue-50",
          href: "/chat",
          highlight: false,
        },
        {
          label: "Fragmentos de memoria",
          value: stats.memoryChunks,
          icon: Brain,
          color: "text-purple-600",
          bg: "bg-purple-50",
          href: "/memory",
          highlight: false,
        },
        {
          label: "Clientes registrados",
          value: stats.totalClients,
          icon: Users,
          color: "text-green-600",
          bg: "bg-green-50",
          href: "/clients",
          highlight: false,
        },
      ]
    : [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-brand-600" />
          Panel de control
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumen de actividad de tu agente
        </p>
      </div>

      {/* KPI Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="h-16 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href}>
              <Card
                className={`cursor-pointer hover:border-brand-300 transition-colors ${
                  kpi.highlight ? "border-amber-300 bg-amber-50/30" : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.bg}`}
                    >
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    {kpi.highlight && (
                      <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Budget + Activity Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Budget card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                <TrendingUp className="h-4 w-4 text-brand-600" />
              </div>
              <span className="text-sm font-semibold">Uso LLM (mes)</span>
            </div>
            {loadingStats ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-bold">
                    {stats?.budgetUsedPercent ?? 0}%
                  </span>
                  <span className="text-xs text-muted-foreground">del presupuesto</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (stats?.budgetUsedPercent ?? 0) > 80
                        ? "bg-red-500"
                        : (stats?.budgetUsedPercent ?? 0) > 50
                        ? "bg-amber-500"
                        : "bg-brand-500"
                    }`}
                    style={{ width: `${Math.min(stats?.budgetUsedPercent ?? 0, 100)}%` }}
                  />
                </div>
                <Link
                  href="/usage"
                  className="mt-3 flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  Ver detalle
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                <Clock className="h-4 w-4 text-brand-600" />
              </div>
              <span className="text-sm font-semibold">Actividad reciente</span>
              <Badge variant="outline" className="ml-auto text-xs">
                Memoria operativa
              </Badge>
            </div>

            {loadingActivity ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 mt-0.5">
                      <Zap className="h-3 w-3 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.category && (
                        <span className="text-[10px] font-medium text-brand-600 uppercase tracking-wider">
                          {item.category}
                        </span>
                      )}
                      <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Brain className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
                <p className="text-xs text-muted-foreground mt-1">
                  La actividad operativa aparecerá aquí
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/chat">
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Nuevo chat
          </Button>
        </Link>
        <Link href="/decisions">
          <Button variant="outline" size="sm" className="gap-2">
            <Inbox className="h-4 w-4" />
            Ver decisiones
            {(stats?.pendingDecisions ?? 0) > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white text-[10px] px-1.5">
                {stats!.pendingDecisions}
              </Badge>
            )}
          </Button>
        </Link>
        <Link href="/memory">
          <Button variant="outline" size="sm" className="gap-2">
            <Brain className="h-4 w-4" />
            Gestionar memoria
          </Button>
        </Link>
        <Link href="/clients">
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            Ver clientes
          </Button>
        </Link>
      </div>
    </div>
  );
}
