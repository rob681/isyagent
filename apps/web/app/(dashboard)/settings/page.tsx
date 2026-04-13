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
} from "lucide-react";

const AUTONOMY_OPTIONS = [
  { value: "L0", label: "L0 — Manual", description: "Solo sugiere, tú haces todo" },
  { value: "L1", label: "L1 — Con aprobación", description: "Prepara borradores, tú apruebas" },
  { value: "L2", label: "L2 — Semi-auto", description: "Ejecuta lo seguro, pregunta lo destructivo" },
];

interface SkillConfig {
  skillName: string;
  name: string;
  description: string;
  icon: typeof Zap;
  isEnabled: boolean;
  autonomyLevel: string;
}

const INITIAL_SKILLS: SkillConfig[] = [
  {
    skillName: "createTask",
    name: "Crear tarea",
    description: "Crea tareas en IsyTask cuando detecta necesidades del cliente",
    icon: ClipboardList,
    isEnabled: true,
    autonomyLevel: "L1",
  },
  {
    skillName: "draftPost",
    name: "Borrador de publicación",
    description: "Genera borradores de contenido para redes sociales usando el brand kit",
    icon: Sparkles,
    isEnabled: true,
    autonomyLevel: "L1",
  },
  {
    skillName: "listDMs",
    name: "Ver mensajes directos",
    description: "Lee los DMs de Instagram y Facebook para preparar respuestas",
    icon: MessageSquare,
    isEnabled: true,
    autonomyLevel: "L2",
  },
  {
    skillName: "replyDM",
    name: "Responder DM",
    description: "Envía respuestas a mensajes directos basándose en la memoria del negocio",
    icon: ArrowRight,
    isEnabled: false,
    autonomyLevel: "L1",
  },
  {
    skillName: "summarizeClient",
    name: "Resumen de cliente",
    description: "Genera resúmenes del estado de cada cliente combinando datos de IsyTask e IsySocial",
    icon: BarChart3,
    isEnabled: true,
    autonomyLevel: "L2",
  },
];

export default function SettingsPage() {
  const [skills, setSkills] = useState(INITIAL_SKILLS);

  const toggleSkill = (name: string) => {
    setSkills((prev) =>
      prev.map((s) =>
        s.skillName === name ? { ...s, isEnabled: !s.isEnabled } : s
      )
    );
  };

  const setAutonomy = (name: string, level: string) => {
    setSkills((prev) =>
      prev.map((s) =>
        s.skillName === name ? { ...s, autonomyLevel: level } : s
      )
    );
  };

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
        {skills.map((skill) => (
          <Card key={skill.skillName} className={!skill.isEnabled ? "opacity-60" : ""}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    skill.isEnabled ? "bg-brand-50" : "bg-gray-100"
                  }`}
                >
                  <skill.icon
                    className={`h-5 w-5 ${
                      skill.isEnabled ? "text-brand-600" : "text-gray-400"
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{skill.name}</h3>
                    <Badge
                      variant={skill.isEnabled ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {skill.isEnabled ? "Activa" : "Desactivada"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {skill.description}
                  </p>

                  {/* Autonomy selector */}
                  {skill.isEnabled && (
                    <div className="flex gap-2">
                      {AUTONOMY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAutonomy(skill.skillName, opt.value)}
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
                  onClick={() => toggleSkill(skill.skillName)}
                >
                  {skill.isEnabled ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
