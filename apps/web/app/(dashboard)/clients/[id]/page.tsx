"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Brain,
  Inbox,
  ArrowLeft,
  Loader2,
  Save,
  Pencil,
  Plus,
  Zap,
  X,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useRouter, useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Tab = "memory" | "decisions";

const DECISION_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-600",
  AUTO_EXECUTED: "bg-blue-100 text-blue-700",
};

const DECISION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  EXPIRED: "Expirado",
  AUTO_EXECUTED: "Auto-ejecutado",
};

const MEMORY_LEVEL_COLORS: Record<string, string> = {
  IDENTITY: "bg-blue-100 text-blue-800",
  OPERATIONAL: "bg-green-100 text-green-800",
  EPISODIC: "bg-purple-100 text-purple-800",
};

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<Tab>("memory");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsytaskId, setEditIsytaskId] = useState("");
  const [editIsysocialId, setEditIsysocialId] = useState("");

  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState("");

  const { data: client, isLoading } = trpc.clients.get.useQuery({ id: clientId });
  const { data: memory, isLoading: loadingMemory } = trpc.clients.getMemory.useQuery(
    { clientId },
    { enabled: activeTab === "memory" }
  );
  const { data: decisions, isLoading: loadingDecisions } = trpc.clients.getDecisions.useQuery(
    { clientId },
    { enabled: activeTab === "decisions" }
  );

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.get.invalidate({ id: clientId });
      utils.clients.list.invalidate();
      setIsEditing(false);
    },
  });

  const upsertMemoryMutation = trpc.clients.upsertMemory.useMutation({
    onSuccess: () => {
      utils.clients.getMemory.invalidate({ clientId });
      utils.clients.get.invalidate({ id: clientId });
      setShowAddMemory(false);
      setNewMemoryContent("");
      setNewMemoryCategory("");
    },
  });

  const startEdit = () => {
    if (!client) return;
    setEditName(client.name);
    setEditDescription(client.description ?? "");
    setEditIsytaskId(client.isytaskClientId ?? "");
    setEditIsysocialId(client.isysocialClientId ?? "");
    setIsEditing(true);
  };

  const saveEdit = () => {
    updateMutation.mutate({
      id: clientId,
      name: editName || undefined,
      description: editDescription || undefined,
      isytaskClientId: editIsytaskId || null,
      isysocialClientId: editIsysocialId || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button variant="outline" className="mt-4 gap-2" onClick={() => router.push("/clients")}>
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/clients")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </button>

      {/* Client Header */}
      <Card className="mb-6">
        <CardContent className="p-5">
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Nombre
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Descripción
                  </label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Descripción opcional"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    ID en IsyTask
                  </label>
                  <Input
                    value={editIsytaskId}
                    onChange={(e) => setEditIsytaskId(e.target.value)}
                    placeholder="ID del cliente en IsyTask"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    ID en IsySocial
                  </label>
                  <Input
                    value={editIsysocialId}
                    onChange={(e) => setEditIsysocialId(e.target.value)}
                    placeholder="ID del cliente en IsySocial"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                  <Building2 className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{client.name}</h1>
                    {client.isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  {client.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{client.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {client.isytaskClientId ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        IsyTask: <span className="font-mono text-[10px]">{client.isytaskClientId.slice(-8)}</span>
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin ID IsyTask</span>
                    )}
                    {client.isysocialClientId ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        IsySocial: <span className="font-mono text-[10px]">{client.isysocialClientId.slice(-8)}</span>
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin ID IsySocial</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{client._count.memoryChunks} memorias</span>
                    <span>·</span>
                    <span>{client._count.decisions} decisiones</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <button
          onClick={() => setActiveTab("memory")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "memory"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Brain className="h-4 w-4" />
          Memoria
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {client._count.memoryChunks}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab("decisions")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "decisions"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="h-4 w-4" />
          Decisiones
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {client._count.decisions}
          </Badge>
        </button>
      </div>

      {/* Memory Tab */}
      {activeTab === "memory" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Memorias del cliente
            </h2>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddMemory(!showAddMemory)}>
              <Plus className="h-3.5 w-3.5" />
              Agregar memoria
            </Button>
          </div>

          {showAddMemory && (
            <Card className="mb-4">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Nueva memoria de identidad</h3>
                <Input
                  placeholder="Categoría (ej: tono, servicios, icp)"
                  value={newMemoryCategory}
                  onChange={(e) => setNewMemoryCategory(e.target.value)}
                />
                <textarea
                  placeholder="Contenido de la memoria..."
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      upsertMemoryMutation.mutate({
                        clientId,
                        content: newMemoryContent,
                        category: newMemoryCategory || undefined,
                      })
                    }
                    disabled={!newMemoryContent.trim() || upsertMemoryMutation.isLoading}
                  >
                    {upsertMemoryMutation.isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1" />
                    )}
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowAddMemory(false);
                      setNewMemoryContent("");
                      setNewMemoryCategory("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loadingMemory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : memory && memory.length > 0 ? (
            <div className="space-y-3">
              {memory.map((chunk) => (
                <Card key={chunk.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge className={MEMORY_LEVEL_COLORS[chunk.level] ?? "bg-gray-100 text-gray-600"}>
                            {chunk.level}
                          </Badge>
                          {chunk.category && (
                            <Badge variant="outline" className="text-xs">
                              {chunk.category}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(chunk.createdAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{chunk.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center">
              <Brain className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">Sin memorias para este cliente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega información sobre el cliente para que el agente la use en sus respuestas
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Decisions Tab */}
      {activeTab === "decisions" && (
        <div>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Decisiones del cliente
            </h2>
          </div>

          {loadingDecisions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : decisions && decisions.length > 0 ? (
            <div className="space-y-3">
              {decisions.map((decision) => (
                <Card key={decision.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                        <Zap className="h-4 w-4 text-brand-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold">{decision.title}</h3>
                          <Badge
                            className={
                              DECISION_STATUS_COLORS[decision.status] ?? "bg-gray-100 text-gray-600"
                            }
                          >
                            {DECISION_STATUS_LABELS[decision.status] ?? decision.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {decision.skillName}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1.5">
                          {decision.description}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(decision.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">Sin decisiones para este cliente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Las decisiones relacionadas con este cliente aparecerán aquí
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
