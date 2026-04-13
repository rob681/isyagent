"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Globe,
  Instagram,
  MessageSquare,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

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
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newContent, setNewContent] = useState("");

  const { data: memories, isLoading: loadingMemories } = trpc.memory.list.useQuery({
    limit: 50,
  });

  const { data: sources, isLoading: loadingSources } = trpc.memory.sources.useQuery({});

  const updateMutation = trpc.memory.update.useMutation({
    onSuccess: () => {
      utils.memory.list.invalidate();
      setEditingId(null);
      setEditContent("");
    },
  });

  const deleteMutation = trpc.memory.delete.useMutation({
    onSuccess: () => {
      utils.memory.list.invalidate();
    },
  });

  const createMutation = trpc.memory.create.useMutation({
    onSuccess: () => {
      utils.memory.list.invalidate();
      setShowAddForm(false);
      setNewCategory("");
      setNewContent("");
    },
  });

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, content: editContent });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleCreate = () => {
    if (!newContent.trim()) return;
    createMutation.mutate({
      level: "IDENTITY",
      category: newCategory || undefined,
      content: newContent,
    });
  };

  if (loadingMemories && loadingSources) {
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
            <Brain className="h-6 w-6 text-brand-600" />
            Memoria del Negocio
          </h1>
          <p className="text-muted-foreground mt-1">
            Lo que tu agente sabe sobre tu negocio. Edita la identidad para mejorar sus respuestas.
          </p>
        </div>
        <Button className="gap-1" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4" />
          Agregar memoria
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Nueva memoria de identidad</h3>
            <input
              type="text"
              placeholder="Categoría (ej: tono, servicios, icp, no-gos)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Contenido de la memoria..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newContent.trim() || createMutation.isLoading}
              >
                {createMutation.isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1" />
                )}
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources section */}
      {sources && sources.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Fuentes de conocimiento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sources.map((src) => {
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
                        {src._count.chunks > 0
                          ? `${src._count.chunks} fragmentos extraídos`
                          : "Procesando..."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Memory chunks */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Memorias activas ({memories?.length ?? 0})
        </h2>
        <div className="space-y-3">
          {memories?.map((mem) => (
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
                      {mem.source && (
                        <span className="text-xs text-muted-foreground">
                          vía {mem.source.label}
                        </span>
                      )}
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
                          <Button
                            size="sm"
                            onClick={() => saveEdit(mem.id)}
                            disabled={updateMutation.isLoading}
                          >
                            {updateMutation.isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3.5 w-3.5 mr-1" />
                            )}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(mem.id)}
                        disabled={deleteMutation.isLoading}
                      >
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

      {(!memories || memories.length === 0) && (
        <Card className="p-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">
            Sin memorias aún
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Agrega información sobre tu negocio para que el agente la use
          </p>
        </Card>
      )}
    </div>
  );
}
