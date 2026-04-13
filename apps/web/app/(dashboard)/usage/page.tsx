"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Loader2,
  Coins,
  Hash,
  Clock,
  TrendingUp,
  Zap,
  MessageSquare,
  Brain,
  ChevronDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const TIER_COLORS: Record<string, string> = {
  OPUS:   "bg-purple-100 text-purple-700",
  SONNET: "bg-blue-100   text-blue-700",
  HAIKU:  "bg-emerald-100 text-emerald-700",
};

const PURPOSE_ICONS: Record<string, typeof Zap> = {
  chat:      MessageSquare,
  skill:     Zap,
  embedding: Brain,
  planner:   BarChart3,
};

const PURPOSE_COLORS: Record<string, string> = {
  chat:      "bg-blue-500",
  skill:     "bg-brand-500",
  embedding: "bg-purple-500",
  planner:   "bg-amber-500",
};

function formatCost(cents: number): string {
  if (cents === 0) return "$0.00";
  return `$${(cents / 100).toFixed(3)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function UsagePage() {
  const [chartView, setChartView] = useState<"tokens" | "cost">("tokens");
  const [showAllRecent, setShowAllRecent] = useState(false);

  const { data: summary, isLoading: summaryLoading } = trpc.usage.summary.useQuery();
  const { data: byPurpose } = trpc.usage.byPurpose.useQuery();
  const { data: recent, isLoading: recentLoading } = trpc.usage.recent.useQuery();

  const isLoading = summaryLoading || recentLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!summary) return null;

  const budgetPercent = summary.budgetCents > 0
    ? Math.min(100, Math.round((summary.currentMonthCents / summary.budgetCents) * 100))
    : 0;

  const avgCostPerCall = summary.totalCallsThisMonth > 0
    ? summary.totalCostCentsThisMonth / summary.totalCallsThisMonth
    : 0;

  // Last 14 days
  const last14 = summary.dailyUsage.slice(-14);
  const maxTokens  = Math.max(...last14.map((d) => d.tokens), 1);
  const maxCost    = Math.max(...last14.map((d) => d.costCents), 1);

  const totalPurposeCost = byPurpose?.reduce((s, p) => s + p.costCents, 0) ?? 1;

  const recentItems = showAllRecent ? (recent ?? []) : (recent ?? []).slice(0, 10);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-brand-600" />
          Uso de LLM
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Monitorea tokens, costos y actividad de tu agente.
        </p>
      </div>

      {/* Budget bar */}
      <Card className={budgetPercent >= 90 ? "border-red-200 bg-red-50/30" : ""}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Presupuesto mensual</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${budgetPercent >= 90 ? "text-red-600" : budgetPercent >= 70 ? "text-amber-600" : "text-gray-800"}`}>
                {formatCost(summary.currentMonthCents)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {formatCost(summary.budgetCents)}
              </span>
              <Badge className={`text-xs ${
                budgetPercent >= 90 ? "bg-red-100 text-red-700" :
                budgetPercent >= 70 ? "bg-amber-100 text-amber-700" :
                "bg-green-100 text-green-700"
              }`}>
                {budgetPercent}%
              </Badge>
            </div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPercent >= 90 ? "bg-red-500" :
                budgetPercent >= 70 ? "bg-amber-500" :
                "bg-brand-500"
              }`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          {budgetPercent >= 80 && (
            <p className="text-xs text-amber-700 mt-2">
              ⚠️ Estás usando más del {budgetPercent}% de tu presupuesto. Considera aumentarlo en configuración.
            </p>
          )}
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Hash className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-xs text-muted-foreground">Tokens este mes</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {formatTokens(summary.totalTokensThisMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-green-50 flex items-center justify-center">
                <Coins className="h-3.5 w-3.5 text-green-600" />
              </div>
              <span className="text-xs text-muted-foreground">Costo total</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {formatCost(summary.totalCostCentsThisMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <span className="text-xs text-muted-foreground">Llamadas hoy</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{summary.callsToday}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <span className="text-xs text-muted-foreground">Costo promedio</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCost(avgCostPerCall)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Daily chart — 2/3 width */}
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">
                {chartView === "tokens" ? "Tokens diarios" : "Costo diario"} (últimos 14 días)
              </h2>
              <div className="flex rounded-lg border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setChartView("tokens")}
                  className={`px-3 py-1 transition-colors ${
                    chartView === "tokens" ? "bg-brand-600 text-white" : "bg-white text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Tokens
                </button>
                <button
                  type="button"
                  onClick={() => setChartView("cost")}
                  className={`px-3 py-1 transition-colors ${
                    chartView === "cost" ? "bg-brand-600 text-white" : "bg-white text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Costo
                </button>
              </div>
            </div>

            {last14.length > 0 ? (
              <div className="flex items-end gap-1.5 h-44">
                {last14.map((day) => {
                  const value = chartView === "tokens" ? day.tokens : day.costCents;
                  const maxVal = chartView === "tokens" ? maxTokens : maxCost;
                  const heightPct = Math.max(2, Math.round((value / maxVal) * 100));
                  const label = day.date.slice(5); // MM-DD
                  const tooltip =
                    chartView === "tokens"
                      ? `${day.date}: ${formatTokens(day.tokens)} tokens`
                      : `${day.date}: ${formatCost(day.costCents)}`;

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full flex flex-col items-center justify-end h-36 relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap rounded-md bg-gray-800 text-white text-[10px] px-2 py-1 pointer-events-none">
                          {tooltip}
                        </div>
                        <div
                          className="w-full max-w-[28px] rounded-t transition-all hover:opacity-80 cursor-default"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: chartView === "tokens" ? "rgb(99, 102, 241)" : "rgb(16, 185, 129)",
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
                Sin datos aún
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purpose breakdown — 1/3 width */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-4">Uso por propósito</h2>
            {byPurpose && byPurpose.length > 0 ? (
              <div className="space-y-3">
                {byPurpose.map((p) => {
                  const pct = Math.round((p.costCents / totalPurposeCost) * 100);
                  const Icon = PURPOSE_ICONS[p.purpose] ?? Zap;
                  const barColor = PURPOSE_COLORS[p.purpose] ?? "bg-gray-400";
                  return (
                    <div key={p.purpose}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs capitalize">{p.purpose}</span>
                        </div>
                        <span className="text-xs font-medium tabular-nums">
                          {formatCost(p.costCents)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {p.count} llamadas · {formatTokens(p.tokens)} tokens
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground text-center">
                Sin actividad este mes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By tier */}
      {summary.byTier.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-3">Desglose por tier</h2>
            <div className="space-y-0">
              {summary.byTier.map((t) => {
                const pct = summary.totalTokensThisMonth > 0
                  ? Math.round((t.totalTokens / summary.totalTokensThisMonth) * 100)
                  : 0;
                return (
                  <div key={t.tier} className="flex items-center gap-4 py-2.5 border-b last:border-0">
                    <Badge className={`w-16 justify-center ${TIER_COLORS[t.tier] ?? "bg-gray-100 text-gray-700"}`}>
                      {t.tier}
                    </Badge>
                    <div className="flex-1">
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                      {formatTokens(t.totalTokens)}
                    </span>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {t.count}×
                    </span>
                    <span className="text-sm font-semibold w-16 text-right tabular-nums">
                      {formatCost(t.costCents)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold mb-3">Actividad reciente</h2>
          {recent && recent.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Tier</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Modelo</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Tokens</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground text-right">Costo</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Propósito</th>
                      <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Cuándo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentItems.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-4">
                          <Badge className={`text-xs ${TIER_COLORS[entry.tier] ?? "bg-gray-100 text-gray-700"}`}>
                            {entry.tier}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground font-mono">
                          {entry.model.split("-").slice(-2).join("-")}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-xs">
                          {formatTokens(entry.totalTokens)}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums font-medium text-xs">
                          {formatCost(entry.costCents)}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground capitalize">
                          {entry.purpose ?? "chat"}
                        </td>
                        <td className="py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: es })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(recent?.length ?? 0) > 10 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecent((v) => !v)}
                  className="mt-3 flex items-center gap-1 text-xs text-brand-600 hover:underline mx-auto"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllRecent ? "rotate-180" : ""}`} />
                  {showAllRecent ? "Ver menos" : `Ver ${(recent?.length ?? 0) - 10} más`}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay actividad registrada aún.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
