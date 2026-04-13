"use client";

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
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const AUTONOMY_OPTIONS = [
  { value: "L0", label: "L0 — Manual", description: "Solo sugiere, tú haces todo" },
  { value: "L1", label: "L1 — Con aprobación", description: "Prepara borradores, tú apruebas" },
  { value: "L2", label: "L2 — Semi-auto", description: "Ejecuta lo seguro, pregunta lo destructivo" },
];

const SKILL_ICONS: Record<string, typeof Zap> = {
  createTask: ClipboardList,
  draftPost: Sparkles,
  listDMs: MessageSquare,
  replyDM: ArrowRight,
  summarizeClient: BarChart3,
};

export default function SettingsPage() {
  const utils = trpc.useUtils();

  const { data: skills, isLoading } = trpc.skills.list.useQuery();

  const updateMutation = trpc.skills.update.useMutation({
    onSuccess: () => {
      utils.skills.list.invalidate();
    },
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-brand-600" />
          Habilidades del Agente
        </h1>
        <p className="text-muted-foreground mt-1">
          Configura qué puede hacer tu agente y cuánta autonomía tiene para cada acción.
        </p>
      </div>

      {/* Skills */}
      <div className="space-y-4">
        {skills?.map((skill) => {
          const Icon = SKILL_ICONS[skill.skillName] ?? Zap;
          const isUpdating =
            updateMutation.isLoading &&
            updateMutation.variables?.skillName === skill.skillName;

          return (
            <Card
              key={skill.skillName}
              className={!skill.isEnabled ? "opacity-60" : ""}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      skill.isEnabled ? "bg-brand-50" : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        skill.isEnabled ? "text-brand-600" : "text-gray-400"
                      }`}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{skill.name}</h3>
                      <Badge
                        className={
                          skill.isEnabled
                            ? "bg-brand-100 text-brand-700"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {skill.isEnabled ? "Activa" : "Desactivada"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {skill.description}
                    </p>

                    {skill.isEnabled && (
                      <div className="flex gap-2">
                        {AUTONOMY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setAutonomy(skill.skillName, opt.value)}
                            disabled={isUpdating}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                              skill.autonomyLevel === opt.value
                                ? "border-brand-300 bg-brand-50 text-brand-700"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            {skill.autonomyLevel === opt.value && (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {opt.label}
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
    </div>
  );
}
