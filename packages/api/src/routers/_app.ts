import { router } from "../trpc";
import { conversationsRouter } from "./conversations.router";
import { memoryRouter } from "./memory.router";
import { decisionsRouter } from "./decisions.router";
import { skillsRouter } from "./skills.router";
import { onboardingRouter } from "./onboarding.router";

export const appRouter = router({
  conversations: conversationsRouter,
  memory: memoryRouter,
  decisions: decisionsRouter,
  skills: skillsRouter,
  onboarding: onboardingRouter,
});

export type AppRouter = typeof appRouter;
