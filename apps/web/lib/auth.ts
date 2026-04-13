import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@isyagent/db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: {
            organizations: {
              include: { organization: true },
              take: 1,
            },
          },
        });

        if (!user || !user.passwordHash || !user.isActive) return null;

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        const orgUser = user.organizations[0];
        if (!orgUser) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          organizationId: orgUser.organizationId,
          organizationName: orgUser.organization.name,
          organizationPlan: orgUser.organization.plan,
          role: orgUser.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.organizationPlan = (user as any).organizationPlan;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).organizationName = token.organizationName;
        (session.user as any).organizationPlan = token.organizationPlan;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
