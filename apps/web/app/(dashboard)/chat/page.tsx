"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Sparkles,
  User,
  Loader2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

// Mock — will be replaced with streaming tRPC + Anthropic API
const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy tu agente de negocio. Puedo ayudarte a crear tareas, redactar publicaciones, responder mensajes de clientes y más.\n\n¿En qué te puedo ayudar hoy?",
  createdAt: new Date(),
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Mock response — will be replaced with actual API call
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: getMockResponse(userMessage.content),
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          Chat con tu Agente
        </h1>
        <p className="text-sm text-muted-foreground">
          Conversación directa — tu agente recuerda el contexto de tu negocio
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === "assistant"
                  ? "bg-brand-100"
                  : "bg-gray-200"
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
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100">
              <Sparkles className="h-4 w-4 text-brand-600" />
            </div>
            <div className="rounded-2xl bg-muted px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

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
            disabled={isLoading}
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          IsyAgent usa Claude de Anthropic. Las respuestas se basan en la memoria de tu negocio.
        </p>
      </div>
    </div>
  );
}

// ── Mock responses (temporary) ────────────────────────────────────────────────
function getMockResponse(userInput: string): string {
  const lower = userInput.toLowerCase();

  if (lower.includes("tarea") || lower.includes("task")) {
    return "Entendido. Voy a preparar una propuesta de tarea para que la revises.\n\n📋 **Acción propuesta:** Crear tarea en IsyTask\n\nLa enviaré a tu Bandeja de Decisiones para que la apruebes antes de crearla.";
  }
  if (lower.includes("post") || lower.includes("publicación") || lower.includes("instagram")) {
    return "¡Perfecto! Déjame revisar la memoria de marca del cliente y preparar un borrador.\n\n📝 **Acción propuesta:** Crear borrador de publicación\n\nCuando lo tenga listo, aparecerá en tu Bandeja de Decisiones.";
  }
  if (lower.includes("mensaje") || lower.includes("dm") || lower.includes("responder")) {
    return "Revisé los mensajes recientes. Hay 3 DMs pendientes.\n\nPuedo preparar respuestas para cada uno basándome en la información de servicios y precios que tengo en memoria. ¿Quieres que lo haga?";
  }
  if (lower.includes("resumen") || lower.includes("estado") || lower.includes("cliente")) {
    return "Aquí tienes un resumen rápido:\n\n📊 **Estado general:**\n- 5 tareas activas en IsyTask\n- 3 posts programados esta semana\n- 2 DMs pendientes de respuesta\n- Engagement rate promedio: 4.2%\n\n¿Quieres que profundice en algún tema?";
  }

  return "Entendido. Déjame pensar en la mejor forma de ayudarte con eso.\n\nPuedo crear tareas, redactar publicaciones, revisar mensajes de clientes o darte un resumen del estado de tu negocio. ¿Qué prefieres?";
}
