import { NextRequest, NextResponse } from "next/server";

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

import {
  buildRetrievalPackage,
} from "../../../../../../07_AUTOMATION/knowledge-retrieval/retriever";

import {
  detectWriterOutputContract,
  buildWriterSystemPrompt,
  buildWriterUserPrompt,
} from "../../../../../../07_AUTOMATION/writer";

import {
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  parseContentPlan,
  formatContentPlanForWriter,
  CONTENT_PLAN_SCHEMA,
} from "../../../../../../07_AUTOMATION/content-planner";

import {
  validateWriterOutput,
} from "../../../../../../07_AUTOMATION/validator";

import {
  buildWeeklyPlannerSystemPrompt,
  buildWeeklyPlannerUserPrompt,
  parseWeeklyContentPlan,
  WEEKLY_CONTENT_PLAN_SCHEMA,
} from "../../../../../../07_AUTOMATION/content-planner/weekly-plan";

import {
  saveWeeklyContentPlan,
} from "../../../../../../07_AUTOMATION/content-planner/weekly-plan-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ==================================================
 * PROJECT ROOT DETECTION
 * ==================================================
 */

function resolveProjectRoot(): string {
  const cwd = process.cwd();

  const twoUp = path.resolve(cwd, "../..");

  if (
    fsSync.existsSync(
      path.join(twoUp, "00_SYSTEM")
    )
  ) {
    return twoUp;
  }

  const oneUp = path.resolve(cwd, "..");

  if (
    fsSync.existsSync(
      path.join(oneUp, "00_SYSTEM")
    )
  ) {
    return oneUp;
  }

  return cwd;
}

const PROJECT_ROOT =
  resolveProjectRoot();

/*
 * ==================================================
 * CONTENT STRATEGY CONTEXT
 * ==================================================
 */

const STRATEGY_FILES = [
  "04_CONTENT/CONTENT_CHANNEL_ARCHITECTURE.md",
  "04_CONTENT/CONTENT_STRATEGY.md",
  "04_CONTENT/CHANNEL_STRATEGY.md",
];

async function loadStrategyContext(): Promise<string> {
  const blocks: string[] = [];

  for (
    const relativePath of STRATEGY_FILES
  ) {
    const absolutePath =
      path.join(
        PROJECT_ROOT,
        relativePath
      );

    try {
      const content =
        await fs.readFile(
          absolutePath,
          "utf8"
        );

      blocks.push(`
==================================================
STRATEGIC DOCUMENT: ${relativePath}
==================================================

${content}

==================================================
END STRATEGIC DOCUMENT: ${relativePath}
==================================================
`);
    } catch (error) {
      console.warn(
        `STRATEGY DOCUMENT NOT LOADED: ${relativePath}`,
        error
      );
    }
  }

  if (!blocks.length) {
    return `
NO CONTENT STRATEGY DOCUMENTS WERE LOADED.

Planner must rely on available analytical evidence
and must not invent strategic rules.
`;
  }

  return blocks.join("\n");
}

/*
 * ==================================================
 * RETRIEVAL LIMITS
 * ==================================================
 */

const RETRIEVAL_MAX_CHARACTERS =
  180_000;

const RETRIEVAL_MAX_SOURCES =
  30;

/*
 * ==================================================
 * ANALYST EVIDENCE LIMITS
 * ==================================================
 *
 * Analyst evidence is separate from Retriever.
 *
 * Planner receives this layer as mandatory evidence.
 */

const ANALYST_MAX_CHARACTERS =
  90_000;

/*
 * ==================================================
 * TYPES
 * ==================================================
 */

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
  channel?: string;
  channels?: string[];
};

type RetrievalItem = {
  path?: string;
  type?: string;
  title?: string;
  purpose?: string;
  fileName?: string;
  sourceRole?: string;
  keywords?: string[];
  radarMetadata?:
    Record<string, unknown> | null;
};

type RetrievalCandidate = {
  item: RetrievalItem;
  role?: string;
  size?: number;
  relevance?: number;
  reasons?: string[];
};

type RetrievalPackage = {
  generatedAt: string;
  limits: {
    maxCharacters: number;
    maxSources: number;
  };
  composition:
    Record<string, number>;
  selected:
    RetrievalCandidate[];
};

type ContextBuildResult = {
  filesLoaded: number;
  contextCharacters: number;
  sources: string[];
  context: string;
};

/*
 * ==================================================
 * PATH SAFETY
 * ==================================================
 */

function safeProjectPath(
  relativePath: string
): string | null {
  const normalized =
    relativePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

  /*
   * Radar virtual references are never
   * directly materialized as files.
   */
  if (
    normalized.includes("#signal-")
  ) {
    return null;
  }

  const absolute =
    path.resolve(
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

/*
 * ==================================================
 * RETRIEVAL SEED
 * ==================================================
 */

function buildRetrievalSeed(
  task: string,
  profile: ContextProfile,
  requestedPaths: string[]
) {
  const defaultPriorities: Record<
    ContextProfile,
    string[]
  > = {
    CONTENT: [
      "01_KNOWLEDGE",
      "03_AUDIENCE",
      "02_RESEARCH",
      "04_CONTENT",
      "05_SEO",
      "08_INPUT",
    ],

    RESEARCH: [
      "02_RESEARCH",
      "01_KNOWLEDGE",
      "03_AUDIENCE",
      "04_CONTENT",
      "05_SEO",
      "08_INPUT",
    ],

    ANALYTICS: [
      "06_ANALYTICS",
      "02_RESEARCH",
      "03_AUDIENCE",
      "01_KNOWLEDGE",
      "04_CONTENT",
      "05_SEO",
      "08_INPUT",
    ],

    GENERAL: [
      "01_KNOWLEDGE",
      "02_RESEARCH",
      "03_AUDIENCE",
      "04_CONTENT",
      "05_SEO",
      "06_ANALYTICS",
      "08_INPUT",
    ],
  };

  return {
    audience: "",

    topic:
      task,

    subtopic:
      profile,

    goal:
      task,

    audienceNeed: "",

    keyMessage:
      task,

    contentAngle:
      task,

    researchSignals: [],

    knowledgeNeeds: [
      "реальный опыт",
      "экспертные знания",
      "актуальные исследования",
      "аудитория",
    ],

    radarSignals: [
      task,
    ],

    seoConsiderations: [],

    constraints: [
      "Не придумывать факты, которых нет в библиотеке проекта.",
    ],

    sourcePriorities: [
      ...requestedPaths,
      ...defaultPriorities[profile],
    ],
  };
}

/*
 * ==================================================
 * READ RETRIEVED SOURCE
 * ==================================================
 */

async function readSelectedItemContent(
  candidate: RetrievalCandidate
): Promise<string> {
  const item =
    candidate.item;

  if (!item) {
    return "";
  }

  /*
   * Radar virtual source.
   */
  if (
    item.type === "radar_signal"
  ) {
    const metadata =
      item.radarMetadata
        ? `\nRADAR METADATA:\n${JSON.stringify(
            item.radarMetadata,
            null,
            2
          )}`
        : "";

    return [
      item.title,
      item.purpose,
      ...(item.keywords || []),
      metadata,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const relativePath =
    String(
      item.path || ""
    );

  const absolutePath =
    safeProjectPath(
      relativePath
    );

  if (!absolutePath) {
    return [
      item.title,
      item.purpose,
      ...(item.keywords || []),
    ]
      .filter(Boolean)
      .join("\n");
  }

  try {
    const stat =
      await fs.stat(
        absolutePath
      );

    if (!stat.isFile()) {
      return [
        item.title,
        item.purpose,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (
      stat.size >
      1_500_000
    ) {
      return [
        item.title,
        item.purpose,
      ]
        .filter(Boolean)
        .join("\n");
    }

    return await fs.readFile(
      absolutePath,
      "utf8"
    );
  } catch {
    return [
      item.title,
      item.purpose,
      ...(item.keywords || []),
    ]
      .filter(Boolean)
      .join("\n");
  }
}

/*
 * ==================================================
 * BUILD FULL RETRIEVED CONTEXT
 * ==================================================
 *
 * This context is for Writer.
 *
 * It remains broad and diverse.
 */

async function buildRetrievedContext(
  retrievalPackage: RetrievalPackage,
  includeRadar: boolean
): Promise<ContextBuildResult> {
  const selected =
    includeRadar
      ? retrievalPackage.selected
      : retrievalPackage.selected.filter(
          candidate =>
            candidate.item?.type !==
            "radar_signal"
        );

  const blocks: string[] = [];
  const sources: string[] = [];

  let totalCharacters = 0;

  for (
    const candidate of selected
  ) {
    const item =
      candidate.item;

    if (!item) {
      continue;
    }

    if (
      !includeRadar &&
      item.type ===
        "radar_signal"
    ) {
      continue;
    }

    const content =
      await readSelectedItemContent(
        candidate
      );

    if (
      !content.trim()
    ) {
      continue;
    }

    const pathLabel =
      String(
        item.path ||
          item.title ||
          "unknown-source"
      );

    const role =
      String(
        candidate.role ||
          item.sourceRole ||
          item.type ||
          "source"
      );

    const block = `
==================================================
SOURCE: ${pathLabel}
ROLE: ${role}
==================================================

${content}

==================================================
END SOURCE: ${pathLabel}
==================================================
`;

    const nextCharacters =
      totalCharacters +
      block.length;

    if (
      nextCharacters >
      RETRIEVAL_MAX_CHARACTERS
    ) {
      continue;
    }

    blocks.push(block);
    sources.push(pathLabel);

    totalCharacters =
      nextCharacters;
  }

  return {
    filesLoaded:
      sources.length,

    contextCharacters:
      totalCharacters,

    sources,

    context:
      blocks.length
        ? blocks.join("\n")
        : `
NO RETRIEVED PROJECT DOCUMENTS WERE LOADED.

Do not invent project-specific information.
State that the required context is missing.
`,
  };
}

/*
 * ==================================================
 * ANALYST EVIDENCE
 * ==================================================
 *
 * IMPORTANT ARCHITECTURE:
 *
 * Planner does NOT depend on the generic 30-source
 * Retriever package for Analyst evidence.
 *
 * Analyst output is a persistent research layer
 * stored in:
 *
 * 02_RESEARCH/Аналитик
 *
 * This function reads that layer directly.
 *
 * Planner therefore has a deterministic analytical
 * basis independent of the broad Writer retrieval.
 */

async function collectMarkdownFiles(
  directory: string
): Promise<string[]> {
  const result: string[] = [];

  let entries: fsSync.Dirent[];

  try {
    entries =
      await fs.readdir(
        directory,
        {
          withFileTypes: true,
        }
      );
  } catch {
    return result;
  }

  for (
    const entry of entries
  ) {
    const fullPath =
      path.join(
        directory,
        entry.name
      );

    if (
      entry.isDirectory()
    ) {
      const nested =
        await collectMarkdownFiles(
          fullPath
        );

      result.push(
        ...nested
      );

      continue;
    }

    if (
      entry.isFile() &&
      entry.name
        .toLowerCase()
        .endsWith(".md")
    ) {
      result.push(fullPath);
    }
  }

  return result;
}

function isAnalystDocument(
  filePath: string
): boolean {
  const normalized =
    filePath
      .replace(/\\/g, "/")
      .toLowerCase();

  return (
    normalized.includes(
      "/02_research/аналитик/"
    ) ||
    normalized.includes(
      "/02_research/analyst/"
    )
  );
}

async function buildAnalystEvidenceContext(): Promise<
  ContextBuildResult
> {
  const analystDirectories = [
    path.join(
      PROJECT_ROOT,
      "02_RESEARCH",
      "Аналитик"
    ),

    path.join(
      PROJECT_ROOT,
      "02_RESEARCH",
      "Analyst"
    ),
  ];

  const files: string[] = [];

  for (
    const directory of analystDirectories
  ) {
    const found =
      await collectMarkdownFiles(
        directory
      );

    files.push(
      ...found
    );
  }

  /*
   * Deduplicate paths.
   */
  const uniqueFiles =
    Array.from(
      new Set(files)
    );

  /*
   * Deterministic ordering.
   */
  uniqueFiles.sort(
    (a, b) =>
      a.localeCompare(
        b,
        "ru"
      )
  );

  const blocks: string[] = [];
  const sources: string[] = [];

  let totalCharacters = 0;

  for (
    const absolutePath of uniqueFiles
  ) {
    /*
     * Safety: only Analyst documents.
     */
    if (
      !isAnalystDocument(
        absolutePath
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
        !stat.isFile()
      ) {
        continue;
      }

      if (
        stat.size >
        1_500_000
      ) {
        continue;
      }

      const content =
        await fs.readFile(
          absolutePath,
          "utf8"
        );

      if (
        !content.trim()
      ) {
        continue;
      }

      const relativePath =
        path.relative(
          PROJECT_ROOT,
          absolutePath
        ).replace(
          /\\/g,
          "/"
        );

      const block = `
==================================================
ANALYST EVIDENCE SOURCE: ${relativePath}
ROLE: analyst_primary
==================================================

${content}

==================================================
END ANALYST EVIDENCE SOURCE: ${relativePath}
==================================================
`;

      const nextCharacters =
        totalCharacters +
        block.length;

      if (
        nextCharacters >
        ANALYST_MAX_CHARACTERS
      ) {
        continue;
      }

      blocks.push(block);
      sources.push(relativePath);

      totalCharacters =
        nextCharacters;
    } catch (error) {
      console.warn(
        "ANALYST DOCUMENT READ FAILED:",
        absolutePath,
        error
      );
    }
  }

  return {
    filesLoaded:
      sources.length,

    contextCharacters:
      totalCharacters,

    sources,

    context:
      blocks.length
        ? blocks.join("\n")
        : `
NO ANALYST EVIDENCE WAS LOADED.

The Content Planner MUST NOT invent:
- audience findings;
- market findings;
- competitor findings;
- search demand;
- content opportunities;
- local market conclusions;
- analytical conclusions.

The Content Plan cannot be safely created
without the Analyst evidence layer.
`,
  };
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

Read the supplied context before acting.

CORE PRINCIPLES:

1. Respect the existing project architecture.

2. Do not invent facts, prices, schedules, events,
   achievements or business results.

3. Distinguish FACT, INFERENCE, HYPOTHESIS
   and RECOMMENDATION when relevant.

4. Preserve source information.

5. Treat 01_KNOWLEDGE as expert knowledge
   and owner experience.

6. Treat 02_RESEARCH as research evidence.

7. Treat 02_RESEARCH/Аналитик as research
   produced by the AI Analyst.

8. Treat 03_AUDIENCE as audience information.

9. Treat 04_CONTENT as content methodology
   and rules.

10. Treat 05_SEO as SEO methodology
    and search rules.

11. Treat 06_ANALYTICS as measurement
    information.

12. Treat RADAR data as external signals,
    not automatically verified truth.

13. If information is missing, say so.

14. Do not silently rewrite the methodology.

15. Do not create new architecture unless
    explicitly requested.

16. Use multiple relevant sources when
    creating content.

17. Avoid repetitive, generic and
    template-like content.

18. When creating content, combine different
    relevant types of project material.

19. Recommendations must be based on
    available evidence.

20. Never claim that an action has happened
    unless the supplied context confirms it.

21. The retrieved context is a bounded selection
    from the full project library; do not assume
    it is the whole library.

CONTENT PLANNER ARCHITECTURE:

The Content Planner creates the strategic
Content Plan.

The Content Plan MUST be based primarily
on the AI Analyst evidence layer.

The Writer then uses the Content Plan together
with the wider retrieved project library.

Therefore:

ANALYST EVIDENCE
→ CONTENT PLANNER
→ CONTENT PLAN
→ WRITER
→ VALIDATOR

The Planner does not replace Analyst findings
with generic model knowledge.

The Writer does not replace the Content Plan.

PROFILE BEHAVIOR:

CONTENT
- use the Analyst evidence as the strategic
  evidence base for the Content Plan;
- use broad project knowledge only later,
  during Writer execution;
- use Radar only when relevant.

RESEARCH
- prioritize research evidence;
- focus on findings, gaps, contradictions
  and evidence.

ANALYTICS
- prioritize analytics;
- use research and audience information
  when relevant.

GENERAL
- use the most relevant supplied context.

GENERAL DATA FLOW:

INPUT
→ Librarian
→ Retriever
→ Analyst Evidence
→ Content Plan
→ Draft
→ Validation
→ Approved
→ Published
→ Analytics
→ feedback into Research / Audience / Knowledge

ROLES:

LIBRARIAN
Maintains the factual map of the information library.

RETRIEVER
Builds a bounded and diverse context package
for content production.

ANALYST
Researches and structures evidence.

RADAR
Collects external signals.

EDITOR
Structures knowledge and controls quality.

CONTENT PLANNER
Converts Analyst evidence into a strategic
Content Plan.

WRITER
Creates the final content using the Content Plan
and wider project context.

SEO ENGINE
Works with search demand.

ANALYTICS
Measures results.

The LLM executes these roles according
to the task.

It does not own the system.

When creating content, prefer useful, specific,
varied and evidence-based material over
generic templates.
`;
}

/*
 * ==================================================
 * CONTEXT FORMATTER
 * ==================================================
 */

function formatContext(
  context: string
): string {
  return context;
}

/*
 * ==================================================
 * GEMINI
 * ==================================================
 */

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  "";

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 2000,
  options: {
    responseMimeType?: string;
    responseSchema?: unknown;
  } = {}
) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured in environment variables."
    );
  }

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () =>
        controller.abort(),
      60000
    );

  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response =
      await fetch(
        url,
        {
          method: "POST",
          signal:
            controller.signal,
          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text:
                      systemPrompt,
                  },
                ],
              },

              contents: [
                {
                  role: "user",

                  parts: [
                    {
                      text:
                        userPrompt,
                    },
                  ],
                },
              ],

              generationConfig: {
                temperature: 0.7,

                maxOutputTokens,

                ...(options.responseMimeType
                  ? {
                      responseMimeType:
                        options.responseMimeType,
                    }
                  : {}),

                ...(options.responseSchema
                  ? {
                      responseSchema:
                        options.responseSchema,
                    }
                  : {}),
              },
            }),
        }
      );

    const raw =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `Gemini API error ${response.status}: ${raw.slice(
          0,
          1000
        )}`
      );
    }

    let data: any;

    try {
      data =
        JSON.parse(raw);
    } catch {
      throw new Error(
        "Gemini API returned invalid JSON."
      );
    }

    const content =
      data?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;

    if (
      typeof content !==
        "string" ||
      !content.trim()
    ) {
      throw new Error(
        "Gemini API returned no message content."
      );
    }

    return {
      content,

      model:
        "gemini-2.5-flash",

      usage:
        data?.usageMetadata ||
        null,

      finishReason:
        data?.candidates?.[0]
          ?.finishReason ||
        null,
    };
  } finally {
    clearTimeout(
      timeoutId
    );
  }
}

/*
 * ==================================================
 * GET
 * ==================================================
 */

export async function GET() {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({
      ok: false,
      error:
        "GEMINI_API_KEY is missing",
    });
  }

  try {
    const res =
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
      );

    const data =
      await res.json();

    const availableModels =
      data?.models
        ? data.models.map(
            (m: any) =>
              m.name.replace(
                "models/",
                ""
              )
          )
        : [];

    return NextResponse.json({
      ok: true,

      service:
        "DanceContentEngine AI Gateway",

      provider:
        "Google Gemini",

      keyExists:
        true,

      availableModels,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,

      error:
        err?.message ||
        "Failed to fetch models from Google",
    });
  }
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
    let body: AIRequest;

    try {
      body =
        (await request.json()) as AIRequest;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid or empty JSON body in request.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ------------------------------------------------
     * REQUEST
     * ------------------------------------------------
     */

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

    const requestedChannel =
  typeof body.channel ===
  "string"
    ? body.channel.trim()
    : "";

const requestedChannels =
  Array.isArray(body.channels)
    ? body.channels.filter(
        item =>
          typeof item === "string" &&
          item.trim() !== ""
      ).map(
        item => item.trim()
      )
    : [];

const weeklyChannels =
  requestedChannels.length > 0
    ? requestedChannels
    : requestedChannel
      ? [requestedChannel]
      : [
          "VK",
          "Telegram",
          "Website / SEO",
        ];

const includeRadar =
  body.includeRadar !==
  false;

    const profile:
      ContextProfile =
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
     * ------------------------------------------------
     * LIBRARIAN → RETRIEVER
     * ------------------------------------------------
     */

    const retrievalSeed =
      buildRetrievalSeed(
        task,
        profile,
        requestedPaths
      );

    const retrievalPackage =
      await buildRetrievalPackage(
        PROJECT_ROOT,
        retrievalSeed,
        {
          maxCharacters:
            RETRIEVAL_MAX_CHARACTERS,

          maxSources:
            RETRIEVAL_MAX_SOURCES,
        }
      ) as RetrievalPackage;

    /*
     * FULL LIBRARY CONTEXT
     *
     * This will be used by Writer.
     */

    const retrieved =
      await buildRetrievedContext(
        retrievalPackage,
        includeRadar
      );

    /*
     * ------------------------------------------------
     * ANALYST EVIDENCE
     * ------------------------------------------------
     *
     * IMPORTANT:
     * This is intentionally independent
     * from the generic Retriever package.
     */

    const analystContext =
      await buildAnalystEvidenceContext();

    /*
     * Planner must not operate without
     * the Analyst layer.
     */

    if (
      analystContext.filesLoaded === 0
    ) {
      console.error(
        "CONTENT PLANNER BLOCKED: NO ANALYST EVIDENCE"
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Content Planner requires Analyst Evidence, but no Analyst documents were found in 02_RESEARCH/Аналитик.",

          meta: {
            analystEvidence:
              analystContext,

            retrieval: {
              composition:
                retrievalPackage.composition,

              selected:
                retrievalPackage.selected.map(
                  candidate => ({
                    path:
                      candidate.item?.path ||
                      candidate.item?.title ||
                      "",

                    role:
                      candidate.role ||
                      candidate.item
                        ?.sourceRole ||
                      candidate.item
                        ?.type ||
                      "source",
                  })
                ),
            },
          },
        },
        {
          status: 422,
        }
      );
    }

/*
     * ------------------------------------------------
     * CONTENT STRATEGY
     * ------------------------------------------------
     */

    const strategyContext =
      await loadStrategyContext();

      /*
     * ------------------------------------------------
     * WEEKLY CONTENT PLAN
     * ------------------------------------------------
     */

    if (
      body.mode === "WEEKLY_PLAN"
    ) {
      const weeklyPlanner =
        await callAI(
          buildWeeklyPlannerSystemPrompt(),

          buildWeeklyPlannerUserPrompt({
            task,

            profile,

            analystContext:
              analystContext.context,

            strategyContext,

            requestedChannels:
              weeklyChannels,

            periodDays: 7,
          }),

          8000,

          {
            responseMimeType:
              "application/json",

            responseSchema:
              WEEKLY_CONTENT_PLAN_SCHEMA,
          }
        );

      const weeklyPlan =
  parseWeeklyContentPlan(
    weeklyPlanner.content
  );

if (
  weeklyPlan.items.length === 0
) {
  throw new Error(
    "WEEKLY CONTENT PLANNER ERROR: Gemini returned a valid JSON Weekly Content Plan, but items array is empty."
  );
}

      const storedWeeklyPlan =
        await saveWeeklyContentPlan({
          projectRoot:
            PROJECT_ROOT,

          task,

          profile,

          requestedChannels:
            weeklyChannels,

          plan:
            weeklyPlan,
        });

      return NextResponse.json({
        ok: true,

        mode:
          "WEEKLY_PLAN",

        weeklyContentPlan:
          weeklyPlan,

        storedWeeklyPlan,

        meta: {
          profile,

          requestedChannels:
            weeklyChannels,

          analystEvidence: {
            filesLoaded:
              analystContext.filesLoaded,

            contextCharacters:
              analystContext.contextCharacters,

            sources:
              analystContext.sources,
          },

          strategyDocuments:
            STRATEGY_FILES,

          plannerModel:
            weeklyPlanner.model,

          plannerUsage:
            weeklyPlanner.usage,

          durationMs:
            Date.now() -
            started,
        },
      });
    }

    /*
     * ------------------------------------------------
     * OUTPUT CONTRACT
     * ------------------------------------------------
     */

    const outputContract =
      detectWriterOutputContract(
        task
      );

    /*
     * ------------------------------------------------
     * CONTENT PLANNER
     * ------------------------------------------------
     *
     * CRITICAL:
     *
     * Planner receives:
     * 1. Analyst Evidence
     * 2. Strategy
     *
     * Planner DOES NOT receive
     * the full Writer library context.
     * ------------------------------------------------
     */

    const plannerUserPrompt =
  buildPlannerUserPrompt({
    task,
    profile,
    context: "",
    analystContext:
      analystContext.context,
    strategyContext,
    requestedChannel,
  });

if (
  !plannerUserPrompt.includes(
    "ANALYST EVIDENCE"
  )
) {
  throw new Error(
    "CONTENT PLANNER HANDOFF ERROR: Analyst Evidence was not included in Planner prompt."
  );
}

const planner =
  await callAI(
    buildPlannerSystemPrompt(),
    plannerUserPrompt,
    6000,
    {
      responseMimeType:
        "application/json",
      responseSchema:
        CONTENT_PLAN_SCHEMA,
    }
  );

    const contentPlan =
  parseContentPlan(
    planner.content
  );

if (
  !contentPlan ||
  !contentPlan.topic ||
  !contentPlan.channel
) {
  throw new Error(
    "CONTENT PLANNER HANDOFF ERROR: Planner returned an incomplete Content Plan."
  );
}

    /*
     * ------------------------------------------------
     * CHANNEL SAFETY CHECK
     * ------------------------------------------------
     */

    if (
      requestedChannel &&
      contentPlan.channel !==
        requestedChannel
    ) {
      console.warn(
        "PLANNER CHANNEL OVERRIDE:",
        {
          requestedChannel,

          plannerChannel:
            contentPlan.channel,
        }
      );

      contentPlan.channel =
        requestedChannel;

      contentPlan.constraints =
        [
          ...contentPlan.constraints,

          `Explicit channel requirement: ${requestedChannel}. Planner output was normalized to the requested channel.`,
        ];
    }

    const plannerBrief =
  formatContentPlanForWriter(
    contentPlan
  );

if (
  !plannerBrief.trim()
) {
  throw new Error(
    "WRITER HANDOFF ERROR: Content Plan Brief is empty."
  );
}

if (
  !plannerBrief.includes(
    contentPlan.channel
  )
) {
  throw new Error(
    "WRITER HANDOFF ERROR: Content Plan channel is missing from Writer Brief."
  );
}

    /*
     * ------------------------------------------------
     * WRITER
     * ------------------------------------------------
     *
     * Writer receives:
     *
     * Content Plan
     * +
     * full retrieved project context
     */

    const writerSystemPrompt =
      buildWriterSystemPrompt(
        outputContract
      );

    const systemPrompt =
      `${buildSystemPrompt(
        profile
      )}

==================================================
CONTENT PLANNER EXECUTION LAYER
==================================================

The Content Planner has already converted
the Analyst Evidence into a strategic
Content Plan.

The selected PRIMARY CHANNEL is authoritative.

The Writer MUST follow the PRIMARY CHANNEL
specified in the Content Planner Brief.

Do not silently move the content to another channel.

The Writer must adapt tone, depth, structure,
CTA and presentation to the selected channel.

The Content Plan is the strategic instruction.

The retrieved project context is the broad
factual and knowledge layer used to execute
the Content Plan.

Do not replace the Content Plan with generic
model assumptions.

==================================================
CONTENT PLANNER BRIEF
==================================================

${plannerBrief}

==================================================
WRITER EXECUTION LAYER
==================================================

${writerSystemPrompt}
`;

    const writerUserPrompt =
  buildWriterUserPrompt({
    task,
    profile,
    context:
      `${plannerBrief}
==================================================
RETRIEVED PROJECT CONTEXT
==================================================
${formatContext(
  retrieved.context
)}`,
    outputContract,
  });

    const ai =
      await callAI(
        systemPrompt,
        writerUserPrompt,
        4000
      );

    /*
     * ------------------------------------------------
     * VALIDATOR
     * ------------------------------------------------
     */

    const validationContext = `
==================================================
CONTENT PLAN
==================================================
${plannerBrief}

==================================================
ANALYST EVIDENCE
==================================================
${analystContext.context}

==================================================
RETRIEVED PROJECT CONTEXT
==================================================
${retrieved.context}
`;

const validation =
  await validateWriterOutput({
    task,
    outputContract,
    content:
      ai.content,
    context:
      validationContext,
    projectRoot:
      PROJECT_ROOT,
  });

    /*
     * ------------------------------------------------
     * RESPONSE
     * ------------------------------------------------
     */

    return NextResponse.json({
      ok: true,

      result:
        ai.content,

      meta: {
        profile,

        requestedChannel:
          requestedChannel ||
          null,

        outputContract,

        /*
         * Final strategic Content Plan.
         */
        contentPlan,

        /*
         * Exact Analyst evidence used
         * to build the plan.
         */
        analystEvidence: {
          filesLoaded:
            analystContext.filesLoaded,

          contextCharacters:
            analystContext.contextCharacters,

          sources:
            analystContext.sources,
        },

        strategyDocuments:
          STRATEGY_FILES,

        plannerModel:
          planner.model,

        model:
          ai.model,

        provider:
          "Google Gemini",

        /*
         * Broad Writer context.
         */
        filesLoaded:
          retrieved.filesLoaded,

        sources:
          retrieved.sources,

        radarIncluded:
          includeRadar,

        contextCharacters:
          retrieved.contextCharacters,

        retrieval: {
          limits:
            retrievalPackage.limits,

          composition:
            retrievalPackage.composition,

          selected:
            retrievalPackage.selected.map(
              candidate => ({
                path:
                  candidate.item?.path ||
                  candidate.item?.title ||
                  "",

                role:
                  candidate.role ||
                  candidate.item
                    ?.sourceRole ||
                  candidate.item
                    ?.type ||
                  "source",

                relevance:
                  candidate.relevance ??
                  null,

                size:
                  candidate.size ??
                  null,

                reasons:
                  candidate.reasons ||
                  [],
              })
            ),
        },

        durationMs:
          Date.now() -
          started,

        plannerUsage:
          planner.usage,

        usage:
          ai.usage,

        writerFinishReason:
          ai.finishReason,

        validation: {
          status:
            validation.status,

          score:
            validation.score,

          summary:
            validation.summary,

          violations:
            validation.violations,

          rulesLoaded:
            validation.rulesLoaded,
        },
      },
    });
  } catch (error) {
    console.error(
      "AI GATEWAY ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown AI gateway error.",
      },
      {
        status: 500,
      }
    );
  }
}