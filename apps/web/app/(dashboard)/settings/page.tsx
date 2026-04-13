"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Loader2,
  Building2,
  Save,
  Link2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const AUTONOMY_OPTIONS = [
  { value: "L0", label: "L0", description: "Solo sugiere, no actúa", color: "text-gray-500" },
  { value: "L1", label: "L1", description: "Prepara borradores, tú apruebas", color: "text-blue-600" },
  { value: "L2", label: "L2", description: "Ejecuta lo seguro, pregunta lo destructivo", color: "text-green-600" },
  { value: "L3", label: "L3", description: "Ejecuta casi todo, revisión async", color: "text-amber-600" },
  { value: "L4", label: "L4", description: "Automático total, notifica post-facto", color: "text-red-600" },
];

const SKILL_ICONS: Record<string, typeof Zap> = {
  createTask: ClipboardList,
  draftPost: Sparkles,
  listDMs: MessageSquare,
  replyDM: ArrowRight,
  summarizeClient: BarChart3,
};

const RISK_CONFIG: Record<string, { icon: typeof ShieldCheck; label: string; color: string }> = {
  low: { icon: ShieldCheck, label: "Riesgo bajo", color: "text-green-600 bg-green-50" },
  medium: { icon: ShieldAlert, label: "Riesgo medio", color: "text-amber-600 bg-amber-50" },
  high: { icon: AlertTriangle, label: "Riesgo alto", color: "text-red-600 bg-red-50" },
};

const PRODUCT_BADGE: Record<string, { label: string; color: string }> = {
  isytask: { label: "IsyTask", color: "bg-blue-100 text-blue-700" },
  isysocial: { label: "IsySocial", color: "bg-purple-100 text-purple-700" },
  agent: { label: "IsyAgent", color: "bg-brand-100 text-brand-700" },
};

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const [agencySaved, setAgencySaved] = useState(false);

  const { data: skills, isLoading } = trpc.skills.list.useQuery();
  const { data: org } = trpc.onboarding.getOrg.useQuery();

  const [isytaskId, setIsytaskId] = useState("");
  const [isysocialId, setIsysocialId] = useState("");

  // Populate from org data once loaded
  useState(() => {
    if (org) {
      setIsytaskId((org as any).isytaskAgencyId ?? "");
      setIsysocialId((org as any).isysocialAgencyId ?? "");
    }
  });

  const updateOrgMutation = trpc.onboarding.updateAgencyIds.useMutation({
    onSuccess: () => {
      utils.onboarding.getOrg.invalidate();
      setAgencySaved(true);
      setTimeout(() => setAgencySaved(false), 3000);
    },
  });

  const updateMutation = trpc.skills.update.useMutation({
    onSuccess: () => utils.skills.list.invalidate(),
  });

  const toggleSkill = (skillName: string, currentEnabled: boolean) => {
    updateMutation.mutate({ skillName, isEnabled: !currentEnabled });
  };

  const setAutonomy = (skillName: string, level: string) => {
    updateMutation.mutate({
      skillName,
      autonomyLevel: level as "L0" | "L1" | "L2" | "L3" | "L4",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">

      {/* ── Agency IDs ───────────────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-600" />
            Vinculación de productos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conecta IsyAgent con tu cuenta de IsyTask e IsySocial para que el agente pueda crear tareas y posts.
          </p>
        </div>
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  IsyTask Agency ID
                </label>
                <input
                  type="text"
                  placeholder="cmmkplwq70001npm7x2t66sko"
                  value={isytaskId}
                  onChange={(e) => setIsytaskId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Encuéntralo en IsyTask → Configuración → Agencia → ID
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  IsySocial Agency ID
                </label>
                <input
                  type="text"
                  placeholder="cmn0v0orf000111vu1fzced94"
                  value={isysocialId}
                  onChange={(e) => setIsysocialId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Encuéntralo en IsySocial → Configuración → Agencia → ID
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="gap-1"
                onClick={() =>
                  updateOrgMutation.mutate({ isytaskAgencyId: isytaskId, isysocialAgencyId: isysocialId })
                }
                disabled={updateOrgMutation.isLoading}
              >
                {updateOrgMutation.isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Guardar
              </Button>
              {agencySaved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Guardado
                </span>
              )}
              {org && (org as any).isytaskAgencyId && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                  <Link2 className="h-3.5 w-3.5 text-green-600" />
                  Vinculado
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Skills ───────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-600" />
            Habilidades del agente
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Controla qué puede hacer el agente y cuánta autonomía tiene.
            Mayor nivel = menos confirmaciones necesarias.
          </p>
        </div>

        {/* Autonomy legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          {AUTONOMY_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`font-bold ${opt.color}`}>{opt.label}</span>
              <span>—</span>
              <span>{opt.description}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {skills?.map((skill) => {
            const Icon = SKILL_ICONS[skill.skillName] ?? Zap;
            const isUpdating =
              updateMutation.isLoading && updateMutation.variables?.skillName === skill.skillName;
            const risk = RISK_CONFIG[(skill as any).risk ?? "low"];
            const RiskIcon = risk.icon;
            const product = PRODUCT_BADGE[(skill as any).product ?? "agent"];

            return (
              <Card key={skill.skillName} className={!skill.isEnabled ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        skill.isEnabled ? "bg-brand-50" : "bg-gray-100"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${skill.isEnabled ? "text-brand-600" : "text-gray-400"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm">{skill.name}</h3>
                        {product && (
                          <Badge className={`text-[10px] ${product.color}`}>
                            {product.label}
                          </Badge>
                        )}
                        {risk && (
                          <span className={`flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5 ${risk.color}`}>
                            <RiskIcon className="h-3 w-3" />
                            {risk.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{skill.description}</p>

                      {skill.isEnabled && (
                        <div className="flex gap-1.5 flex-wrap">
                          {AUTONOMY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setAutonomy(skill.skillName, opt.value)}
                              disabled={isUpdating}
                              className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                skill.autonomyLevel === opt.value
                                  ? "border-brand-300 bg-brand-50 text-brand-700"
                                  : "border-border bg-background hover:bg-muted text-muted-foreground"
                              }`}
                            >
                              {skill.autonomyLevel === opt.value && (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              <span className={skill.autonomyLevel === opt.value ? "" : opt.color}>
                                {opt.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSkill(skill.skillName, skill.isEnabled)}
                      disabled={isUpdating}
                      className="shrink-0"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : skill.isEnabled ? (
                        "Desactivar"
                      ) : (
                        "Activar"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
