import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth";
import { appRouter, createTRPCContext } from "@isyagent/api";
import { authOptions } from "@/lib/auth";

const handler = async (req: Request) => {
  const session = await getServerSession(authOptions);

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        session: session?.user
          ? {
              user: {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.name!,
              },
              organizationId: session.user.organizationId,
              role: session.user.role,
            }
          : null,
      }),
  });
};

export { handler as GET, handler as POST };
