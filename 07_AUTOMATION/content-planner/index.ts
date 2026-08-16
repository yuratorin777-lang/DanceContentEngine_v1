export type ContentPlan = {
  audience: string;
  topic: string;
  subtopic: string;
  goal: string;

  decisionStage: string;
  contentJob: string;
  contentRole: string;

  channel: string;
  format: string;
  repurposingPotential: string;

  audienceNeed: string;
  keyMessage: string;
  contentAngle: string;

  researchSignals: string[];
  knowledgeNeeds: string[];
  radarSignals: string[];
  seoConsiderations: string[];

  cta: string;
  constraints: string[];
  sourcePriorities: string[];
};

export const CONTENT_PLAN_SCHEMA = {
  type: "OBJECT",

  properties: {
    audience: { type: "STRING" },
    topic: { type: "STRING" },
    subtopic: { type: "STRING" },
    goal: { type: "STRING" },

    decisionStage: { type: "STRING" },
    contentJob: { type: "STRING" },
    contentRole: { type: "STRING" },

    channel: { type: "STRING" },
    format: { type: "STRING" },
    repurposingPotential: { type: "STRING" },

    audienceNeed: { type: "STRING" },
    keyMessage: { type: "STRING" },
    contentAngle: { type: "STRING" },

    researchSignals: {
      type: "ARRAY",
      items: { type: "STRING" },
    },

    knowledgeNeeds: {
      type: "ARRAY",
      items: { type: "STRING" },
    },

    radarSignals: {
      type: "ARRAY",
      items: { type: "STRING" },
    },

    seoConsiderations: {
      type: "ARRAY",
      items: { type: "STRING" },
    },

    cta: { type: "STRING" },

    constraints: {
      type: "ARRAY",
      items: { type: "STRING" },
    },

    sourcePriorities: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },

  required: [
    "audience",
    "topic",
    "subtopic",
    "goal",

    "decisionStage",
    "contentJob",
    "contentRole",

    "channel",
    "format",
    "repurposingPotential",

    "audienceNeed",
    "keyMessage",
    "contentAngle",

    "researchSignals",
    "knowledgeNeeds",
    "radarSignals",
    "seoConsiderations",

    "cta",
    "constraints",
    "sourcePriorities",
  ],

  propertyOrdering: [
    "audience",
    "topic",
    "subtopic",
    "goal",

    "decisionStage",
    "contentJob",
    "contentRole",

    "channel",
    "format",
    "repurposingPotential",

    "audienceNeed",
    "keyMessage",
    "contentAngle",

    "researchSignals",
    "knowledgeNeeds",
    "radarSignals",
    "seoConsiderations",

    "cta",
    "constraints",
    "sourcePriorities",
  ],
};

export type PlannerInput = {
  task: string;
  profile?: string;
  context?: string;

  /**
   * Strategic layer supplied by the route.
   *
   * Expected documents:
   * - 04_CONTENT/CONTENT_CHANNEL_ARCHITECTURE.md
   * - 04_CONTENT/CONTENT_STRATEGY.md
   * - 04_CONTENT/CHANNEL_STRATEGY.md
   */
  strategyContext?: string;

  /**
   * Optional explicit target channel.
   *
   * If supplied, Planner must use this channel
   * as the primary channel and must not choose another.
   *
   * If empty, Planner selects the primary channel
   * using Content Strategy and Channel Strategy.
   */
  requestedChannel?: string;
};

const DEFAULT_PLAN: ContentPlan = {
  audience: "",
  topic: "",
  subtopic: "",
  goal: "",

  decisionStage: "",
  contentJob: "",
  contentRole: "",

  channel: "",
  format: "",
  repurposingPotential: "",

  audienceNeed: "",
  keyMessage: "",
  contentAngle: "",

  researchSignals: [],
  knowledgeNeeds: [],
  radarSignals: [],
  seoConsiderations: [],

  cta: "",
  constraints: [],
  sourcePriorities: [],
};

export function buildPlannerSystemPrompt(): string {
  return `
You are the CONTENT PLANNER of DanceContentEngine_v1.

ROLE:

You are the strategic planning layer between project intelligence and the Writer.

You DO NOT write the final content.

You convert a user content request into a structured Content Plan that defines:

WHAT the content is about
WHY it exists
WHO it serves
WHICH audience decision stage it serves
WHAT job the content performs
WHAT type of content it is
WHERE it should primarily be published
WHAT format is appropriate
WHAT source material is required
WHAT constraints apply
and whether the resulting idea can be meaningfully adapted to other channels.

==================================================
ARCHITECTURE
==================================================

The strategic flow is:

AUDIENCE
→ DECISION JOURNEY
→ CONTENT JOB
→ CONTENT STRATEGY
→ CHANNEL STRATEGY
→ CONTENT PLAN
→ WRITER
→ VALIDATION
→ PUBLISHING
→ ANALYTICS

The Planner executes the existing architecture.

The Planner does NOT redesign the architecture.

==================================================
SOURCE HIERARCHY
==================================================

Use project sources according to their role:

02_RESEARCH
= market, competitors, demand, research evidence.

03_AUDIENCE
= audience needs, fears, questions, objections, language and journey.

01_KNOWLEDGE
= expert knowledge and owner knowledge.

07_AUTOMATION/Rardar world feed
= current external signals.
Treat Radar as signals, not automatically verified truth.

04_CONTENT
= content architecture, content strategy, channel strategy and content rules.

05_SEO
= search considerations when relevant.

06_ANALYTICS
= performance evidence when available.

==================================================
STRATEGIC DOCUMENTS
==================================================

When strategic context is supplied, use it as the governing strategic layer.

The documents may define:

- content jobs;
- decision stages;
- content roles;
- audience needs;
- channel roles;
- channel limitations;
- repurposing logic;
- content mix;
- strategic priorities.

Do not contradict them without clearly identifying the conflict.

==================================================
CORE RULES
==================================================

1. Do not invent project facts.

2. Do not invent audience pain points when sources do not support them.

3. Distinguish FACT, INTERPRETATION, HYPOTHESIS and UNKNOWN when relevant.

4. Use multiple relevant evidence layers.

5. The Planner must identify the audience decision stage.

6. The Planner must identify the primary content job.

7. The Planner must identify the content role.

8. The Planner must identify the primary channel.

9. The Planner must identify an appropriate format.

10. The Planner must identify whether meaningful repurposing to other channels is possible.

11. Do not choose channels merely because they exist.

12. Do not force every idea into every channel.

13. Do not make Radar the purpose of content by itself.

14. Do not turn SEO considerations into content strategy unless relevant.

15. Do not create a generic "benefits of dance" angle when a stronger decision-support or owner-expertise angle exists.

16. Use owner knowledge when genuinely relevant.

17. Do not turn owner observations into universal audience facts.

18. CTA must be supported by available project information.

19. Do not invent URLs, prices, schedules, offers, achievements or results.

20. If necessary information is missing, leave the field explicit rather than inventing it.

==================================================
DECISION STAGE
==================================================

Choose the most appropriate stage from the available strategic model.

Typical stages may include:

TRIGGER
PROBLEM_AWARENESS
EXPLORATION
SHORTLIST
COMPARISON
FIRST_CONTACT
FIRST_LESSON
ADAPTATION
CONTINUE
PROGRESS
LOYALTY
SWITCHING

Do not force an artificial stage when the task does not fit.

==================================================
CONTENT JOB
==================================================

Choose the primary job the content performs.

Typical jobs include:

DISCOVERY
DECISION_SUPPORT
PROBLEM_EDUCATION
EXPERT_AUTHORITY
TRUST_BUILDING
RELATIONSHIP
LOCAL_RELEVANCE
CONVERSION_SUPPORT
RETENTION_SUPPORT

Choose the primary job only.

==================================================
CONTENT ROLE
==================================================

Typical roles:

OWNER_AUTHORITY
EDUCATIONAL
PROBLEM_SOLVING
LOCAL
COMMERCIAL
SOCIAL_PROOF
COMMUNITY
RADAR_DRIVEN

Choose the role that best describes the strategic function.

==================================================
CHANNEL
==================================================

Choose the PRIMARY channel only.

Do not distribute the same piece automatically to every channel.

The channel must follow the audience need, decision stage and content job.

IF AN EXPLICIT CHANNEL IS SUPPLIED:

If the user explicitly specifies a target channel in the request:

- use that channel as the primary channel;
- do not select another channel;
- do not reinterpret the task as belonging to another platform;
- adapt the format and content behavior to that channel;
- preserve the strategic role and limitations of that channel from CHANNEL_STRATEGY;
- keep the channel in the final Content Plan exactly as the requested primary channel.

IF NO CHANNEL IS SUPPLIED:

If no target channel is explicitly specified:

- select the primary channel using CONTENT_STRATEGY and CHANNEL_STRATEGY;
- base the choice on audience need, decision stage, content job, depth, relationship role, search intent, content purpose and appropriate format;
- do not select a channel merely because it exists;
- do not default to Website/SEO for every detailed request;
- do not default to VK or Telegram merely because the task is "content".

CHANNEL SELECTION LOGIC:

Website / SEO is generally appropriate when:
- the request represents a durable information need;
- search intent is meaningful;
- parents need detailed decision support;
- comparison, guide, FAQ or long-form explanation is useful;
- the content should have evergreen value.

VK is generally appropriate when:
- the purpose is social engagement;
- the content concerns events, activity, community, discussion or visible school life;
- an owner's position can stimulate comments;
- the material benefits from concise or medium-depth social consumption.

Telegram is generally appropriate when:
- deeper personal communication is valuable;
- the content benefits from reflection, practical collections, expert commentary or a direct conversation with parents;
- richer context is useful without requiring search-oriented structure.

Other channels must be selected only according to the supplied Channel Strategy.

The Planner is responsible for planning for the selected channel.

The Writer must not override the selected channel.

==================================================
FORMAT
==================================================

Choose the most useful format for the selected channel and task.

Examples:

SOCIAL_POST
LONGFORM_ARTICLE
SHORT_VIDEO
LONG_VIDEO
CAROUSEL
FAQ
GUIDE
CASE
OWNER_STORY
COMPARISON
CHECKLIST

The format must be appropriate to both:
1. the user's requested task;
2. the selected primary channel.

==================================================
REUSABILITY
==================================================

repurposingPotential should describe whether the core idea can later be meaningfully adapted into other formats/channels.

Examples:

HIGH
MEDIUM
LOW

Add a short explanation.

Do not confuse repurposing potential with automatic duplication.

A high-repurposing idea still requires channel-native adaptation.

==================================================
DETAIL LEVEL
==================================================

The plan must be strategically complete but compact.

Do not rewrite the entire source context.

Do not create an analytical essay.

The Writer receives the selected project context separately.

==================================================
OUTPUT
==================================================

Return ONLY one complete JSON object matching the provided schema.

No markdown fences.

No comments.

No additional text.
`;
}

export function buildPlannerUserPrompt({
  task,
  profile = "GENERAL",
  context = "",
  strategyContext = "",
  requestedChannel = "",
}: PlannerInput): string {
  return `
CONTENT PLANNER TASK

Context profile:
${profile}

USER REQUEST:
${task}

==================================================
TARGET CHANNEL
==================================================

${
  requestedChannel.trim()
    ? `The user explicitly requested this primary channel:

${requestedChannel.trim()}

Use this channel as the PRIMARY CHANNEL.
Do not select another channel.
Plan the content specifically for this channel.
`
    : `No primary channel was explicitly requested.

Select the PRIMARY CHANNEL using the supplied Content Strategy and Channel Strategy.
The chosen channel must be justified by the content job, audience need, decision stage, content purpose and channel role.
`
}

==================================================
STRATEGIC CONTEXT
==================================================

${
  strategyContext.trim() ||
  "No strategic documents supplied."
}

==================================================
PROJECT / RETRIEVED CONTEXT
==================================================

${
  context.trim() ||
  "No project context supplied."
}

==================================================
EXECUTION
==================================================

Use the strategic documents as the strategic layer.

Use the retrieved project context as the factual/evidence layer.

Determine:

1. audience
2. topic
3. subtopic
4. goal
5. decisionStage
6. contentJob
7. contentRole
8. primary channel
9. format
10. repurposing potential
11. audience need
12. key message
13. content angle
14. research signals
15. knowledge needs
16. radar signals
17. SEO considerations
18. CTA
19. constraints
20. source priorities

If a target channel was explicitly supplied above:
- use exactly that channel;
- do not choose another channel;
- make the format and content behavior native to that channel.

If no target channel was supplied:
- choose the primary channel from the strategic documents;
- do not assume the channel from the subject alone.

Do not write the final article or post.

Return ONLY the complete JSON object defined by the schema.
`;
}

function normalizePlan(
  value: unknown
): ContentPlan {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return {
      ...DEFAULT_PLAN,
      researchSignals: [],
      knowledgeNeeds: [],
      radarSignals: [],
      seoConsiderations: [],
      constraints: [],
      sourcePriorities: [],
    };
  }

  const input =
    value as Record<
      string,
      unknown
    >;

  const stringField = (
    key: keyof ContentPlan
  ): string =>
    typeof input[key] ===
    "string"
      ? String(input[key])
      : "";

  const arrayField = (
    key: keyof ContentPlan
  ): string[] =>
    Array.isArray(input[key])
      ? input[key].filter(
          (
            item
          ): item is string =>
            typeof item ===
            "string"
        )
      : [];

  return {
    audience:
      stringField("audience"),

    topic:
      stringField("topic"),

    subtopic:
      stringField("subtopic"),

    goal:
      stringField("goal"),

    decisionStage:
      stringField(
        "decisionStage"
      ),

    contentJob:
      stringField(
        "contentJob"
      ),

    contentRole:
      stringField(
        "contentRole"
      ),

    channel:
      stringField("channel"),

    format:
      stringField("format"),

    repurposingPotential:
      stringField(
        "repurposingPotential"
      ),

    audienceNeed:
      stringField(
        "audienceNeed"
      ),

    keyMessage:
      stringField(
        "keyMessage"
      ),

    contentAngle:
      stringField(
        "contentAngle"
      ),

    researchSignals:
      arrayField(
        "researchSignals"
      ),

    knowledgeNeeds:
      arrayField(
        "knowledgeNeeds"
      ),

    radarSignals:
      arrayField(
        "radarSignals"
      ),

    seoConsiderations:
      arrayField(
        "seoConsiderations"
      ),

    cta:
      stringField("cta"),

    constraints:
      arrayField(
        "constraints"
      ),

    sourcePriorities:
      arrayField(
        "sourcePriorities"
      ),
  };
}

export function parseContentPlan(
  raw: string
): ContentPlan {
  const text =
    raw.trim();

  try {
    return normalizePlan(
      JSON.parse(text)
    );
  } catch {
    const fenced =
      text.match(
        /```(?:json)?\s*([\s\S]*?)\s*```/i
      );

    if (fenced?.[1]) {
      try {
        return normalizePlan(
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
        return normalizePlan(
          JSON.parse(
            text.slice(
              start,
              end + 1
            )
          )
        );
      } catch {
        // incomplete JSON
      }
    }

    return {
      ...DEFAULT_PLAN,
      researchSignals: [],
      knowledgeNeeds: [],
      radarSignals: [],
      seoConsiderations: [],
      constraints: [],
      sourcePriorities: [],
    };
  }
}

export function formatContentPlanForWriter(
  plan: ContentPlan
): string {
  return `
CONTENT PLANNER BRIEF

Audience:
${plan.audience || "Not specified"}

Topic:
${plan.topic || "Not specified"}

Subtopic:
${plan.subtopic || "Not specified"}

Goal:
${plan.goal || "Not specified"}

Decision stage:
${plan.decisionStage || "Not specified"}

Content job:
${plan.contentJob || "Not specified"}

Content role:
${plan.contentRole || "Not specified"}

Primary channel:
${plan.channel || "Not specified"}

Format:
${plan.format || "Not specified"}

Repurposing potential:
${plan.repurposingPotential || "Not specified"}

Audience need:
${plan.audienceNeed || "Not specified"}

Key message:
${plan.keyMessage || "Not specified"}

Content angle:
${plan.contentAngle || "Not specified"}

CTA:
${plan.cta || "Not specified"}

Research signals:
${
  plan.researchSignals
    .map(
      item =>
        `- ${item}`
    )
    .join("\n") ||
  "- None identified"
}

Knowledge needs:
${
  plan.knowledgeNeeds
    .map(
      item =>
        `- ${item}`
    )
    .join("\n") ||
  "- None identified"
}

Radar signals:
${
  plan.radarSignals
    .map(
      item =>
        `- ${item}`
    )
    .join("\n") ||
  "- None identified"
}

SEO considerations:
${
  plan.seoConsiderations
    .map(
      item =>
        `- ${item}`
    )
    .join("\n") ||
  "- None identified"
}

Constraints:
${
  plan.constraints
    .map(
      item =>
        `- ${item}`
    )
    .join("\n") ||
  "- None identified"
}

Source priorities:
${
  plan.sourcePriorities
    .map(
      item =>
        `- ${item}`
    )
    .join("\n") ||
  "- None identified"
}
`;
}