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

export const SKILL_LABELS: Record<string, { name: string; description: string }> = {
  createTask: {
    name: "Crear tarea",
    description: "Crea una tarea en IsyTask para un cliente",
  },
  draftPost: {
    name: "Borrador de publicación",
    description: "Genera un borrador de post para IsySocial",
  },
  listDMs: {
    name: "Ver mensajes directos",
    description: "Lista los DMs recientes de Instagram/Facebook",
  },
  replyDM: {
    name: "Responder DM",
    description: "Responde a un mensaje directo de redes sociales",
  },
  summarizeClient: {
    name: "Resumen de cliente",
    description: "Genera un resumen del estado actual del cliente",
  },
};

// ─── Re-exports ───────────────────────────────────────────────────────────────

export * from "./validators";
