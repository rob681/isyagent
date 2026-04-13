"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Loader2,
  Coins,
  Hash,
  Clock,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const TIER_COLORS: Record<string, string> = {
  OPUS: "bg-purple-100 text-purple-700",
  SONNET: "bg-blue-100 text-blue-700",
  HAIKU: "bg-emerald-100 text-emerald-700",
};

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function UsagePage() {
  const { data: summary, isLoading: summaryLoading } =
    trpc.usage.summary.useQuery();
  const { data: recent, isLoading: recentLoading } =
    trpc.usage.recent.useQuery();

  const isLoading = summaryLoading || recentLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!summary) return null;

  const budgetPercent =
    summary.budgetCents > 0
      ? Math.min(
          100,
          Math.round((summary.currentMonthCents / summary.budgetCents) * 100)
        )
      : 0;

  const avgCostPerCall =
    summary.totalCallsThisMonth > 0
      ? summary.totalCostCentsThisMonth / summary.totalCallsThisMonth
      : 0;

  // Last 14 days for the chart
  const last14 = summary.dailyUsage.slice(-14);
  const maxTokens = Math.max(...last14.map((d) => d.tokens), 1);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-brand-600" />
          Uso de LLM
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitorea el consumo de tokens y costos de tu agente.
        </p>
      </div>

      {/* Budget bar */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Presupuesto mensual</span>
            <span className="text-sm text-muted-foreground">
              {formatCost(summary.currentMonthCents)} /{" "}
              {formatCost(summary.budgetCents)} ({budgetPercent}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPercent >= 90
                  ? "bg-red-500"
                  : budgetPercent >= 70
                  ? "bg-amber-500"
                  : "bg-brand-500"
              }`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Tokens este mes
              </span>
            </div>
            <p className="text-xl font-bold">
              {formatTokens(summary.totalTokensThisMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Costo total</span>
            </div>
            <p className="text-xl font-bold">
              {formatCost(summary.totalCostCentsThisMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Llamadas hoy
              </span>
            </div>
            <p className="text-xl font-bold">{summary.callsToday}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Costo promedio
              </span>
            </div>
            <p className="text-xl font-bold">{formatCost(avgCostPerCall)}</p>
          </CardContent>
        </Card>
      </div>

      {/* By tier */}
      {summary.byTier.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-3">Uso por tier</h2>
            <div className="space-y-2">
              {summary.byTier.map((t) => (
                <div
                  key={t.tier}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={TIER_COLORS[t.tier] ?? "bg-gray-100 text-gray-700"}>
                      {t.tier}
                    </Badge>
                    <span className="text-muted-foreground">
                      {t.count} llamadas
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {formatTokens(t.totalTokens)} tokens
                    </span>
                    <span className="font-medium">
                      {formatCost(t.costCents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily usage chart — last 14 days */}
      {last14.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-4">
              Tokens diarios (ultimos 14 dias)
            </h2>
            <div className="flex items-end gap-1.5 h-40">
              {last14.map((day) => {
                const heightPct = Math.max(
                  2,
                  Math.round((day.tokens / maxTokens) * 100)
                );
                const dateLabel = day.date.slice(5); // MM-DD
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div className="w-full flex flex-col items-center justify-end h-32">
                      <div
                        className="w-full max-w-[32px] rounded-t bg-brand-500 transition-all hover:bg-brand-600"
                        style={{ height: `${heightPct}%` }}
                        title={`${day.date}: ${formatTokens(day.tokens)} tokens, ${formatCost(day.costCents)}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {dateLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity table */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold mb-3">Actividad reciente</h2>
          {recent && recent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Tier</th>
                    <th className="pb-2 pr-4 font-medium">Modelo</th>
                    <th className="pb-2 pr-4 font-medium text-right">
                      Tokens
                    </th>
                    <th className="pb-2 pr-4 font-medium text-right">Costo</th>
                    <th className="pb-2 pr-4 font-medium">Proposito</th>
                    <th className="pb-2 font-medium text-right">Cuando</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <Badge
                          className={
                            TIER_COLORS[entry.tier] ??
                            "bg-gray-100 text-gray-700"
                          }
                        >
                          {entry.tier}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                        {entry.model}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {formatTokens(entry.totalTokens)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums font-medium">
                        {formatCost(entry.costCents)}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {entry.purpose ?? "-"}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(entry.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay actividad registrada aun.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
