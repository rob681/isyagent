/**
 * POST /api/auth/register
 *
 * Creates a new user + organization.
 * For invited users (with inviteToken), joins existing org instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { PrismaClient } from "@/generated/prisma";

const db = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, organizationName, inviteToken } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    // Check if user exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta con este email" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    if (inviteToken) {
      // Join existing organization via invite
      // Find the invite (stored as pending OrganizationUser with a token-like id)
      const invite = await db.organizationUser.findFirst({
        where: { id: inviteToken, userId: "" }, // placeholder userId means pending
      });

      if (!invite) {
        return NextResponse.json({ error: "Invitación no válida o expirada" }, { status: 404 });
      }

      // Create user and update invite
      const user = await db.user.create({
        data: {
          name,
          email,
          passwordHash,
          emailVerified: new Date(),
        },
      });

      await db.organizationUser.update({
        where: { id: invite.id },
        data: { userId: user.id },
      });

      return NextResponse.json({ success: true, userId: user.id, organizationId: invite.organizationId });
    } else {
      // Create new organization
      if (!organizationName) {
        return NextResponse.json({ error: "El nombre de la organización es requerido" }, { status: 400 });
      }

      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);

      // Check slug uniqueness
      const existingOrg = await db.organization.findUnique({ where: { slug } });
      if (existingOrg) {
        return NextResponse.json(
          { error: "Ya existe una organización con ese nombre" },
          { status: 409 }
        );
      }

      // Create user + org + membership in a transaction
      const result = await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            passwordHash,
            emailVerified: new Date(),
          },
        });

        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug,
            plan: "free",
            llmMonthlyBudgetCents: 1000, // $10 free tier
          },
        });

        await tx.organizationUser.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            role: "OWNER",
          },
        });

        // Create default skill configs
        const defaultSkills = ["createTask", "draftPost", "listDMs", "replyDM", "summarizeClient"];
        for (const skillName of defaultSkills) {
          await tx.skillConfig.create({
            data: {
              organizationId: org.id,
              skillName,
              autonomyLevel: "L1",
            },
          });
        }

        return { userId: user.id, organizationId: org.id };
      });

      return NextResponse.json({ success: true, ...result });
    }
  } catch (err: any) {
    console.error("[Register] Error:", err);
    return NextResponse.json(
      { error: err.message || "Error al crear cuenta" },
      { status: 500 }
    );
  }
}
