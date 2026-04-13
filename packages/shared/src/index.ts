// ─── Constants ────────────────────────────────────────────────────────────────

export const LLM_MODELS = {
  OPUS: "claude-opus-4-20250514",
  SONNET: "claude-sonnet-4-20250514",
  HAIKU: "claude-haiku-4-20250514",
} as const;

export const AUTONOMY_LABELS: Record<string, string> = {
  L0: "Manual completo",
  L1: "Agente sugiere, tú apruebas",
  L2: "Agente ejecuta lo seguro, pregunta lo destructivo",
  L3: "Agente ejecuta casi todo, revisión async",
  L4: "Automático total",
};

export const DECISION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  EXPIRED: "Expirado",
  AUTO_EXECUTED: "Auto-ejecutado",
};

export const MEMORY_LEVEL_LABELS: Record<string, string> = {
  IDENTITY: "Identidad",
  OPERATIONAL: "Operativa",
  EPISODIC: "Episódica",
};

export const SKILL_LABELS: Record<
  string,
  { name: string; description: string; product: "isytask" | "isysocial" | "agent"; risk: "low" | "medium" | "high" }
> = {
  createTask: {
    name: "Crear tarea",
    description: "Crea una tarea en IsyTask para un cliente",
    product: "isytask",
    risk: "medium",
  },
  draftPost: {
    name: "Borrador de publicación",
    description: "Crea un borrador de post en IsySocial (estado DRAFT, no se publica)",
    product: "isysocial",
    risk: "low",
  },
  listDMs: {
    name: "Ver mensajes directos",
    description: "Lista los DMs recientes de redes sociales conectadas",
    product: "isysocial",
    risk: "low",
  },
  replyDM: {
    name: "Responder DM",
    description: "Envía una respuesta a un mensaje directo (acción irreversible)",
    product: "isysocial",
    risk: "high",
  },
  summarizeClient: {
    name: "Resumen de cliente",
    description: "Genera un resumen de actividad de un cliente (tareas + posts + DMs)",
    product: "agent",
    risk: "low",
  },
};

// ─── Re-exports ───────────────────────────────────────────────────────────────

export * from "./validators";
