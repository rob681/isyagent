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
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy tu agente de negocio. Puedo ayudarte a crear tareas, redactar publicaciones, responder mensajes de clientes y más.\n\n¿En qué te puedo ayudar hoy?",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch conversation list
  const conversationsQuery = trpc.conversations.list.useQuery(
    { status: "ACTIVE" },
    { refetchOnWindowFocus: false }
  );

  // Fetch selected conversation messages
  const conversationDetail = trpc.conversations.getById.useQuery(
    { id: conversationId! },
    {
      enabled: !!conversationId,
      refetchOnWindowFocus: false,
    }
  );

  // When conversation detail loads, populate messages from DB
  useEffect(() => {
    if (conversationDetail.data?.messages && conversationId) {
      const dbMessages: ChatMessage[] = conversationDetail.data.messages.map(
        (m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        })
      );
      if (dbMessages.length > 0) {
        setMessages(dbMessages);
      }
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
    setMessages([]); // Clear while loading
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Prepare history (exclude welcome message)
    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    // Create placeholder for streaming assistant message
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
        body: JSON.stringify({
          conversationId,
          content: text,
          history,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

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
          const json = line.slice(6);

          try {
            const event = JSON.parse(json);

            if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.text }
                    : m
                )
              );
            }

            if (event.type === "done") {
              if (event.conversationId) {
                setConversationId(event.conversationId);
                // Refetch conversation list to show the new/updated conversation
                conversationsQuery.refetch();
              }
            }

            if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: `⚠️ Error: ${event.message}`,
                      }
                    : m
                )
              );
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content || `⚠️ Error de conexión: ${err.message}`,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, conversationId, conversationsQuery]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const conversations = conversationsQuery.data?.items ?? [];

  return (
    <div className="flex h-full">
      {/* Conversation History Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-200 ease-in-out overflow-hidden border-r bg-gray-50/50 flex-shrink-0`}
      >
        <div className="w-72 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversaciones
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="h-7 w-7 p-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          {/* New Conversation Button */}
          <div className="p-3">
            <Button
              onClick={handleNewConversation}
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Nueva conversación
            </Button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {conversationsQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!conversationsQuery.isLoading && conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8 px-4">
                No hay conversaciones aún. Envía un mensaje para comenzar.
              </p>
            )}

            {conversations.map((conv) => {
              const isActive = conv.id === conversationId;
              const lastMessage = conv.messages[0];
              const lastMessagePreview = lastMessage?.content
                ? lastMessage.content.length > 60
                  ? lastMessage.content.slice(0, 60) + "..."
                  : lastMessage.content
                : "Sin mensajes";
              const timeAgo = lastMessage?.createdAt
                ? formatDistanceToNow(new Date(lastMessage.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })
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
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive ? "text-brand-600" : "text-gray-800"
                      }`}
                    >
                      {conv.title || "Sin título"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {lastMessagePreview}
                  </p>
                  {timeAgo && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {timeAgo}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center gap-3">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 p-0 shrink-0"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600" />
              Chat con tu Agente
            </h1>
            <p className="text-sm text-muted-foreground">
              Conversación directa — tu agente recuerda el contexto de tu
              negocio
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && conversationDetail.isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
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
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-muted"
                    : "bg-brand-600 text-white"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === "assistant" &&
                  msg.content === "" &&
                  isStreaming && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
              placeholder="Escribe un mensaje..."
              className="flex-1"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleStop}
                className="gap-1"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            IsyAgent usa Claude Sonnet de Anthropic. Las respuestas se basan en
            la memoria de tu negocio.
          </p>
        </div>
      </div>
    </div>
  );
}
