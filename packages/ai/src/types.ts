export interface AgentContext {
  organizationId: string;
  clientId?: string;
  userId: string;
  conversationId: string;
  memoryChunks: Array<{ content: string; level: string; category?: string }>;
  availableSkills: string[];
  autonomyLevel: string;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  decisions?: ProposedDecision[];
  tokensUsed: {
    input: number;
    output: number;
    tier: "OPUS" | "SONNET" | "HAIKU";
    model: string;
  };
}

export interface ToolCall {
  skillName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface ProposedDecision {
  title: string;
  description: string;
  skillName: string;
  skillInput: Record<string, unknown>;
  urgency: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}
