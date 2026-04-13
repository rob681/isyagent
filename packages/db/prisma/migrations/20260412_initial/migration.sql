-- IsyAgent initial schema
-- All tables prefixed with agent_ to avoid collisions with IsyTask/IsySocial in the same DB

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MemoryLevel" AS ENUM ('IDENTITY', 'OPERATIONAL', 'EPISODIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MemorySourceType" AS ENUM ('PDF', 'WEBSITE', 'INSTAGRAM_HANDLE', 'MANUAL_TEXT', 'ISYTASK_EVENT', 'ISYSOCIAL_EVENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LLMTier" AS ENUM ('OPUS', 'SONNET', 'HAIKU');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AutonomyLevel" AS ENUM ('L0', 'L1', 'L2', 'L3', 'L4');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DecisionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'AUTO_EXECUTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Organizations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_organizations" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "name"                  TEXT NOT NULL,
  "slug"                  TEXT NOT NULL UNIQUE,
  "logoUrl"               TEXT,
  "plan"                  TEXT NOT NULL DEFAULT 'free',
  "isActive"              BOOLEAN NOT NULL DEFAULT true,
  "llmMonthlyBudgetCents" INTEGER NOT NULL DEFAULT 1000,
  "llmCurrentMonthCents"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"             TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_users" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "email"         TEXT NOT NULL UNIQUE,
  "name"          TEXT NOT NULL,
  "avatarUrl"     TEXT,
  "passwordHash"  TEXT,
  "emailVerified" TIMESTAMP,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Organization Users (join table) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_organization_users" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "agent_organizations"("id") ON DELETE CASCADE,
  "userId"         TEXT NOT NULL REFERENCES "agent_users"("id") ON DELETE CASCADE,
  "role"           "UserRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "agent_org_user_unique" UNIQUE ("organizationId", "userId")
);

-- ── Clients ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_clients" (
  "id"                TEXT NOT NULL PRIMARY KEY,
  "organizationId"    TEXT NOT NULL REFERENCES "agent_organizations"("id") ON DELETE CASCADE,
  "name"              TEXT NOT NULL,
  "description"       TEXT,
  "logoUrl"           TEXT,
  "isActive"          BOOLEAN NOT NULL DEFAULT true,
  "isytaskClientId"   TEXT,
  "isysocialClientId" TEXT,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_clients_orgId" ON "agent_clients"("organizationId");

-- ── Conversations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_conversations" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "agent_organizations"("id") ON DELETE CASCADE,
  "clientId"       TEXT REFERENCES "agent_clients"("id"),
  "title"          TEXT,
  "status"         "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_conversations_org_status" ON "agent_conversations"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "agent_conversations_client" ON "agent_conversations"("clientId");

-- ── Messages ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_messages" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "agent_conversations"("id") ON DELETE CASCADE,
  "role"           TEXT NOT NULL,
  "content"        TEXT NOT NULL,
  "llmTier"        "LLMTier",
  "llmModel"       TEXT,
  "skillName"      TEXT,
  "toolCallId"     TEXT,
  "toolInput"      JSONB,
  "toolOutput"     JSONB,
  "userId"         TEXT REFERENCES "agent_users"("id"),
  "tokenCount"     INTEGER,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_messages_conv_created" ON "agent_messages"("conversationId", "createdAt");

-- ── Memory Sources ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_memory_sources" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "agent_organizations"("id") ON DELETE CASCADE,
  "clientId"       TEXT REFERENCES "agent_clients"("id"),
  "type"           "MemorySourceType" NOT NULL,
  "label"          TEXT NOT NULL,
  "sourceUrl"      TEXT,
  "rawContent"     TEXT,
  "processedAt"    TIMESTAMP,
  "errorMessage"   TEXT,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_memory_sources_org_type" ON "agent_memory_sources"("organizationId", "type");

-- ── Memory Chunks ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_memory_chunks" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "agent_organizations"("id") ON DELETE CASCADE,
  "clientId"       TEXT REFERENCES "agent_clients"("id"),
  "sourceId"       TEXT REFERENCES "agent_memory_sources"("id") ON DELETE SET NULL,
  "level"          "MemoryLevel" NOT NULL,
  "category"       TEXT,
  "content"        TEXT NOT NULL,
  "embedding"      DOUBLE PRECISION[] NOT NULL DEFAULT '{}',
  "isEditable"     BOOLEAN NOT NULL DEFAULT false,
  "editedAt"       TIMESTAMP,
  "usageCount"     INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt"     TIMESTAMP,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_memory_chunks_org_level" ON "agent_memory_chunks"("organizationId", "level");
CREATE INDEX IF NOT EXISTS "agent_memory_chunks_client_level" ON "agent_memory_chunks"("clientId", "level");

-- ── Skill Configs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_skill_configs" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "agent_organizations"("id") ON DELETE CASCADE,
  "skillName"      TEXT NOT NULL,
  "version"        INTEGER NOT NULL DEFAULT 1,
  "isEnabled"      BOOLEAN NOT NULL DEFAULT true,
  "autonomyLevel"  "AutonomyLevel" NOT NULL DEFAULT 'L1',
  "config"         JSONB NOT NULL DEFAULT '{}',
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "agent_skill_configs_org_name" UNIQUE ("organizationId", "skillName")
);

-- ── Decisions ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_decisions" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "organizationId"  TEXT NOT NULL REFERENCES "agent_organizations"("id") ON DELETE CASCADE,
  "clientId"        TEXT REFERENCES "agent_clients"("id"),
  "conversationId"  TEXT REFERENCES "agent_conversations"("id"),
  "title"           TEXT NOT NULL,
  "description"     TEXT NOT NULL,
  "skillName"       TEXT NOT NULL,
  "skillInput"      JSONB NOT NULL,
  "urgency"         INTEGER NOT NULL DEFAULT 0,
  "status"          "DecisionStatus" NOT NULL DEFAULT 'PENDING',
  "statusNote"      TEXT,
  "actorId"         TEXT REFERENCES "agent_users"("id"),
  "decidedAt"       TIMESTAMP,
  "expiresAt"       TIMESTAMP,
  "executionResult" JSONB,
  "executionError"  TEXT,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_decisions_org_status" ON "agent_decisions"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "agent_decisions_client_status" ON "agent_decisions"("clientId", "status");

-- ── LLM Usage Ledger ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_llm_usage" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "agent_organizations"("id") ON DELETE CASCADE,
  "tier"           "LLMTier" NOT NULL,
  "model"          TEXT NOT NULL,
  "inputTokens"    INTEGER NOT NULL,
  "outputTokens"   INTEGER NOT NULL,
  "totalTokens"    INTEGER NOT NULL,
  "costCents"      INTEGER NOT NULL,
  "purpose"        TEXT,
  "conversationId" TEXT,
  "skillName"      TEXT,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_llm_usage_org_created" ON "agent_llm_usage"("organizationId", "createdAt");

-- ── Audit Log ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_audit_logs" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "agent_organizations"("id") ON DELETE CASCADE,
  "userId"         TEXT REFERENCES "agent_users"("id"),
  "action"         TEXT NOT NULL,
  "entityType"     TEXT,
  "entityId"       TEXT,
  "oldValue"       JSONB,
  "newValue"       JSONB,
  "ipAddress"      TEXT,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_audit_logs_org_action" ON "agent_audit_logs"("organizationId", "action");
CREATE INDEX IF NOT EXISTS "agent_audit_logs_created" ON "agent_audit_logs"("createdAt");
