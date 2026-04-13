"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Globe,
  Instagram,
  MessageSquare,
} from "lucide-react";

// Mock data — will connect to tRPC
const MOCK_MEMORIES = [
  {
    id: "1",
    level: "IDENTITY",
    category: "tone",
    content: "Tono de comunicación: Profesional pero cercano. Usa tuteo. Evita emojis excesivos. Siempre firma con el nombre de la agencia.",
    isEditable: true,
    source: { label: "Manual", type: "MANUAL_TEXT" },
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: "2",
    level: "IDENTITY",
    category: "services",
    content: "Servicios principales: Diseño gráfico, Manejo de redes sociales (Instagram, Facebook, TikTok), Desarrollo web, Fotografía de producto. Precios desde $5,000 MXN/mes.",
    isEditable: true,
    source: { label: "Brand Brochure PDF", type: "PDF" },
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
  {
    id: "3",
    level: "IDENTITY",
    category: "icp",
    content: "Cliente ideal: Negocios locales en CDMX y Guadalajara, facturación $500K-$5M MXN/año, que necesitan presencia digital pero no tienen equipo interno de marketing.",
    isEditable: true,
    source: { label: "Website: agencia.com", type: "WEBSITE" },
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
  },
  {
    id: "4",
    level: "IDENTITY",
    category: "no-gos",
    content: "NO hacemos: Campañas políticas, contenido para adultos, MLM/esquemas piramidales, prometemos resultados garantizados en SEO.",
    isEditable: true,
    source: { label: "Manual", type: "MANUAL_TEXT" },
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
];

const MOCK_SOURCES = [
  { id: "s1", type: "PDF", label: "Brand Brochure 2025.pdf", chunksCount: 8, processedAt: new Date() },
  { id: "s2", type: "WEBSITE", label: "Website: agencia.com", chunksCount: 12, processedAt: new Date() },
  { id: "s3", type: "INSTAGRAM_HANDLE", label: "Instagram: @miagencia", chunksCount: 0, processedAt: null },
];

const LEVEL_COLORS: Record<string, string> = {
  IDENTITY: "bg-blue-100 text-blue-800",
  OPERATIONAL: "bg-green-100 text-green-800",
  EPISODIC: "bg-purple-100 text-purple-800",
};

const LEVEL_LABELS: Record<string, string> = {
  IDENTITY: "Identidad",
  OPERATIONAL: "Operativa",
  EPISODIC: "Episódica",
};

const SOURCE_ICONS: Record<string, typeof FileText> = {
  PDF: FileText,
  WEBSITE: Globe,
  INSTAGRAM_HANDLE: Instagram,
  MANUAL_TEXT: MessageSquare,
};

export default function MemoryPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-brand-600" />
            Memoria del Negocio
          </h1>
          <p className="text-muted-foreground mt-1">
            Lo que tu agente sabe sobre tu negocio. Edita la identidad para mejorar sus respuestas.
          </p>
        </div>
        <Button className="gap-1">
          <Plus className="h-4 w-4" />
          Agregar memoria
        </Button>
      </div>

      {/* Sources section */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Fuentes de conocimiento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MOCK_SOURCES.map((src) => {
            const Icon = SOURCE_ICONS[src.type] ?? FileText;
            return (
              <Card key={src.id} className="cursor-pointer hover:border-brand-300 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                    <Icon className="h-4 w-4 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{src.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {src.chunksCount > 0
                        ? `${src.chunksCount} fragmentos extraídos`
                        : "Procesando..."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Memory chunks */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Memorias activas
        </h2>
        <div className="space-y-3">
          {MOCK_MEMORIES.map((mem) => (
            <Card key={mem.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={LEVEL_COLORS[mem.level]}>
                        {LEVEL_LABELS[mem.level]}
                      </Badge>
                      {mem.category && (
                        <Badge variant="outline" className="text-xs">
                          {mem.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        vía {mem.source.label}
                      </span>
                    </div>

                    {editingId === mem.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={cancelEdit}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed">
                        {mem.content}
                      </p>
                    )}
                  </div>

                  {mem.isEditable && editingId !== mem.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(mem.id, mem.content)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
