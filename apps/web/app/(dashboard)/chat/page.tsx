"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Sparkles,
  User,
  Loader2,
  StopCircle,
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeft,
  CheckCircle2,
  Inbox,
  Zap,
  Brain,
  ChevronDown,
  Users2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  decisions?: Array<{ id: string; title: string; skillName: string; urgency: number }>;
  skillResult?: { skillName: string; title: string; success: boolean; data?: any; error?: string };
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy tu agente de negocio. Puedo crear tareas, redactar publicaciones, generar contenido y más.\n\nDime qué necesitas y lo haré directamente.",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load clients for selector
  const clientsQuery = trpc.clients.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const selectedClient = clientsQuery.data?.find((c) => c.id === selectedClientId);

  // Check if org has memory configured
  const memoryQuery = trpc.memory.list.useQuery({ limit: 1 }, { refetchOnWindowFocus: false });
  const hasMemory = (Array.isArray(memoryQuery.data) ? memoryQuery.data.length : 0) > 0;
  const memoryLoaded = !memoryQuery.isLoading;

  const conversationsQuery = trpc.conversations.list.useQuery(
    { status: "ACTIVE" },
    { refetchOnWindowFocus: false }
  );

  const conversationDetail = trpc.conversations.getById.useQuery(
    { id: conversationId! },
    { enabled: !!conversationId, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (conversationDetail.data?.messages && conversationId) {
      const dbMessages: ChatMessage[] = conversationDetail.data.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      if (dbMessages.length > 0) setMessages(dbMessages);
    }
  }, [conversationDetail.data, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([WELCOME]);
    setInput("");
  };

  const handleSelectConversation = (id: string) => {
    if (id === conversationId) return;
    setConversationId(id);
    setMessages([]);
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content: text, history, clientId: selectedClientId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.text } : m
                )
              );
            }

            if (event.type === "decision_created") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        decisions: [...(m.decisions ?? []), event.decision],
                      }
                    : m
                )
              );
            }

            if (event.type === "skill_executed") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, skillResult: event }
                    : m
                )
              );
            }

            if (event.type === "done") {
              if (event.conversationId) {
                setConversationId(event.conversationId);
                conversationsQuery.refetch();
              }
            }

            if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `⚠️ Error: ${event.message}` }
                    : m
                )
              );
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || `⚠️ Error de conexión: ${err.message}` }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, conversationId, conversationsQuery]);

  const handleStop = () => abortRef.current?.abort();

  const conversations = conversationsQuery.data?.items ?? [];

  return (
    <div className="flex h-full">
      {/* Conversation Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-200 ease-in-out overflow-hidden border-r bg-gray-50/50 flex-shrink-0`}
      >
        <div className="w-72 h-full flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversaciones
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="h-7 w-7 p-0">
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-3">
            <Button onClick={handleNewConversation} variant="outline" className="w-full justify-start gap-2 text-sm" size="sm">
              <Plus className="h-4 w-4" />
              Nueva conversación
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {conversationsQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!conversationsQuery.isLoading && conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8 px-4">
                Envía un mensaje para comenzar.
              </p>
            )}
            {conversations.map((conv) => {
              const isActive = conv.id === conversationId;
              const lastMessage = conv.messages[0];
              const preview = lastMessage?.content
                ? lastMessage.content.length > 60
                  ? lastMessage.content.slice(0, 60) + "..."
                  : lastMessage.content
                : "Sin mensajes";
              const timeAgo = lastMessage?.createdAt
                ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true, locale: es })
                : "";

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-brand-600/10 border border-brand-600/20"
                      : "hover:bg-gray-100 border border-transparent"
                  }`}
                >
                  <p className={`text-sm font-medium truncate ${isActive ? "text-brand-600" : "text-gray-800"}`}>
                    {conv.title || "Sin título"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{preview}</p>
                  {timeAgo && <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo}</p>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b px-6 py-3 flex items-center gap-3">
          {!sidebarOpen && (
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="h-8 w-8 p-0 shrink-0">
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600 shrink-0" />
            <h1 className="text-base font-semibold">Chat con tu Agente</h1>
          </div>

          {/* Client selector */}
          <div className="ml-auto relative">
            <button
              type="button"
              onClick={() => setShowClientDropdown((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted ${
                selectedClientId ? "border-brand-300 bg-brand-50 text-brand-700" : "border-border text-muted-foreground"
              }`}
            >
              <Users2 className="h-3.5 w-3.5" />
              <span>{selectedClient ? selectedClient.name : "Todos los clientes"}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showClientDropdown && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border bg-white shadow-lg z-50 py-1">
                <button
                  type="button"
                  onClick={() => { setSelectedClientId(null); setShowClientDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${!selectedClientId ? "font-medium text-brand-700" : ""}`}
                >
                  Todos los clientes
                </button>
                {clientsQuery.data?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedClientId(c.id); setShowClientDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedClientId === c.id ? "font-medium text-brand-700" : ""}`}
                  >
                    {c.name}
                  </button>
                ))}
                {(clientsQuery.data?.length ?? 0) === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    No hay clientes. <Link href="/clients" className="underline">Crear uno →</Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* No-memory banner */}
        {memoryLoaded && !hasMemory && (
          <div className="mx-6 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">El agente no tiene memoria configurada</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Para respuestas personalizadas, añade información de tu negocio en Memoria.
              </p>
            </div>
            <Link
              href="/memory"
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900"
            >
              <Brain className="h-3.5 w-3.5" />
              Configurar
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Active client banner */}
        {selectedClient && (
          <div className="mx-6 mt-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 flex items-center gap-2">
            <Users2 className="h-3.5 w-3.5 text-brand-600 shrink-0" />
            <p className="text-xs text-brand-700">
              Contexto activo: <span className="font-semibold">{selectedClient.name}</span>
              {" — "}el agente priorizará información de este cliente.
            </p>
            <button
              type="button"
              onClick={() => setSelectedClientId(null)}
              className="ml-auto text-xs text-brand-500 hover:text-brand-700"
            >
              Quitar ×
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && conversationDetail.isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "assistant" ? "bg-brand-100" : "bg-gray-200"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Sparkles className="h-4 w-4 text-brand-600" />
                ) : (
                  <User className="h-4 w-4 text-gray-600" />
                )}
              </div>

              <div className="max-w-[70%] space-y-2">
                {/* Text bubble */}
                {(msg.content || (isStreaming && msg.id.startsWith("assistant-"))) && (
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "assistant" ? "bg-muted" : "bg-brand-600 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "assistant" && msg.content === "" && isStreaming && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* Decision cards */}
                {msg.decisions && msg.decisions.length > 0 && (
                  <div className="space-y-2">
                    {msg.decisions.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3"
                      >
                        <Inbox className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-amber-900">{d.title}</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Decisión pendiente de tu aprobación
                          </p>
                        </div>
                        <Link
                          href="/decisions"
                          className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                        >
                          Revisar →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skill executed card */}
                {msg.skillResult && (
                  <div
                    className={`rounded-xl border px-4 py-3 ${
                      msg.skillResult.success
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {msg.skillResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <Zap className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${msg.skillResult.success ? "text-green-900" : "text-red-900"}`}>
                          {msg.skillResult.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${msg.skillResult.success ? "text-green-700" : "text-red-700"}`}>
                          {msg.skillResult.success ? "Acción ejecutada automáticamente" : msg.skillResult.error}
                        </p>
                        {/* Rich result details */}
                        {msg.skillResult.success && msg.skillResult.data && (
                          <div className="mt-2 space-y-0.5">
                            {msg.skillResult.data.taskNumber && (
                              <p className="text-xs text-green-700">
                                📋 Tarea <span className="font-mono font-medium">#{msg.skillResult.data.taskNumber}</span>
                                {msg.skillResult.data.title && ` — ${msg.skillResult.data.title}`}
                              </p>
                            )}
                            {msg.skillResult.data.postId && (
                              <p className="text-xs text-green-700">
                                📱 Post creado en{" "}
                                <span className="font-medium">{msg.skillResult.data.network}</span>
                                {msg.skillResult.data.title && ` — "${msg.skillResult.data.title}"`}
                              </p>
                            )}
                            {msg.skillResult.data.copy && (
                              <p className="text-xs text-green-700 italic line-clamp-2">
                                "{msg.skillResult.data.copy}"
                              </p>
                            )}
                            {msg.skillResult.data.summary && (
                              <p className="text-xs text-green-700 whitespace-pre-line">
                                {msg.skillResult.data.summary}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.skillResult.success && msg.skillResult.skillName === "createTask" && (
                        <Link href="/decisions" className="shrink-0 text-xs text-green-700 hover:underline flex items-center gap-0.5">
                          Ver <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje... (ej: 'Crea una tarea urgente para revisar el logo del cliente')"
              className="flex-1"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button type="button" variant="outline" onClick={handleStop} className="gap-1">
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            El agente puede crear tareas y posts directamente. Las acciones requieren tu aprobación en{" "}
            <Link href="/decisions" className="underline">
              Decisiones
            </Link>{" "}
            (o se auto-ejecutan según el nivel de autonomía configurado).
          </p>
        </div>
      </div>
    </div>
  );
}
