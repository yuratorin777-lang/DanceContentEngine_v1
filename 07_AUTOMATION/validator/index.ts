import fs from "fs/promises";
import path from "path";

export type ValidatorStatus = "PASS" | "REWRITE_REQUIRED";

export type ValidatorViolation = {
  code:
    | "OUTPUT_TYPE"
    | "META_OUTPUT"
    | "UNSUPPORTED_CLAIM"
    | "INVENTED_BUSINESS_FACT"
    | "CONTENT_RULE_VIOLATION"
    | "AUDIENCE_MISMATCH"
    | "CHANNEL_MISMATCH"
    | "INCOMPLETE_RESULT";
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  excerpt?: string;
};

export type ValidatorInput = {
  task: string;
  outputContract: string;
  content: string;
  context?: string;
  projectRoot?: string;
};

export type ValidatorRules = {
  systemRules: string;
  contentRules: string;
  seoRules: string;
  knowledgeRules: string;
  audienceRules: string;
};

export type ValidatorResult = {
  status: ValidatorStatus;
  score: number;
  violations: ValidatorViolation[];
  summary: string;
  rulesLoaded: string[];
};

const META_PATTERNS = [
  /^\s*(?:тема|аудитория|цель|формат|канал)\s*:/im,
  /Вот (?:готовый|получившийся) (?:пост|текст)/i,
  /Сформирую|Сформирован/i,
  /Ниже (?:готовый|предлагаемый)/i,
];

const BUSINESS_FACT_PATTERNS = [
  /\b\d[\d\s]*(?:руб|рублей|₽)\b/i,
  /\b\d+\s*(?:занят|раза в неделю|занятия|занятие)\b/i,
  /\b\d+\s*(?:лет|года|год)\b/i,
  /\b(?:в|с)\s*(?:\d{1,2}[.:]\d{2}|\d{1,2}\s*:\s*\d{2})\b/i,
  /\b(?:сегодня|завтра|\d{1,2}[./]\d{1,2}[./]\d{2,4})\b/i,
];

function parseForbiddenPhrases(contentRules: string): string[] {
  const defaults = ["пробное занятие", "проба", "попробовать"];
  const discovered: string[] = [];

  const lines = contentRules.split(/\r?\n/);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!/(запрет|нельзя|не использу|forbidden|prohibit)/i.test(lower)) {
      continue;
    }

    const quoted = [...line.matchAll(/["«](.+?)["»]/g)]
      .map((match) => match[1].trim())
      .filter((value) => value.length >= 3 && value.length <= 120);

    discovered.push(...quoted);
  }

  return [...new Set([...defaults, ...discovered])];
}

function hasContractKeyword(
  task: string,
  contract: string
): boolean {
  const text = task.toLowerCase();

  switch (contract) {
    case "VK_POST":
      return /vk|вк|вконтакт|пост для группы/.test(text);
    case "TELEGRAM_POST":
      return /telegram|телеграм|телеграмм/.test(text);
    case "CONTENT_PLAN":
      return /контент.?план|контент план|план контента/.test(text);
    case "CONTENT_IDEAS":
      return /идеи|темы контента|темы для контента/.test(text);
    case "SEO_ARTICLE":
      return /seo|статью для поиска|seo-стать/.test(text);
    default:
      return true;
  }
}

function isLikelyComplete(
  content: string,
  contract: string
): boolean {
  const text = content.trim();
  if (!text) return false;

  switch (contract) {
    case "VK_POST":
    case "TELEGRAM_POST":
      return text.length >= 250;
    case "CONTENT_PLAN":
    case "CONTENT_IDEAS":
      return text.length >= 150;
    case "SEO_ARTICLE":
      return text.length >= 700;
    default:
      return text.length >= 80;
  }
}

function extractContextFacts(context: string): string[] {
  return context
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("SOURCE:"))
    .filter((line) => !line.startsWith("END SOURCE:"))
    .filter((line) => !line.startsWith("===="))
    .filter((line) => line.length >= 12);
}

function looksSupported(
  content: string,
  context: string,
  pattern: RegExp
): boolean {
  const match = content.match(pattern);
  if (!match) return true;

  const value = match[0]
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const contextFacts = extractContextFacts(context)
    .map((line) => line.toLowerCase());

  return contextFacts.some((line) => line.includes(value));
}

async function readRuleFile(
  projectRoot: string,
  relativePath: string
): Promise<string> {
  try {
    return await fs.readFile(
      path.join(projectRoot, relativePath),
      "utf8"
    );
  } catch {
    return "";
  }
}

export async function loadValidatorRules(
  projectRoot: string
): Promise<ValidatorRules> {
  const files = {
    systemRules: "00_SYSTEM/AI_WORK_RULES.md",
    contentRules: "04_CONTENT/CONTENT_WORK_RULES.md",
    seoRules: "05_SEO/LOCAL_SEO_RULES.md",
    knowledgeRules: "01_KNOWLEDGE/OWNER_INPUT_RULES.md",
    audienceRules: "03_AUDIENCE/AUDIENCE_INDEX.md",
  } as const;

  const entries = await Promise.all(
    Object.entries(files).map(async ([key, relativePath]) => [
      key,
      await readRuleFile(projectRoot, relativePath),
    ])
  );

  return Object.fromEntries(entries) as ValidatorRules;
}

function collectRuleViolations(
  content: string,
  rules: ValidatorRules
): ValidatorViolation[] {
  const violations: ValidatorViolation[] = [];
  const forbiddenPhrases = parseForbiddenPhrases(
    rules.contentRules
  );
  const lowerContent = content.toLowerCase();

  for (const phrase of forbiddenPhrases) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      violations.push({
        code: "CONTENT_RULE_VIOLATION",
        severity: "HIGH",
        message: `Forbidden project phrase detected: ${phrase}.`,
        excerpt: phrase,
      });
    }
  }

  return violations;
}

export async function validateWriterOutput(
  input: ValidatorInput
): Promise<ValidatorResult> {
  const violations: ValidatorViolation[] = [];
  const content = input.content.trim();
  const context = input.context || "";
  const projectRoot = input.projectRoot || process.cwd();
  const rules = await loadValidatorRules(projectRoot);

  const loadedRules = [
    ["00_SYSTEM/AI_WORK_RULES.md", rules.systemRules],
    ["04_CONTENT/CONTENT_WORK_RULES.md", rules.contentRules],
    ["05_SEO/LOCAL_SEO_RULES.md", rules.seoRules],
    ["01_KNOWLEDGE/OWNER_INPUT_RULES.md", rules.knowledgeRules],
    ["03_AUDIENCE/AUDIENCE_INDEX.md", rules.audienceRules],
  ]
    .filter(([, contentValue]) => Boolean(contentValue.trim()))
    .map(([relativePath]) => relativePath);

  if (!content) {
    violations.push({
      code: "INCOMPLETE_RESULT",
      severity: "HIGH",
      message: "Writer returned an empty result.",
    });
  }

  if (!hasContractKeyword(input.task, input.outputContract)) {
    violations.push({
      code: "OUTPUT_TYPE",
      severity: "MEDIUM",
      message: `Task does not clearly match output contract ${input.outputContract}.`,
    });
  }

  if (!isLikelyComplete(content, input.outputContract)) {
    violations.push({
      code: "INCOMPLETE_RESULT",
      severity: "HIGH",
      message: `The ${input.outputContract} result appears incomplete.`,
    });
  }

  for (const pattern of META_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({
        code: "META_OUTPUT",
        severity: "MEDIUM",
        message:
          "The result contains meta-description instead of only the requested artifact.",
      });
      break;
    }
  }

  violations.push(
    ...collectRuleViolations(content, rules)
  );

  for (const pattern of BUSINESS_FACT_PATTERNS) {
    if (!looksSupported(content, context, pattern)) {
      const match = content.match(pattern);
      violations.push({
        code: "INVENTED_BUSINESS_FACT",
        severity: "HIGH",
        message:
          "A concrete business fact appears in the output but is not directly supported by the supplied context.",
        excerpt: match?.[0],
      });
    }
  }

  if (!context.trim()) {
    violations.push({
      code: "UNSUPPORTED_CLAIM",
      severity: "MEDIUM",
      message:
        "No project context was supplied, so project-specific claims cannot be validated.",
    });
  }

  const high = violations.filter(
    (violation) => violation.severity === "HIGH"
  ).length;
  const medium = violations.filter(
    (violation) => violation.severity === "MEDIUM"
  ).length;

  const score = Math.max(
    0,
    100 - high * 30 - medium * 10
  );

  const status: ValidatorStatus =
    high > 0 ? "REWRITE_REQUIRED" : "PASS";

  const summary =
    status === "PASS"
      ? "Writer output passed the V1 validation checks."
      : `Writer output requires rewrite: ${violations.length} validation issue(s) detected.`;

  return {
    status,
    score,
    violations,
    summary,
    rulesLoaded: loadedRules,
  };
}

export function buildValidatorPrompt({
  task,
  outputContract,
  content,
  context,
  rules,
}: ValidatorInput & { rules?: ValidatorRules }): string {
  const rulesBlock = rules
    ? `
PROJECT RULES LOADED AT RUNTIME

00_SYSTEM/AI_WORK_RULES.md
${rules.systemRules}

04_CONTENT/CONTENT_WORK_RULES.md
${rules.contentRules}

05_SEO/LOCAL_SEO_RULES.md
${rules.seoRules}

01_KNOWLEDGE/OWNER_INPUT_RULES.md
${rules.knowledgeRules}

03_AUDIENCE/AUDIENCE_INDEX.md
${rules.audienceRules}
`
    : `
PROJECT RULES:
Use the supplied project context and existing project rules only.
`;

  return `
You are the VALIDATOR of DanceContentEngine_v1.

Your role is quality control, not writing.

TASK:
${task}

OUTPUT CONTRACT:
${outputContract}

WRITER OUTPUT:
${content}

PROJECT CONTEXT:
${context || "NO CONTEXT PROVIDED"}
${rulesBlock}

VALIDATION POLICY:
- Do not invent project rules.
- Do not rewrite the content yourself.
- Identify the exact violation and why it matters.
- Project rules have priority over generic writing preferences.
- A concrete business claim must have support in the supplied context.
- If evidence is missing, report UNSUPPORTED_CLAIM.
- Return a structured verdict: PASS or REWRITE_REQUIRED.
`;
}
