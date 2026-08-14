import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ==================================================
 * PROJECT ROOT
 * ==================================================
 */

const PROJECT_ROOT = path.resolve(process.cwd(), "../..");

/*
 * ==================================================
 * GROK CONFIGURATION
 * ==================================================
 */

const GROK_API_KEY =
  process.env.GROK_API_KEY ||
  process.env.XAI_API_KEY ||
  "";

/*
 * ==================================================
 * CONTEXT LIMITS
 * ==================================================
 */

const MAX_FILE_SIZE = 300_000;
const MAX_TOTAL_CONTEXT = 1_500_000;

/*
 * ==================================================
 * PROJECT DOMAINS
 * ==================================================
 */

const INCLUDED_DOMAINS = new Set([
  "00_SYSTEM",
  "01_KNOWLEDGE",
  "02_RESEARCH",
  "03_AUDIENCE",
  "04_CONTENT",
  "05_SEO",
  "06_ANALYTICS",
  "07_AUTOMATION",
  "08_INPUT",
]);

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "dist",
  "build",
  "coverage",
]);

/*
 * ==================================================
 * ALLOWED FILE TYPES
 * ==================================================
 */

const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".json",
  ".txt",
]);

/*
 * ==================================================
 * TYPES
 * ==================================================
 */

type ContextFile = {
  path: string;
  content: string;
  priority: number;
};

type ContextProfile =
  | "CONTENT"
  | "RESEARCH"
  | "ANALYTICS"
  | "GENERAL";

type AIRequest = {
  task?: string;
  mode?: string;
  profile?: ContextProfile;
  paths?: string[];
  includeRadar?: boolean;
};

/*
 * ==================================================
 * PATH SAFETY
 * ==================================================
 */

function safeProjectPath(
  relativePath: string
): string | null {
  const normalized = relativePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const absolute = path.resolve(
    PROJECT_ROOT,
    normalized
  );

  if (
    absolute !== PROJECT_ROOT &&
    !absolute.startsWith(
      PROJECT_ROOT + path.sep
    )
  ) {
    return null;
  }

  return absolute;
}

async function pathExists(
  target: string
): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/*
 * ==================================================
 * CONTEXT FILTER
 * ==================================================
 */

function shouldExclude(
  name: string
): boolean {
  return EXCLUDED_DIRS.has(name);
}

function isAllowedProjectPath(
  relativePath: string
): boolean {
  const normalized =
    relativePath.replace(/\\/g, "/");

  const firstSegment =
    normalized.split("/")[0];

  return INCLUDED_DOMAINS.has(
    firstSegment
  );
}

function isRadarHistoryPath(
  relativePath: string
): boolean {
  const normalized =
    relativePath.replace(/\\/g, "/");

  return normalized.includes(
    "07_AUTOMATION/Rardar_world feed/runtime/history/"
  );
}

/*
 * ==================================================
 * PRIORITY
 * ==================================================
 */

function getPriority(
  relativePath: string
): number {
  const normalized =
    relativePath.replace(/\\/g, "/");

  if (
    normalized.endsWith("SYSTEM_INDEX.md") ||
    normalized.endsWith("CONTENT_INDEX.md") ||
    normalized.endsWith("ANALYTICS_INDEX.md") ||
    normalized.endsWith("AUDIENCE_INDEX.md") ||
    normalized.endsWith("SEO_INDEX.md") ||
    normalized.endsWith("KNOWLEDGE_INDEX.md") ||
    normalized.endsWith("RESEARCH_INDEX.md") ||
    normalized.endsWith("AUTOMATION_INDEX.md")
  ) {
    return 100;
  }

  if (
    normalized ===
    "07_AUTOMATION/Rardar_world feed/runtime/latest.json"
  ) {
    return 98;
  }

  if (
    normalized.startsWith(
      "00_SYSTEM/"
    )
  ) {
    return 95;
  }

  if (
    normalized.startsWith(
      "01_KNOWLEDGE/"
    )
  ) {
    return 90;
  }

  if (
    normalized.startsWith(
      "02_RESEARCH/"
    )
  ) {
    return 85;
  }

  if (
    normalized.startsWith(
      "03_AUDIENCE/"
    )
  ) {
    return 80;
  }

  if (
    normalized.startsWith(
      "04_CONTENT/"
    )
  ) {
    return 75;
  }

  if (
    normalized.startsWith(
      "05_SEO/"
    )
  ) {
    return 70;
  }

  if (
    normalized.startsWith(
      "06_ANALYTICS/"
    )
  ) {
    return 65;
  }

  if (
    normalized.startsWith(
      "07_AUTOMATION/"
    )
  ) {
    return 60;
  }

  if (
    normalized.startsWith(
      "08_INPUT/"
    )
  ) {
    return 55;
  }

  return 30;
}

/*
 * ==================================================
 * PROFILE PRIORITY
 * ==================================================
 */

function getProfileBoost(
  relativePath: string,
  profile: ContextProfile
): number {
  const normalized =
    relativePath.replace(/\\/g, "/");

  switch (profile) {
    case "CONTENT": {
      if (
        normalized.startsWith("04_CONTENT/")
      ) {
        return 40;
      }

      if (
        normalized.startsWith("03_AUDIENCE/")
      ) {
        return 30;
      }

      if (
        normalized.startsWith("02_RESEARCH/")
      ) {
        return 25;
      }

      if (
        normalized.startsWith("01_KNOWLEDGE/")
      ) {
        return 20;
      }

      if (
        normalized.startsWith("05_SEO/")
      ) {
        return 15;
      }

      if (
        normalized.startsWith("07_AUTOMATION/")
      ) {
        return 10;
      }

      return 0;
    }

    case "RESEARCH": {
      if (
        normalized.startsWith("02_RESEARCH/")
      ) {
        return 40;
      }

      if (
        normalized.startsWith("01_KNOWLEDGE/")
      ) {
        return 30;
      }

      if (
        normalized.startsWith("03_AUDIENCE/")
      ) {
        return 20;
      }

      if (
        normalized.startsWith("07_AUTOMATION/")
      ) {
        return 15;
      }

      return 0;
    }

    case "ANALYTICS": {
      if (
        normalized.startsWith("06_ANALYTICS/")
      ) {
        return 40;
      }

      if (
        normalized.startsWith("02_RESEARCH/")
      ) {
        return 25;
      }

      if (
        normalized.startsWith("03_AUDIENCE/")
      ) {
        return 20;
      }

      if (
        normalized.startsWith("07_AUTOMATION/")
      ) {
        return 15;
      }

      return 0;
    }

    case "GENERAL":
    default:
      return 0;
  }
}

/*
 * ==================================================
 * FILE ELIGIBILITY
 * ==================================================
 */

function isEligibleFile(
  relativePath: string,
  fileName: string
): boolean {
  const normalized =
    relativePath.replace(/\\/g, "/");

  if (
    !isAllowedProjectPath(
      normalized
    )
  ) {
    return false;
  }

  if (
    isRadarHistoryPath(
      normalized
    )
  ) {
    return false;
  }

  const extension =
    path
      .extname(fileName)
      .toLowerCase();

  if (
    !ALLOWED_EXTENSIONS.has(
      extension
    )
  ) {
    return false;
  }

  return true;
}

/*
 * ==================================================
 * PROJECT SCANNER
 * ==================================================
 */

async function collectFiles(
  currentDir: string,
  relativeDir = ""
): Promise<ContextFile[]> {
  const result: ContextFile[] = [];

  let entries;

  try {
    entries = await fs.readdir(
      currentDir,
      {
        withFileTypes: true,
      }
    );
  } catch {
    return result;
  }

  for (const entry of entries) {
    if (
      shouldExclude(
        entry.name
      )
    ) {
      continue;
    }

    const absolutePath =
      path.join(
        currentDir,
        entry.name
      );

    const relativePath =
      path
        .join(
          relativeDir,
          entry.name
        )
        .replace(
          /\\/g,
          "/"
        );

    if (
      relativeDir === "" &&
      entry.isDirectory() &&
      !INCLUDED_DOMAINS.has(
        entry.name
      )
    ) {
      continue;
    }

    if (
      entry.isDirectory() &&
      relativePath ===
        "07_AUTOMATION/Rardar_world feed/runtime/history"
    ) {
      continue;
    }

    if (
      entry.isDirectory()
    ) {
      const nested =
        await collectFiles(
          absolutePath,
          relativePath
        );

      result.push(
        ...nested
      );

      continue;
    }

    if (
      !entry.isFile()
    ) {
      continue;
    }

    if (
      !isEligibleFile(
        relativePath,
        entry.name
      )
    ) {
      continue;
    }

    try {
      const stat =
        await fs.stat(
          absolutePath
        );

      if (
        stat.size >
        MAX_FILE_SIZE
      ) {
        continue;
      }

      const content =
        await fs.readFile(
          absolutePath,
          "utf8"
        );

      result.push({
        path:
          relativePath,

        content,

        priority:
          getPriority(
            relativePath
          ),
      });
    } catch {
      continue;
    }
  }

  return result;
}

/*
 * ==================================================
 * REQUESTED PATHS
 * ==================================================
 */

async function readRequestedPaths(
  requestedPaths: string[]
): Promise<ContextFile[]> {
  const result: ContextFile[] = [];

  for (
    const relativePath of
    requestedPaths
  ) {
    const normalized =
      relativePath.replace(
        /\\/g,
        "/"
      );

    if (
      !isAllowedProjectPath(
        normalized
      )
    ) {
      continue;
    }

    if (
      isRadarHistoryPath(
        normalized
      )
    ) {
      continue;
    }

    const absolutePath =
      safeProjectPath(
        normalized
      );

    if (
      !absolutePath
    ) {
      continue;
    }

    if (
      !(await pathExists(
        absolutePath
      ))
    ) {
      continue;
    }

    try {
      const stat =
        await fs.stat(
          absolutePath
        );

      if (
        stat.isDirectory()
      ) {
        const nested =
          await collectFiles(
            absolutePath,
            normalized
          );

        result.push(
          ...nested
        );

        continue;
      }

      if (
        !stat.isFile()
      ) {
        continue;
      }

      if (
        !isEligibleFile(
          normalized,
          path.basename(
            normalized
          )
        )
      ) {
        continue;
      }

      if (
        stat.size >
        MAX_FILE_SIZE
      ) {
        continue;
      }

      const content =
        await fs.readFile(
          absolutePath,
          "utf8"
        );

      result.push({
        path:
          normalized,

        content,

        priority:
          getPriority(
            normalized
          ),
      });
    } catch {
      continue;
    }
  }

  return result;
}

/*
 * ==================================================
 * RADAR
 * ==================================================
 */

async function readLatestRadar():
  Promise<ContextFile | null> {
  const radarPath =
    path.join(
      PROJECT_ROOT,
      "07_AUTOMATION",
      "Rardar_world feed",
      "runtime",
      "latest.json"
    );

  if (
    !(await pathExists(
      radarPath
    ))
  ) {
    return null;
  }

  try {
    const stat =
      await fs.stat(
        radarPath
      );

    if (
      stat.size >
      MAX_FILE_SIZE
    ) {
      return null;
    }

    const content =
      await fs.readFile(
        radarPath,
        "utf8"
      );

    return {
      path:
        "07_AUTOMATION/Rardar_world feed/runtime/latest.json",

      content,

      priority: 98,
    };
  } catch {
    return null;
  }
}

/*
 * ==================================================
 * CONTEXT BUILDER
 * ==================================================
 */

async function buildContext(
  requestedPaths: string[],
  includeRadar: boolean,
  profile: ContextProfile
): Promise<ContextFile[]> {
  let files: ContextFile[];

  if (
    requestedPaths.length > 0
  ) {
    files =
      await readRequestedPaths(
        requestedPaths
      );
  } else {
    files =
      await collectFiles(
        PROJECT_ROOT
      );
  }

  if (
    includeRadar
  ) {
    const radar =
      await readLatestRadar();

    if (radar) {
      files.push(
        radar
      );
    }
  }

  const unique =
    new Map<
      string,
      ContextFile
    >();

  for (
    const file of files
  ) {
    const existing =
      unique.get(
        file.path
      );

    if (
      !existing ||
      file.priority >
        existing.priority
    ) {
      unique.set(
        file.path,
        file
      );
    }
  }

  files =
    Array.from(
      unique.values()
    );

  files.sort(
    (a, b) => {
      const scoreA =
        a.priority +
        getProfileBoost(
          a.path,
          profile
        );

      const scoreB =
        b.priority +
        getProfileBoost(
          b.path,
          profile
        );

      return scoreB - scoreA;
    }
  );

  const selected: ContextFile[] =
    [];

  let totalSize = 0;

  for (
    const file of files
  ) {
    const blockSize =
      file.content.length;

    if (
      totalSize +
        blockSize >
      MAX_TOTAL_CONTEXT
    ) {
      continue;
    }

    selected.push(
      file
    );

    totalSize +=
      blockSize;
  }

  return selected;
}

/*
 * ==================================================
 * SYSTEM PROMPT
 * ==================================================
 */

function buildSystemPrompt(
  profile: ContextProfile
): string {
  return `
You are the AI execution layer of DanceContentEngine_v1.

You are an executor working inside an existing project methodology.

CONTEXT PROFILE:
${profile}

Read the supplied project context before acting.

CORE PRINCIPLES:

1. Respect the existing project architecture.
2. Do not invent facts, prices, schedules, events, achievements or business results.
3. Distinguish FACT, INFERENCE, HYPOTHESIS and RECOMMENDATION when relevant.
4. Preserve source information.
5. Treat 01_KNOWLEDGE as expert knowledge.
6. Treat 02_RESEARCH as research evidence.
7. Treat 02_RESEARCH/Аналитик as research produced by the AI Analyst.
8. Treat 03_AUDIENCE as audience information.
9. Treat 04_CONTENT as content methodology and rules.
10. Treat 05_SEO as SEO methodology and search rules.
11. Treat 06_ANALYTICS as measurement information.
12. Treat RADAR data as external signals, not automatically verified truth.
13. If information is missing, say so.
14. Do not silently rewrite the methodology.
15. Do not create new architecture unless explicitly requested.
16. Use multiple relevant sources when creating content.
17. Avoid repetitive, generic and template-like content.
18. When creating content, combine different relevant types of project material.
19. Recommendations must be based on available evidence.
20. Never claim that an action has happened unless the supplied context confirms it.

PROFILE BEHAVIOR:

CONTENT
- Prefer a broad mixture of CONTENT, AUDIENCE, RESEARCH, KNOWLEDGE and SEO material.
- Use RADAR as a source of current external signals when available.
- Do not build content from a single document.
- Seek interesting combinations of different evidence and ideas.
- Avoid formulaic repetition.

RESEARCH
- Prefer RESEARCH and KNOWLEDGE.
- Use AUDIENCE and RADAR when relevant.
- Focus on evidence, findings, gaps and contradictions.

ANALYTICS
- Prefer ANALYTICS.
- Use RESEARCH, AUDIENCE and AUTOMATION when useful.
- Focus on measurements, patterns, anomalies and conclusions supported by data.

GENERAL
- Use the broad project context.
- Select the most relevant available information for the task.

GENERAL DATA FLOW:

INPUT
→ processing
→ Knowledge / Research
→ Content Plan
→ Draft
→ Validation
→ Approved
→ Published
→ Analytics
→ feedback into Research / Audience / Knowledge

ROLES:

ANALYST
Researches and structures evidence.

RADAR
Collects external signals.

EDITOR
Structures knowledge and controls quality.

WRITER
Creates content.

SEO ENGINE
Works with search demand.

ANALYTICS
Measures results.

The LLM executes these roles according to the task.
It does not own the system.

When creating content, prefer useful, specific, varied and evidence-based material over generic templates.
`;
}

/*
 * ==================================================
 * CONTEXT FORMATTER
 * ==================================================
 */

function formatContext(
  files: ContextFile[]
): string {
  if (
    !files.length
  ) {
    return `
NO PROJECT DOCUMENTS WERE LOADED.

Do not invent project-specific information.
State that the required context is missing.
`;
  }

  return files
    .map(
      file => `
==================================================
SOURCE: ${file.path}
==================================================

${file.content}

==================================================
END SOURCE: ${file.path}
==================================================
`
    )
    .join("\n");
}

/*
 * ==================================================
 * USER PROMPT
 * ==================================================
 */

function buildUserPrompt(
  task: string,
  profile: ContextProfile,
  files: ContextFile[]
): string {
  return `
CONTEXT PROFILE:

${profile}

USER TASK:

${task}

PROJECT CONTEXT:

${formatContext(
  files
)}

EXECUTION RULES:

- Base project-specific conclusions on supplied documents.
- Do not invent missing information.
- If several documents disagree, identify the conflict.
- Keep source paths when they matter.
- If something is an inference, label it INFERENCE.
- If something is unverified, label it HYPOTHESIS.
- If a recommendation is made, label it RECOMMENDATION.
- Use multiple relevant project materials.
- Do not rely on one source when broader context is available.
- Avoid generic repetitive output.
- Produce a useful operational result.
`;
}

/*
 * ==================================================
 * GROQ / LLAMA AI CALL
 * ==================================================
 */

async function callAI(
  systemPrompt: string,
  userPrompt: string
) {
  const apiKey =
    process.env.GROQ_API_KEY || "";

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured."
    );
  }

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      30000
    );

  try {
    const response =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",

          signal:
            controller.signal,

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${apiKey}`,
          },

          body:
            JSON.stringify({
              model:
                "llama-3.3-70b-versatile",

              messages: [
                {
                  role:
                    "system",

                  content:
                    systemPrompt,
                },

                {
                  role:
                    "user",

                  content:
                    userPrompt,
                },
              ],

              max_tokens:
                300,

              temperature:
                0.7,
            }),
        }
      );

    const raw =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `Groq API error ${response.status}: ${raw.slice(
          0,
          1000
        )}`
      );
    }

    let data;

    try {
      data =
        JSON.parse(raw);
    } catch {
      throw new Error(
        "Groq API returned invalid JSON."
      );
    }

    const content =
      data?.choices?.[0]?.message
        ?.content;

    if (
      typeof content !==
        "string" ||
      !content.trim()
    ) {
      throw new Error(
        "Groq API returned no message content."
      );
    }

    return {
      content,

      model:
        data?.model ||
        "llama-3.3-70b-versatile",

      usage:
        data?.usage ||
        null,
    };
  } finally {
    clearTimeout(
      timeoutId
    );
  }
}

export async function GET() {
  const key = process.env.GROQ_API_KEY || "";

  return NextResponse.json({
    ok: true,
    service: "DanceContentEngine AI Gateway",
    status: "ready",

    provider: "Groq",

    model: "llama-3.3-70b-versatile",

    env: {
      keyExists: Boolean(key),
      keyLength: key.length,
      keyPrefix: key ? key.slice(0, 8) : "",
    },

    projectRoot: "DanceContentEngine_v1",

    profiles: [
      "CONTENT",
      "RESEARCH",
      "ANALYTICS",
      "GENERAL",
    ],
  });
}

/*
 * ==================================================
 * POST
 * ==================================================
 */

export async function POST(
  request: NextRequest
) {
  const started =
    Date.now();

  try {
    const body =
      (await request.json()) as AIRequest;

    const task =
      typeof body.task ===
      "string"
        ? body.task.trim()
        : "";

    const requestedPaths =
      Array.isArray(
        body.paths
      )
        ? body.paths.filter(
            item =>
              typeof item ===
              "string"
          )
        : [];

    const includeRadar =
      body.includeRadar !==
      false;

    const profile: ContextProfile =
      body.profile ===
        "CONTENT" ||
      body.profile ===
        "RESEARCH" ||
      body.profile ===
        "ANALYTICS"
        ? body.profile
        : "GENERAL";

    if (!task) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Task is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==================================================
     * BUILD PROJECT CONTEXT
     * ==================================================
     */

    const files =
      await buildContext(
        requestedPaths,
        includeRadar,
        profile
      );

    /*
     * ==================================================
     * BUILD PROMPTS
     * ==================================================
     */

    const systemPrompt =
      buildSystemPrompt(
        profile
      );

    const userPrompt =
      buildUserPrompt(
        task,
        profile,
        files
      );

    /*
     * ==================================================
     * CALL GROQ / LLAMA
     * ==================================================
     */

    const ai =
      await callAI(
        systemPrompt,
        userPrompt
      );

    /*
     * ==================================================
     * RESPONSE
     * ==================================================
     */

    return NextResponse.json({
      ok: true,

      result:
        ai.content,

      meta: {
        profile,

        model:
          ai.model,

        provider:
          "Groq / Llama",

        filesLoaded:
          files.length,

        sources:
          files.map(
            file =>
              file.path
          ),

        radarIncluded:
          includeRadar,

        contextCharacters:
          files.reduce(
            (
              sum,
              file
            ) =>
              sum +
              file.content.length,
            0
          ),

        durationMs:
          Date.now() -
          started,

        usage:
          ai.usage,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "AI GATEWAY ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Unknown AI gateway error.",
      },
      {
        status: 500,
      }
    );
  }
}