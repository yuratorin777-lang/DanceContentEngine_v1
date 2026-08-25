import fs from "fs/promises";
import path from "path";

export type StoredContentPlan = {
  id: string;
  createdAt: string;
  task: string;
  profile: string;
  requestedChannel: string;
  plan: unknown;
};

function buildPlanId(): string {
  const now = new Date();

  const stamp =
    now.toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "")
      .replace("T", "-");

  const random =
    Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase();

  return `CP-${stamp}-${random}`;
}

export async function saveContentPlan(params: {
  projectRoot: string;
  task: string;
  profile: string;
  requestedChannel?: string;
  plan: unknown;
}): Promise<{
  id: string;
  path: string;
  relativePath: string;
}> {
  const plansDir = path.join(
    params.projectRoot,
    "04_CONTENT",
    "plans"
  );

  await fs.mkdir(plansDir, {
    recursive: true,
  });

  const id = buildPlanId();

  const stored: StoredContentPlan = {
    id,
    createdAt: new Date().toISOString(),
    task: params.task,
    profile: params.profile,
    requestedChannel:
      params.requestedChannel || "",
    plan: params.plan,
  };

  const filePath = path.join(
    plansDir,
    `${id}.json`
  );

  await fs.writeFile(
    filePath,
    JSON.stringify(
      stored,
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
