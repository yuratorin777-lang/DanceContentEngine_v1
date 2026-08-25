import fs from "fs/promises";
import path from "path";

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

function isVercelRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV
  );
}

export async function saveWeeklyContentPlan(
  params: {
    projectRoot: string;
    task: string;
    profile: string;
    requestedChannels: string[];
    plan: WeeklyContentPlan;
  }
): Promise<{
  id: string;
  path: string;
  relativePath: string;
}> {
  const id = buildWeeklyPlanId();

  const storedPlan = {
    id,
    createdAt: new Date().toISOString(),
    task: params.task,
    profile: params.profile,
    requestedChannels: params.requestedChannels,
    plan: {
      ...params.plan,
      planId: params.plan.planId || id,
    },
  };

  /*
   * Vercel:
   * /var/task is read-only.
   *
   * Do not attempt filesystem persistence here.
   * The generated plan is still returned to the API caller.
   *
   * Persistent storage will be connected separately.
   */
  if (isVercelRuntime()) {
    return {
      id,
      path: "",
      relativePath: "",
    };
  }

  /*
   * Local development:
   * preserve existing filesystem storage.
   */
  const plansDir = path.join(
    params.projectRoot,
    "04_CONTENT",
    "plans",
    "weekly"
  );

  await fs.mkdir(plansDir, {
    recursive: true,
  });

  const filePath = path.join(
    plansDir,
    `${id}.json`
  );

  await fs.writeFile(
    filePath,
    JSON.stringify(
      storedPlan,
      null,
      2
    ),
    "utf8"
  );

  return {
    id,
    path: filePath,
    relativePath: path.relative(
      params.projectRoot,
      filePath
    ),
  };
}