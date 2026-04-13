import { z } from "zod";

// ── Chat ──────────────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  clientId: z.string().optional(),
  content: z.string().min(1).max(10000),
});

export const createConversationSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().max(200).optional(),
});

// ── Memory ────────────────────────────────────────────────────────────────────

export const createMemorySchema = z.object({
  clientId: z.string().optional(),
  level: z.enum(["IDENTITY", "OPERATIONAL", "EPISODIC"]),
  category: z.string().max(100).optional(),
  content: z.string().min(1).max(5000),
});

export const updateMemorySchema = z.object({
  id: z.string(),
  content: z.string().min(1).max(5000),
  category: z.string().max(100).optional(),
});

export const ingestSourceSchema = z.object({
  clientId: z.string().optional(),
  type: z.enum(["PDF", "WEBSITE", "INSTAGRAM_HANDLE", "MANUAL_TEXT"]),
  label: z.string().min(1).max(200),
  sourceUrl: z.string().url().optional(),
  rawContent: z.string().optional(),
});

// ── Decisions ─────────────────────────────────────────────────────────────────

export const decisionActionSchema = z.object({
  id: z.string(),
  action: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(500).optional(),
});

// ── Skills ────────────────────────────────────────────────────────────────────

export const updateSkillConfigSchema = z.object({
  skillName: z.string(),
  isEnabled: z.boolean().optional(),
  autonomyLevel: z.enum(["L0", "L1", "L2", "L3", "L4"]).optional(),
  config: z.record(z.unknown()).optional(),
});

// ── Onboarding ────────────────────────────────────────────────────────────────

export const onboardingSchema = z.object({
  organizationName: z.string().min(1).max(200),
  clientName: z.string().min(1).max(200).optional(),
  websiteUrl: z.string().url().optional(),
  instagramHandle: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});
