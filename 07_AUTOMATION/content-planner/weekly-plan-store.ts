import type {
  WeeklyContentPlan,
} from "./weekly-plan";

function buildWeeklyPlanId(): string {
  const now = new Date();

  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "")
    .replace("T", "-");

  const random = Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase();

  return `WCP-${stamp}-${random}`;
}

export function buildWeeklyContentPlanResult(
  params: {
    task: string;
    profile: string;
    requestedChannels: string[];
    plan: WeeklyContentPlan;
  }
): {
  id: string;
  task: string;
  profile: string;
  requestedChannels: string[];
  plan: WeeklyContentPlan;
} {
  const id = buildWeeklyPlanId();

  return {
    id,
    task: params.task,
    profile: params.profile,
    requestedChannels: params.requestedChannels,
    plan: {
      ...params.plan,
      planId:
        params.plan.planId || id,
    },
  };
}