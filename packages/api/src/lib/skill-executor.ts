/**
 * Skill Executor — Cross-product action execution
 *
 * When a Decision is APPROVED, this module executes the actual skill
 * by inserting rows directly into IsyTask / IsySocial tables via raw SQL.
 *
 * All 3 products share the same Supabase PostgreSQL database:
 * - IsyTask tables: public schema (tasks, client_profiles, services, agencies)
 * - IsySocial tables: isysocial schema (iso_posts, iso_client_profiles, etc.)
 * - IsyAgent tables: public schema with agent_ prefix (agent_organizations, etc.)
 *
 * IsyTask enums: public."TaskCategory", public."TaskStatus"
 * IsySocial enums: isysocial."SocialNetwork", isysocial."PostType", isysocial."PostStatus"
 */

import { PrismaClient } from "../../../../apps/web/generated/prisma";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface SkillResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface CreateTaskInput {
  title: string;
  clientId?: string; // IsyAgent client ID — we resolve isytaskClientId
  description?: string;
  category?: "URGENTE" | "NORMAL" | "LARGO_PLAZO";
  estimatedHours?: number;
  revisionsLimit?: number;
  serviceId?: string; // If known, otherwise we pick first active service
  priority?: string; // Alias for category (HIGH → URGENTE)
}

interface DraftPostInput {
  clientId?: string; // IsyAgent client ID — we resolve isysocialClientId
  network?: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "TIKTOK" | "X";
  postType?: "IMAGE" | "CAROUSEL" | "STORY" | "REEL" | "VIDEO" | "TEXT";
  copy?: string;
  title?: string;
  hashtags?: string;
}

// ──────────────────────────────────────────────
// Main executor
// ──────────────────────────────────────────────

export async function executeSkill(
  db: PrismaClient,
  skillName: string,
  skillInput: Record<string, unknown>,
  context: {
    organizationId: string;
    decisionId: string;
    clientId?: string | null; // IsyAgent client ID from the decision
  }
): Promise<SkillResult> {
  try {
    switch (skillName) {
      case "createTask":
        return await executeCreateTask(db, skillInput as unknown as CreateTaskInput, context);

      case "draftPost":
        return await executeDraftPost(db, skillInput as unknown as DraftPostInput, context);

      default:
        return {
          success: false,
          error: `Skill "${skillName}" no tiene ejecutor implementado aún`,
        };
    }
  } catch (err: any) {
    console.error(`[SkillExecutor] Error executing ${skillName}:`, err);
    return {
      success: false,
      error: err.message || "Error desconocido al ejecutar skill",
    };
  }
}

// ──────────────────────────────────────────────
// createTask — Inserts into IsyTask's `tasks` table (public schema)
// ──────────────────────────────────────────────

async function executeCreateTask(
  db: PrismaClient,
  input: CreateTaskInput,
  context: { organizationId: string; decisionId: string; clientId?: string | null }
): Promise<SkillResult> {
  // 1. Resolve the IsyTask agency ID
  const org = await db.organization.findUnique({
    where: { id: context.organizationId },
    select: { isytaskAgencyId: true },
  });

  if (!org?.isytaskAgencyId) {
    return {
      success: false,
      error: "La organización no tiene vinculada una agencia en IsyTask. Configura isytaskAgencyId en Habilidades.",
    };
  }

  const agencyId = org.isytaskAgencyId;

  // 2. Resolve the IsyTask client ID (if decision has a client)
  let isytaskClientId: string | null = null;
  const agentClientId = input.clientId || context.clientId;

  if (agentClientId) {
    const client = await db.client.findUnique({
      where: { id: agentClientId },
      select: { isytaskClientId: true },
    });
    isytaskClientId = client?.isytaskClientId ?? null;
  }

  if (!isytaskClientId) {
    // Fallback: pick first task that belongs to this agency and get its clientId
    const fallback: any[] = await db.$queryRaw`
      SELECT DISTINCT "clientId" as id FROM "tasks" WHERE "agencyId" = ${agencyId} LIMIT 1
    `;
    if (fallback.length > 0) {
      isytaskClientId = fallback[0].id;
    } else {
      return {
        success: false,
        error: "No se encontró un cliente vinculado en IsyTask para ejecutar esta acción.",
      };
    }
  }

  // 3. Resolve a service ID (first active service for the agency)
  let serviceId = input.serviceId;
  if (!serviceId) {
    const services: any[] = await db.$queryRaw`
      SELECT id FROM "services" WHERE "agencyId" = ${agencyId} AND "isActive" = true LIMIT 1
    `;
    if (services.length > 0) {
      serviceId = services[0].id;
    } else {
      return {
        success: false,
        error: "No hay servicios activos en IsyTask. Crea al menos uno.",
      };
    }
  }

  // 4. Get next task number for this agency
  const maxTaskNum: any[] = await db.$queryRaw`
    SELECT COALESCE(MAX("taskNumber"), 0) + 1 as next_num FROM "tasks" WHERE "agencyId" = ${agencyId}
  `;
  const taskNumber = Number(maxTaskNum[0]?.next_num ?? 1);

  // 5. Resolve category
  const category = input.category || (input.priority === "HIGH" ? "URGENTE" : "NORMAL");

  // 6. Generate a cuid-like ID
  const taskId = `tsk_agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const title = input.title || "Tarea creada por IsyAgent";
  const description = input.description || `Tarea generada automáticamente por IsyAgent (Decisión: ${context.decisionId})`;
  const estimatedHours = input.estimatedHours ?? 2;
  const revisionsLimit = input.revisionsLimit ?? 3;

  // 7. Insert the task (public schema — enums are public."TaskCategory" / public."TaskStatus")
  await db.$executeRaw`
    INSERT INTO public."tasks" (
      "id", "taskNumber", "clientId", "serviceId", "agencyId",
      "title", "description", "category", "status",
      "estimatedHours", "revisionsLimit",
      "createdAt", "updatedAt"
    ) VALUES (
      ${taskId},
      ${taskNumber}::int,
      ${isytaskClientId},
      ${serviceId},
      ${agencyId},
      ${title},
      ${description},
      ${category}::"TaskCategory",
      'RECIBIDA'::"TaskStatus",
      ${estimatedHours}::int,
      ${revisionsLimit}::int,
      NOW(),
      NOW()
    )
  `;

  console.log(`[SkillExecutor] Created task ${taskId} (#${taskNumber}) in IsyTask`);

  return {
    success: true,
    data: {
      taskId,
      taskNumber,
      title,
      category,
      agencyId,
      clientId: isytaskClientId,
      serviceId,
    },
  };
}

// ──────────────────────────────────────────────
// draftPost — Inserts into IsySocial's `iso_posts` table (isysocial schema)
// ──────────────────────────────────────────────

async function executeDraftPost(
  db: PrismaClient,
  input: DraftPostInput,
  context: { organizationId: string; decisionId: string; clientId?: string | null }
): Promise<SkillResult> {
  // 1. Resolve the IsySocial agency ID
  const org = await db.organization.findUnique({
    where: { id: context.organizationId },
    select: { isysocialAgencyId: true },
  });

  if (!org?.isysocialAgencyId) {
    return {
      success: false,
      error: "La organización no tiene vinculada una agencia en IsySocial. Configura isysocialAgencyId en Habilidades.",
    };
  }

  const agencyId = org.isysocialAgencyId;

  // 2. Resolve the IsySocial client ID
  let isysocialClientId: string | null = null;
  const agentClientId = input.clientId || context.clientId;

  if (agentClientId) {
    const client = await db.client.findUnique({
      where: { id: agentClientId },
      select: { isysocialClientId: true },
    });
    isysocialClientId = client?.isysocialClientId ?? null;
  }

  if (!isysocialClientId) {
    // Fallback: first client in IsySocial for this agency
    const fallback: any[] = await db.$queryRaw`
      SELECT id FROM isysocial."iso_client_profiles" WHERE "agencyId" = ${agencyId} LIMIT 1
    `;
    if (fallback.length > 0) {
      isysocialClientId = fallback[0].id;
    } else {
      return {
        success: false,
        error: "No se encontró un cliente vinculado en IsySocial para ejecutar esta acción.",
      };
    }
  }

  // 3. Defaults
  const network = input.network || "INSTAGRAM";
  const postType = input.postType || "IMAGE";
  const postId = `pst_agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const title = input.title || "Post creado por IsyAgent";
  const copy = input.copy || "";
  const hashtags = input.hashtags || "";

  // 4. Insert the post as DRAFT (isysocial schema — enums are isysocial."SocialNetwork" etc.)
  await db.$executeRaw`
    INSERT INTO isysocial."iso_posts" (
      "id", "agencyId", "clientId", "network", "postType",
      "status", "title", "copy", "hashtags", "revisionsLimit",
      "createdAt", "updatedAt"
    ) VALUES (
      ${postId},
      ${agencyId},
      ${isysocialClientId},
      ${network}::isysocial."SocialNetwork",
      ${postType}::isysocial."PostType",
      'DRAFT'::isysocial."PostStatus",
      ${title},
      ${copy},
      ${hashtags},
      3,
      NOW(),
      NOW()
    )
  `;

  console.log(`[SkillExecutor] Created draft post ${postId} in IsySocial`);

  return {
    success: true,
    data: {
      postId,
      network,
      postType,
      title,
      copy,
      agencyId,
      clientId: isysocialClientId,
    },
  };
}
