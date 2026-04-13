"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { FileText, Calendar, RefreshCw, ChevronDown, ChevronUp, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showWidget, setShowWidget] = useState(false);

  const reportsQuery = trpc.reports.list.useQuery(
    { limit: 20 },
    { refetchOnWindowFocus: false }
  );

  const orgQuery = trpc.reports.orgInfo.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const reports = reportsQuery.data?.reports ?? [];
  const orgSlug = orgQuery.data?.slug ?? "";
  const widgetBaseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://isyagent-web.vercel.app";

  const widgetCode = `<script src="${widgetBaseUrl}/widget.js"
  data-isyagent-token="${orgSlug}"
  data-isyagent-position="bottom-right"
  data-isyagent-color="#2563eb"
></script>`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-600" />
            Reportes Semanales
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Resúmenes automáticos generados cada lunes con métricas de la semana anterior.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reportsQuery.refetch()}
          className="gap-2 shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </Button>
      </div>

      {/* Widget embed section */}
      <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-4">
        <button
          onClick={() => setShowWidget(!showWidget)}
          className="flex items-center gap-2 w-full text-left"
        >
          <Code className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-semibold text-brand-800">
            Widget embebible para tu web
          </span>
          <Badge variant="outline" className="ml-auto text-brand-700 border-brand-300">
            Nuevo
          </Badge>
          {showWidget ? (
            <ChevronUp className="h-4 w-4 text-brand-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-brand-600" />
          )}
        </button>

        {showWidget && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-brand-700">
              Pega este código antes del cierre <code className="bg-brand-100 px-1 rounded">&lt;/body&gt;</code> en tu web para añadir el chat de IA para tus clientes:
            </p>
            <div className="relative">
              <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                {widgetCode}
              </pre>
              <button
                onClick={() => navigator.clipboard?.writeText(widgetCode)}
                className="absolute top-2 right-2 text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 rounded px-2 py-1 transition-colors"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Token: <code className="bg-muted px-1 rounded">{orgSlug || "Cargando..."}</code> —
              el token es tu slug de organización. Cada cliente verá el asistente con el contexto de tu agencia.
            </p>
          </div>
        )}
      </div>

      {/* Reports list */}
      {reportsQuery.isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!reportsQuery.isLoading && reports.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-2">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">No hay reportes todavía</p>
          <p className="text-xs text-muted-foreground">
            Los reportes se generan automáticamente cada lunes a las 8am UTC.
          </p>
        </div>
      )}

      {reports.map((report) => {
        const isOpen = expanded === report.id;
        const dateMatch = report.content.match(/SEMANA: (.+?) –/);
        const weekLabel = dateMatch ? dateMatch[1] : "Semana anterior";

        return (
          <div
            key={report.id}
            className="rounded-xl border bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpanded(isOpen ? null : report.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Reporte semanal</p>
                <p className="text-xs text-muted-foreground">Semana del {weekLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(report.createdAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4">
                <div className="border-t pt-3">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
                    {report.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
