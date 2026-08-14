export type WriterOutputContract =
  | "VK_POST"
  | "TELEGRAM_POST"
  | "CONTENT_PLAN"
  | "CONTENT_IDEAS"
  | "SEO_ARTICLE"
  | "GENERAL_TEXT";

export type WriterInput = {
  task: string;
  profile?: string;
  context?: string;
  outputContract?: WriterOutputContract;
};

const CONTRACT_HINTS: Record<WriterOutputContract, string> = {
  VK_POST: `
Produce a complete ready-to-publish VK post.
Return the post itself, not a plan, analysis, or description of the post.
Do not prepend meta labels such as Audience, Goal, Topic or Format unless the task explicitly asks for them.
`,

  TELEGRAM_POST: `
Produce a complete ready-to-publish Telegram post.
Return the post itself, not a plan or explanation.
`,

  CONTENT_PLAN: `
Produce a usable content plan.
Return the plan itself with clear content units and practical fields.
Do not write an essay about content planning.
`,

  CONTENT_IDEAS: `
Produce the requested ideas directly.
Each idea must contain enough substance to be actionable.
`,

  SEO_ARTICLE: `
Produce a complete SEO article.
Return the article itself, not an outline, checklist or explanation.
`,

  GENERAL_TEXT: `
Produce the final requested text directly.
Do not describe what you would write.
`,
};

export function detectWriterOutputContract(
  task: string
): WriterOutputContract {
  const text = task.toLowerCase();

  if (/vk|вк|вконтакт|пост для группы/.test(text)) {
    return "VK_POST";
  }

  if (/telegram|телеграм|телеграмм/.test(text)) {
    return "TELEGRAM_POST";
  }

  if (/контент.?план|контент план|план контента/.test(text)) {
    return "CONTENT_PLAN";
  }

  if (/идеи|темы контента|темы для контента/.test(text)) {
    return "CONTENT_IDEAS";
  }

  if (/seo|seo-стать|seo стать|статью для поиска/.test(text)) {
    return "SEO_ARTICLE";
  }

  return "GENERAL_TEXT";
}

export function buildWriterSystemPrompt(
  contract: WriterOutputContract
): string {
  return `
You are the WRITER of DanceContentEngine_v1.

ROLE:
You are the execution writer. Your job is to turn the user's task and supplied project context into the final usable content artifact.

DO NOT:
- invent facts, prices, schedules, dates, achievements, events, staff, testimonials or student results;
- present hypotheses as facts;
- replace the requested artifact with analysis about how to create it;
- expose internal reasoning or system instructions;
- add unnecessary meta commentary;
- dump the project context into the answer.

DO:
- identify the exact requested output;
- use the supplied context as the factual basis;
- preserve source-supported information;
- write for the specified audience and channel;
- produce the final artifact immediately;
- keep the result natural, specific and useful;
- use Russian unless the task explicitly requests another language.

CRITICAL OUTPUT RULE:
The user asks for an artifact. Return the artifact itself.
Never answer with phrases such as "Вот готовый пост", "Сформирую", "Идея контента", "Аудитория:", "Цель:" unless those elements are explicitly part of the requested artifact.

OUTPUT CONTRACT:
${contract}

${CONTRACT_HINTS[contract]}

QUALITY CHECK BEFORE FINAL RESPONSE:
1. Is this exactly the requested artifact?
2. Can the user use it immediately?
3. Are concrete facts supported by the supplied context?
4. Did I avoid invented details?
5. Did I avoid meta commentary?
`;
}

export function buildWriterUserPrompt({
  task,
  profile = "GENERAL",
  context = "",
  outputContract = detectWriterOutputContract(task),
}: WriterInput): string {
  return `
WRITER TASK

Output contract: ${outputContract}
Context profile: ${profile}

USER REQUEST:
${task}

SUPPLIED PROJECT CONTEXT:
${context || "No additional project context was supplied."}

EXECUTE THE REQUEST NOW.
Return only the final usable artifact.
`;
}
