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
You do NOT write the final content.
You convert a content request into a precise, evidence-based execution brief for the Writer.

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
2. Do not invent audience pain points when the supplied sources do not support them.
3. Distinguish evidence-backed signals from planning inference.
4. Do not rewrite the project methodology.
5. Do not write the final post, article or publication text.
6. Give the Writer a concrete execution brief.
7. Prefer the strongest relevant evidence over generic content advice.
8. Use multiple relevant source layers when available.
9. If information is missing, explicitly say so in the corresponding field.
10. Plan for the requested channel and format.
11. CTA must match the task and available evidence; do not invent URLs, prices or schedules.
12. The Planner may later receive additional architectural strategy input; preserve a clean separation between planning and execution.

OUTPUT:
Return ONLY valid JSON.
Do not wrap JSON in markdown fences.
Use exactly these top-level fields:
{
  "audience": string,
  "topic": string,
  "subtopic": string,
  "goal": string,
  "channel": string,
  "format": string,
  "audienceNeed": string,
  "keyMessage": string,
  "contentAngle": string,
  "researchSignals": string[],
  "knowledgeNeeds": string[],
  "radarSignals": string[],
  "seoConsiderations": string[],
  "cta": string,
  "constraints": string[],
  "sourcePriorities": string[]
}
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

Build the strategic execution brief now.
Return ONLY the JSON object defined by the system instructions.
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
        return { ...DEFAULT_PLAN };
      }
    }

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return normalizePlan(JSON.parse(text.slice(start, end + 1)));
      } catch {
        return { ...DEFAULT_PLAN };
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
