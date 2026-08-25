export type WeeklyContentItem = {
  id: string;
  day: number;
  channel: string;

  audience: string;
  topic: string;
  subtopic: string;
  goal: string;

  decisionStage: string;
  contentJob: string;
  contentRole: string;

  format: string;
  repurposingPotential: string;

  rationale: string;
  analystBasis: string[];

  priority: string;
  status: string;
};

export type WeeklyContentPlan = {
  planId: string;
  periodDays: number;
  audience: string;

  strategicObjective: string;

  channels: string[];

  analystBasis: string[];

  items: WeeklyContentItem[];
};

export const WEEKLY_CONTENT_PLAN_SCHEMA = {
  type: "OBJECT",

  properties: {
    planId: {
      type: "STRING",
    },

    periodDays: {
      type: "INTEGER",
    },

    audience: {
      type: "STRING",
    },

    strategicObjective: {
      type: "STRING",
    },

    channels: {
      type: "ARRAY",
      items: {
        type: "STRING",
      },
    },

    analystBasis: {
      type: "ARRAY",
      items: {
        type: "STRING",
      },
    },

    items: {
      type: "ARRAY",

      items: {
        type: "OBJECT",

        properties: {
          id: {
            type: "STRING",
          },

          day: {
            type: "INTEGER",
          },

          channel: {
            type: "STRING",
          },

          audience: {
            type: "STRING",
          },

          topic: {
            type: "STRING",
          },

          subtopic: {
            type: "STRING",
          },

          goal: {
            type: "STRING",
          },

          decisionStage: {
            type: "STRING",
          },

          contentJob: {
            type: "STRING",
          },

          contentRole: {
            type: "STRING",
          },

          format: {
            type: "STRING",
          },

          repurposingPotential: {
            type: "STRING",
          },

          rationale: {
            type: "STRING",
          },

          analystBasis: {
            type: "ARRAY",
            items: {
              type: "STRING",
            },
          },

          priority: {
            type: "STRING",
          },

          status: {
            type: "STRING",
          },
        },

        required: [
          "id",
          "day",
          "channel",
          "audience",
          "topic",
          "subtopic",
          "goal",
          "decisionStage",
          "contentJob",
          "contentRole",
          "format",
          "repurposingPotential",
          "rationale",
          "analystBasis",
          "priority",
          "status",
        ],
      },
    },
  },

  required: [
    "planId",
    "periodDays",
    "audience",
    "strategicObjective",
    "channels",
    "analystBasis",
    "items",
  ],

  propertyOrdering: [
    "planId",
    "periodDays",
    "audience",
    "strategicObjective",
    "channels",
    "analystBasis",
    "items",
  ],
};

function normalizeWeeklyItem(
  value: unknown
): WeeklyContentItem {
  const input =
    value &&
    typeof value === "object"
      ? value as Record<string, unknown>
      : {};

  const stringField =
    (key: string): string =>
      typeof input[key] === "string"
        ? String(input[key])
        : "";

  const arrayField =
    (key: string): string[] =>
      Array.isArray(input[key])
        ? input[key].filter(
            item =>
              typeof item === "string"
          )
        : [];

  return {
    id: stringField("id"),

    day:
      typeof input.day === "number"
        ? input.day
        : 0,

    channel:
      stringField("channel"),

    audience:
      stringField("audience"),

    topic:
      stringField("topic"),

    subtopic:
      stringField("subtopic"),

    goal:
      stringField("goal"),

    decisionStage:
      stringField("decisionStage"),

    contentJob:
      stringField("contentJob"),

    contentRole:
      stringField("contentRole"),

    format:
      stringField("format"),

    repurposingPotential:
      stringField(
        "repurposingPotential"
      ),

    rationale:
      stringField("rationale"),

    analystBasis:
      arrayField("analystBasis"),

    priority:
      stringField("priority"),

    status:
      stringField("status"),
  };
}

function normalizeWeeklyPlan(
  value: unknown
): WeeklyContentPlan {
  const input =
    value &&
    typeof value === "object"
      ? value as Record<string, unknown>
      : {};

  const channels =
    Array.isArray(input.channels)
      ? input.channels.filter(
          item =>
            typeof item === "string"
        )
      : [];

  const analystBasis =
    Array.isArray(input.analystBasis)
      ? input.analystBasis.filter(
          item =>
            typeof item === "string"
        )
      : [];

  const items =
    Array.isArray(input.items)
      ? input.items.map(
          normalizeWeeklyItem
        )
      : [];

  return {
    planId:
      typeof input.planId === "string"
        ? input.planId
        : "",

    periodDays:
      typeof input.periodDays === "number"
        ? input.periodDays
        : 7,

    audience:
      typeof input.audience === "string"
        ? input.audience
        : "",

    strategicObjective:
      typeof input.strategicObjective ===
      "string"
        ? input.strategicObjective
        : "",

    channels,

    analystBasis,

    items,
  };
}

export function parseWeeklyContentPlan(
  raw: string
): WeeklyContentPlan {
  const text = raw.trim();

  if (!text) {
    throw new Error(
      "WEEKLY CONTENT PLANNER ERROR: Gemini returned an empty response."
    );
  }

  try {
    return normalizeWeeklyPlan(
      JSON.parse(text)
    );
  } catch {
    // continue
  }

  const fenced =
    text.match(
      /```(?:json)?\s*([\s\S]*?)\s*```/i
    );

  if (fenced?.[1]) {
    try {
      return normalizeWeeklyPlan(
        JSON.parse(
          fenced[1]
        )
      );
    } catch {
      // continue
    }
  }

  const start =
    text.indexOf("{");

  const end =
    text.lastIndexOf("}");

  if (
    start >= 0 &&
    end > start
  ) {
    try {
      return normalizeWeeklyPlan(
        JSON.parse(
          text.slice(
            start,
            end + 1
          )
        )
      );
    } catch {
      // continue
    }
  }

  throw new Error(
    `WEEKLY CONTENT PLANNER ERROR: Unable to parse Gemini response as JSON. Raw response: ${text.slice(
      0,
      2000
    )}`
  );
}

export function buildWeeklyPlannerSystemPrompt(): string {
  return `
You are the WEEKLY CONTENT PLANNER of DanceContentEngine_v1.

Your task is NOT to write content.

Your task is to convert the AI Analyst research layer into
a strategic content plan for a defined period.

==================================================
ARCHITECTURE
==================================================

ANALYST
→ WEEKLY CONTENT PLAN
→ CONTENT PLANNER
→ CONTENT PLAN
→ WRITER
→ VALIDATOR

The Weekly Content Plan is a strategic calendar.

It defines WHAT should be created during the period.

It does NOT write the posts or articles.

==================================================
PRIMARY EVIDENCE
==================================================

The Analyst Evidence is the PRIMARY source.

Use it to identify:

- audience needs;
- parent questions;
- decision journey;
- market context;
- competitor context;
- search demand;
- content opportunities;
- local context;
- strategic conclusions.

Do not invent content opportunities from generic model knowledge.

If Analyst evidence does not support an idea,
do not manufacture one.

Each weekly item must have analystBasis pointing
to the analytical evidence that justifies it.

==================================================
STRATEGIC LAYER
==================================================

Use the supplied Content Strategy and Channel Strategy
to determine:

- content jobs;
- decision stages;
- content roles;
- channel behavior;
- format;
- content mix;
- repurposing logic.

Do not redesign the project architecture.

==================================================
CHANNEL RULES
==================================================

Each requested channel must receive content that is
native to that channel.

VK:
- social engagement;
- discussion;
- community;
- events;
- visible school life;
- owner position;
- concise or medium depth.

Telegram:
- deeper relationship;
- practical advice;
- expert commentary;
- personal reflections;
- collections;
- useful direct communication.

Website / SEO:
- durable information;
- search intent;
- decision support;
- guides;
- comparisons;
- FAQ;
- evergreen content.

Do not duplicate the same content idea across all channels
unless meaningful adaptation is strategically justified.

==================================================
WEEKLY MIX
==================================================

Build a coherent 7-day plan.

Default target:

- 7 days;
- every requested channel should appear;
- distribute ideas according to audience need
  and strategic role;
- avoid repeating the same topic mechanically;
- balance discovery, problem-solving, authority,
  trust, progression and relationship content;
- use Analyst opportunities as the foundation.

Do not force equal quantities if the strategy indicates
a different distribution.

==================================================
ITEM DESIGN
==================================================

Every item must define:

- day;
- channel;
- audience;
- topic;
- subtopic;
- goal;
- decisionStage;
- contentJob;
- contentRole;
- format;
- repurposingPotential;
- rationale;
- analystBasis;
- priority;
- status.

The status for newly planned items must be:

PLANNED

Priority must be one of:

HIGH
MEDIUM
LOW

==================================================
IMPORTANT
==================================================

The Weekly Content Plan is NOT the final Content Plan
for an individual article or post.

It is the parent planning layer.

A later Content Planner will take one Weekly Content Item
and create the detailed Content Plan for that specific piece.

Do not write the actual content.

Return ONLY JSON matching the supplied schema.
`;
}

export function buildWeeklyPlannerUserPrompt(params: {
  task: string;
  profile?: string;
  analystContext: string;
  strategyContext: string;
  requestedChannels: string[];
  periodDays?: number;
}): string {
  const periodDays =
    params.periodDays || 7;

  return `
WEEKLY CONTENT PLAN TASK

Profile:
${params.profile || "CONTENT"}

Requested period:
${periodDays} days

Requested channels:
${params.requestedChannels.join(", ")}

USER REQUEST:
${params.task}

==================================================
ANALYST EVIDENCE
==================================================

${params.analystContext}

==================================================
CONTENT STRATEGY
==================================================

${params.strategyContext}

==================================================
EXECUTION
==================================================

Build one strategic Weekly Content Plan.

The plan must:

1. cover the requested period;
2. cover the requested channels;
3. use Analyst Evidence as the primary basis;
4. connect ideas to the audience decision journey;
5. use the existing Content Strategy;
6. use the existing Channel Strategy;
7. avoid generic invented topics;
8. avoid writing final content;
9. identify the analytical basis for every item;
10. create a coherent sequence across the week.

The Weekly Content Plan must be a planning artifact,
not a finished post or article.

Return ONLY the JSON object.
`;
}