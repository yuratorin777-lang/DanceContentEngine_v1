export type ContentPlan = {
  audience: string;
  topic: string;
  subtopic: string;
  goal: string;
  channel: string;
  format: string;
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
    channel: { type: "STRING" },
    format: { type: "STRING" },
    audienceNeed: { type: "STRING" },
    keyMessage: { type: "STRING" },
    contentAngle: { type: "STRING" },
    researchSignals: { type: "ARRAY", items: { type: "STRING" } },
    knowledgeNeeds: { type: "ARRAY", items: { type: "STRING" } },
    radarSignals: { type: "ARRAY", items: { type: "STRING" } },
    seoConsiderations: { type: "ARRAY", items: { type: "STRING" } },
    cta: { type: "STRING" },
    constraints: { type: "ARRAY", items: { type: "STRING" } },
    sourcePriorities: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: [
    "audience",
    "topic",
    "subtopic",
    "goal",
    "channel",
    "format",
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
    "channel",
    "format",
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
};

const DEFAULT_PLAN: ContentPlan = {
  audience: "",
  topic: "",
  subtopic: "",
  goal: "",
  channel: "",
  format: "",
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
You do NOT write final content.
You convert a content request into a sufficiently detailed, evidence-based Content Brief that tells the Writer WHAT to achieve, WHY it matters, WHAT information is needed, and WHAT constraints apply.

IMPORTANT ARCHITECTURE RULE:
The Planner is not the Writer and does not replace the future Information / Content Architect.
The Planner gives direction and requirements.
The Writer will later use the brief together with the relevant project context and knowledge to decide HOW to develop the material in depth.
Therefore do not try to place the whole knowledge base inside the plan.

SOURCE HIERARCHY:
- 02_RESEARCH = market, competitors, demand, research evidence.
- 03_AUDIENCE = audience needs, fears, questions, objections, language and journey.
- 01_KNOWLEDGE = expert knowledge and owner knowledge.
- 07_AUTOMATION/Rardar world feed = current external signals; treat them as signals, not automatically verified truth.
- 04_CONTENT = content methodology and rules.
- 05_SEO = search considerations when relevant.
- 06_ANALYTICS = performance evidence when available.

CORE RULES:
1. Do not invent project facts.
2. Do not invent audience pain points when sources do not support them; clearly mark planning inference when appropriate.
3. Use the strongest relevant evidence available across multiple project layers.
4. Plan for the requested channel and format.
5. Identify the audience need/problem/opportunity the content should address.
6. Define a meaningful topic and subtopic, not a generic label.
7. Define a concrete content objective.
8. Define the key message and content angle.
9. Identify what Research, Knowledge and Radar information is relevant for the Writer.
10. Identify constraints and factual requirements that the Writer must respect.
11. CTA must match the task and available evidence; do not invent URLs, prices, schedules or offers.
12. If information is missing, state that it is missing rather than filling the gap with invented facts.
13. Keep every field useful and substantive, but avoid repeating the project context.
14. This is a strategic brief, not an analytical essay.

DETAIL LEVEL:
The brief must be detailed enough that another competent Writer could execute the task without guessing the strategic intent.
Use short but substantive prose in scalar fields.
For arrays, include the most relevant items only; prefer evidence-backed, actionable items over generic lists.
Do not optimize for brevity at the expense of strategic completeness.

OUTPUT:
Return ONLY one complete JSON object matching the provided schema.
Do not use markdown fences.
Do not stop before every required field is present.
Ensure the JSON is syntactically complete.
`;
}

export function buildPlannerUserPrompt({
  task,
  profile = "GENERAL",
  context = "",
}: PlannerInput): string {
  return `
CONTENT PLANNER TASK

Context profile: ${profile}

USER REQUEST:
${task}

PROJECT CONTEXT:
${context || "No project context supplied."}

Build the full strategic Content Brief now.
The plan should be sufficiently detailed for the Writer to execute the task, while leaving the Writer responsible for selecting and using the detailed source material needed for the actual content.
Return ONLY the complete JSON object defined by the system instructions.
`;
}

function normalizePlan(value: unknown): ContentPlan {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PLAN };
  }

  const input = value as Record<string, unknown>;
  const stringField = (key: keyof ContentPlan): string =>
    typeof input[key] === "string" ? String(input[key]) : "";

  const arrayField = (key: keyof ContentPlan): string[] => {
    return Array.isArray(input[key])
      ? input[key].filter((item): item is string => typeof item === "string")
      : [];
  };

  return {
    audience: stringField("audience"),
    topic: stringField("topic"),
    subtopic: stringField("subtopic"),
    goal: stringField("goal"),
    channel: stringField("channel"),
    format: stringField("format"),
    audienceNeed: stringField("audienceNeed"),
    keyMessage: stringField("keyMessage"),
    contentAngle: stringField("contentAngle"),
    researchSignals: arrayField("researchSignals"),
    knowledgeNeeds: arrayField("knowledgeNeeds"),
    radarSignals: arrayField("radarSignals"),
    seoConsiderations: arrayField("seoConsiderations"),
    cta: stringField("cta"),
    constraints: arrayField("constraints"),
    sourcePriorities: arrayField("sourcePriorities"),
  };
}

export function parseContentPlan(raw: string): ContentPlan {
  const text = raw.trim();

  try {
    return normalizePlan(JSON.parse(text));
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      try {
        return normalizePlan(JSON.parse(fenced[1]));
      } catch {
        // continue with next recovery strategy
      }
    }

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return normalizePlan(JSON.parse(text.slice(start, end + 1)));
      } catch {
        // incomplete JSON cannot be safely repaired here
      }
    }

    return { ...DEFAULT_PLAN };
  }
}

export function formatContentPlanForWriter(plan: ContentPlan): string {
  return `
CONTENT PLANNER BRIEF

Audience: ${plan.audience || "Not specified"}
Topic: ${plan.topic || "Not specified"}
Subtopic: ${plan.subtopic || "Not specified"}
Goal: ${plan.goal || "Not specified"}
Channel: ${plan.channel || "Not specified"}
Format: ${plan.format || "Not specified"}
Audience need: ${plan.audienceNeed || "Not specified"}
Key message: ${plan.keyMessage || "Not specified"}
Content angle: ${plan.contentAngle || "Not specified"}
CTA: ${plan.cta || "Not specified"}

Research signals:
${plan.researchSignals.map((item) => `- ${item}`).join("\n") || "- None identified"}

Knowledge needs:
${plan.knowledgeNeeds.map((item) => `- ${item}`).join("\n") || "- None identified"}

Radar signals:
${plan.radarSignals.map((item) => `- ${item}`).join("\n") || "- None identified"}

SEO considerations:
${plan.seoConsiderations.map((item) => `- ${item}`).join("\n") || "- None identified"}

Constraints:
${plan.constraints.map((item) => `- ${item}`).join("\n") || "- None identified"}

Source priorities:
${plan.sourcePriorities.map((item) => `- ${item}`).join("\n") || "- None identified"}
`;
}
