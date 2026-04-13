/**
 * Seed script for IsyAgent development
 * Creates an initial organization, user, and sample data
 *
 * Usage: npx tsx packages/db/prisma/seed.ts
 */

import { PrismaClient } from "../../../apps/web/generated/prisma";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding IsyAgent...\n");

  // ── 1. Create Organization ──────────────────────────────────────────────────
  const org = await db.organization.upsert({
    where: { slug: "mi-agencia" },
    update: {},
    create: {
      id: "org_seed_001",
      name: "Mi Agencia",
      slug: "mi-agencia",
      plan: "starter",
      llmMonthlyBudgetCents: 5000, // $50
    },
  });
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // ── 2. Create User ─────────────────────────────────────────────────────────
  const passwordHash = await hash("admin123", 12);

  const user = await db.user.upsert({
    where: { email: "admin@isyagent.dev" },
    update: { passwordHash },
    create: {
      id: "usr_seed_001",
      email: "admin@isyagent.dev",
      name: "Roberto Admin",
      passwordHash,
      emailVerified: new Date(),
    },
  });
  console.log(`✅ User: ${user.name} <${user.email}>`);

  // ── 3. Link User → Organization ────────────────────────────────────────────
  await db.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
    },
  });
  console.log(`✅ Role: OWNER in ${org.name}`);

  // ── 4. Create Sample Client ─────────────────────────────────────────────────
  const client = await db.client.upsert({
    where: { id: "cli_seed_001" },
    update: {},
    create: {
      id: "cli_seed_001",
      organizationId: org.id,
      name: "Cliente Demo",
      description: "Cliente de ejemplo para desarrollo",
    },
  });
  console.log(`✅ Client: ${client.name}`);

  // ── 5. Create Identity Memory Chunks ────────────────────────────────────────
  const identityChunks = [
    {
      id: "mem_seed_001",
      category: "identity",
      content: "Somos una agencia de marketing digital especializada en redes sociales y branding para PYMEs en Latinoamérica.",
      isEditable: true,
    },
    {
      id: "mem_seed_002",
      category: "tone",
      content: "Tono de comunicación: profesional pero cercano, evitar jerga técnica innecesaria, preferir español neutro.",
      isEditable: true,
    },
    {
      id: "mem_seed_003",
      category: "services",
      content: "Servicios principales: gestión de redes sociales, diseño gráfico, estrategia de contenido, pauta digital (Meta Ads, Google Ads).",
      isEditable: true,
    },
    {
      id: "mem_seed_004",
      category: "no-gos",
      content: "No trabajamos con: contenido político, MLM/esquemas piramidales, contenido para adultos.",
      isEditable: true,
    },
  ];

  for (const chunk of identityChunks) {
    await db.memoryChunk.upsert({
      where: { id: chunk.id },
      update: { content: chunk.content },
      create: {
        id: chunk.id,
        organizationId: org.id,
        level: "IDENTITY",
        category: chunk.category,
        content: chunk.content,
        isEditable: chunk.isEditable,
        embedding: [],
      },
    });
  }
  console.log(`✅ Memory: ${identityChunks.length} identity chunks`);

  // ── 6. Create Sample Decisions ──────────────────────────────────────────────
  const decisions = [
    {
      id: "dec_seed_001",
      title: "Crear tarea: Diseño de logo para Cliente Demo",
      description: "El agente quiere crear una tarea en IsyTask para diseñar el logo del Cliente Demo. Prioridad alta, asignada al equipo de diseño.",
      skillName: "createTask",
      skillInput: { title: "Diseño de logo", priority: "HIGH", clientId: client.id },
      urgency: 1,
    },
    {
      id: "dec_seed_002",
      title: "Publicar post: Bienvenida en Instagram",
      description: "El agente preparó un post de bienvenida para el Instagram del Cliente Demo. Texto: '¡Nuevo capítulo! 🚀 Estamos listos para compartir contenido increíble.'",
      skillName: "draftPost",
      skillInput: { network: "instagram", type: "feed", text: "¡Nuevo capítulo! 🚀" },
      urgency: 0,
    },
    {
      id: "dec_seed_003",
      title: "Responder DM urgente de @usuario_importante",
      description: "Un cliente potencial preguntó por precios. El agente sugiere responder con el catálogo de servicios estándar.",
      skillName: "replyDM",
      skillInput: { handle: "@usuario_importante", suggestedReply: "¡Hola! Gracias por tu interés..." },
      urgency: 2,
    },
  ];

  for (const dec of decisions) {
    await db.decision.upsert({
      where: { id: dec.id },
      update: {},
      create: {
        ...dec,
        organizationId: org.id,
        clientId: client.id,
        status: "PENDING",
      },
    });
  }
  console.log(`✅ Decisions: ${decisions.length} pending`);

  // ── 7. Skill Configs (defaults) ─────────────────────────────────────────────
  const skills = [
    { skillName: "createTask", autonomyLevel: "L1" as const },
    { skillName: "draftPost", autonomyLevel: "L1" as const },
    { skillName: "listDMs", autonomyLevel: "L2" as const },
    { skillName: "replyDM", autonomyLevel: "L1" as const },
    { skillName: "summarizeClient", autonomyLevel: "L2" as const },
  ];

  for (const skill of skills) {
    await db.skillConfig.upsert({
      where: {
        organizationId_skillName: {
          organizationId: org.id,
          skillName: skill.skillName,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        skillName: skill.skillName,
        autonomyLevel: skill.autonomyLevel,
      },
    });
  }
  console.log(`✅ Skills: ${skills.length} configured`);

  console.log("\n🎉 Seed complete!");
  console.log("   Login: admin@isyagent.dev / admin123\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
