import { router } from "../trpc";
import { conversationsRouter } from "./conversations.router";
import { memoryRouter } from "./memory.router";
import { decisionsRouter } from "./decisions.router";
import { skillsRouter } from "./skills.router";
import { onboardingRouter } from "./onboarding.router";
import { usageRouter } from "./usage.router";
import { notificationsRouter } from "./notifications.router";
import { teamRouter } from "./team.router";

export const appRouter = router({
  conversations: conversationsRouter,
  memory: memoryRouter,
  decisions: decisionsRouter,
  skills: skillsRouter,
  onboarding: onboardingRouter,
  usage: usageRouter,
  notifications: notificationsRouter,
  team: teamRouter,
});

export type AppRouter = typeof appRouter;
