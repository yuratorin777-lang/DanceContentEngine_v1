import fs from "node:fs/promises";
import path from "node:path";

export type RetrievalSourceRole =
  | "knowledge"
  | "audience"
  | "research"
  | "content"
  | "seo"
  | "input"
  | "radar"
  | "system"
  | "other";

export type RetrievalCandidate = {
  item: any;

  role: RetrievalSourceRole;

  content: string;

  size: number;

  relevance: number;

  sourcePriority: number;

  reasons: string[];
};

export type RetrievalComposition = {
  knowledge: number;
  audience: number;
  research: number;
  content: number;
  seo: number;
  input: number;
  radar: number;
  system: number;
  other: number;
  total: number;
  characters: number;
};

export type KnowledgePackage = {
  generatedAt: string;

  limits: {
    maxCharacters: number;
    maxSources: number;
  };

  query: {
    audience: string;
    topic: string;
    subtopic: string;
    goal: string;
    audienceNeed: string;
    keyMessage: string;
    contentAngle: string;
    researchSignals: string[];
    knowledgeNeeds: string[];
    radarSignals: string[];
    seoConsiderations: string[];
    constraints: string[];
    sourcePriorities: string[];
  };

  candidates: RetrievalCandidate[];

  selected: RetrievalCandidate[];

  composition: RetrievalComposition;
};

const DEFAULT_LIMITS = {
  maxCharacters: 220_000,
  maxSources: 28,
};

const STOP_WORDS = new Set([
  "это",
  "для",
  "или",
  "при",
  "как",
  "что",
  "так",
  "его",
  "ее",
  "они",
  "the",
  "and",
  "with",
  "from",
  "this",
  "that",
  "into",
  "your",
  "about",
  "their",
  "there",
  "which",
  "where",
  "when",
  "would",
  "could",
  "should",
  "project",
  "система",
  "системы",
  "который",
  "которая",
  "которые",
  "может",
  "должен",
  "должны",
  "будет",
  "также",
  "если",
  "после",
  "только",
  "этого",
  "этим",
  "этот",
  "этой",
]);

const EXCLUDED_FILES = new Set([
  ".gitkeep",
]);

const EXCLUDED_TYPES = new Set([
  "code",
  "config",
]);

const DOMAIN_ROLE_MAP: Record<
  string,
  RetrievalSourceRole
> = {
  "00_SYSTEM": "system",
  "01_KNOWLEDGE": "knowledge",
  "02_RESEARCH": "research",
  "03_AUDIENCE": "audience",
  "04_CONTENT": "content",
  "05_SEO": "seo",
  "08_INPUT": "input",
};

const ROLE_ORDER: RetrievalSourceRole[] = [
  "knowledge",
  "audience",
  "research",
  "content",
  "seo",
  "input",
  "radar",
  "system",
  "other",
];

function normalize(
  text: string
): string {
  return String(
    text || ""
  )
    .toLowerCase()
    .replace(
      /ё/g,
      "е"
    )
    .replace(
      /[^a-zа-я0-9\s_-]/gi,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function tokenize(
  text: string
): string[] {
  return [
    ...new Set(
      normalize(
        text
      )
        .split(" ")
        .filter(
          token =>
            token.length >= 4 &&
            !STOP_WORDS.has(
              token
            )
        )
    ),
  ];
}

function overlapScore(
  query: string,
  text: string
): number {
  const queryTokens =
    tokenize(
      query
    );

  const textTokens =
    new Set(
      tokenize(
        text
      )
    );

  if (
    !queryTokens.length ||
    !textTokens.size
  ) {
    return 0;
  }

  const hits =
    queryTokens.filter(
      token =>
        textTokens.has(
          token
        )
    ).length;

  return Math.min(
    100,
    Math.round(
      (
        hits /
        Math.max(
          queryTokens.length,
          1
        )
      ) *
        100
    )
  );
}

function joinPlan(
  plan: any
): string {
  return [
    plan?.audience,
    plan?.topic,
    plan?.subtopic,
    plan?.goal,
    plan?.audienceNeed,
    plan?.keyMessage,
    plan?.contentAngle,
    ...(Array.isArray(
      plan?.researchSignals
    )
      ? plan.researchSignals
      : []),
    ...(Array.isArray(
      plan?.knowledgeNeeds
    )
      ? plan.knowledgeNeeds
      : []),
    ...(Array.isArray(
      plan?.radarSignals
    )
      ? plan.radarSignals
      : []),
    ...(Array.isArray(
      plan?.seoConsiderations
    )
      ? plan.seoConsiderations
      : []),
    ...(Array.isArray(
      plan?.constraints
    )
      ? plan.constraints
      : []),
    ...(Array.isArray(
      plan?.sourcePriorities
    )
      ? plan.sourcePriorities
      : []),
  ]
    .filter(Boolean)
    .join(
      " "
    );
}

function roleOf(
  item: any
): RetrievalSourceRole {
  if (
    item?.type ===
    "radar_signal"
  ) {
    return "radar";
  }

  const domain =
    String(
      item?.domain || ""
    );

  return (
    DOMAIN_ROLE_MAP[
      domain
    ] ||
    "other"
  );
}

function isExcludedItem(
  item: any
): boolean {
  if (!item) {
    return true;
  }

  const fileName =
    String(
      item.fileName || ""
    ).toLowerCase();

  if (
    EXCLUDED_FILES.has(
      fileName
    )
  ) {
    return true;
  }

  if (
    EXCLUDED_TYPES.has(
      String(
        item.type || ""
      )
    )
  ) {
    return true;
  }

  return false;
}

function isNavigationItem(
  item: any
): boolean {
  const type =
    String(
      item?.type || ""
    );

  const fileName =
    String(
      item?.fileName || ""
    ).toLowerCase();

  return (
    type === "index" ||
    type === "readme" ||
    fileName ===
      "readme.md"
  );
}

function sourcePriorityScore(
  item: any,
  plan: any
): number {
  const priorities =
    Array.isArray(
      plan?.sourcePriorities
    )
      ? plan.sourcePriorities
      : [];

  const itemPath =
    normalize(
      String(
        item?.path || ""
      )
    );

  const itemDomain =
    normalize(
      String(
        item?.domain || ""
      )
    );

  for (
    let i = 0;
    i < priorities.length;
    i++
  ) {
    const priority =
      normalize(
        String(
          priorities[i]
        )
      );

    if (
      itemPath.includes(
        priority
      ) ||
      itemDomain.includes(
        priority
      )
    ) {
      return Math.max(
        40,
        100 -
          i * 10
      );
    }
  }

  return 30;
}

function buildSearchText(
  item: any,
  content: string
): string {
  return [
    item?.title,
    item?.purpose,
    ...(item?.keywords || []),
    item?.sourceRole,
    item?.radarMetadata
      ?.primaryCategory,
    ...Object.keys(
      item?.radarMetadata
        ?.matchedCategories ||
        {}
    ),
    ...Object.values(
      item?.radarMetadata
        ?.matchedCategories ||
        {}
    ).flat(),
    content,
  ]
    .filter(Boolean)
    .join(
      " "
    );
}

function calculateRelevance(
  item: any,
  content: string,
  plan: any
): {
  relevance: number;
  sourcePriority: number;
  reasons: string[];
} {
  const searchText =
    buildSearchText(
      item,
      content
    );

  const directQuery =
    [
      plan?.topic,
      plan?.subtopic,
      plan?.keyMessage,
      plan?.contentAngle,
    ]
      .filter(Boolean)
      .join(
        " "
      );

  const audienceQuery =
    [
      plan?.audience,
      plan?.audienceNeed,
    ]
      .filter(Boolean)
      .join(
        " "
      );

  const researchQuery =
    [
      ...(plan?.researchSignals ||
        []),
      ...(plan?.knowledgeNeeds ||
        []),
    ]
      .filter(Boolean)
      .join(
        " "
      );

  const strategicQuery =
    [
      plan?.goal,
      plan?.contentAngle,
      ...(plan?.seoConsiderations ||
        []),
    ]
      .filter(Boolean)
      .join(
        " "
      );

  const direct =
    overlapScore(
      directQuery,
      searchText
    );

  const audience =
    overlapScore(
      audienceQuery,
      searchText
    );

  const research =
    overlapScore(
      researchQuery,
      searchText
    );

  const strategic =
    overlapScore(
      strategicQuery,
      searchText
    );

  const role =
    roleOf(
      item
    );

  const sourcePriority =
    sourcePriorityScore(
      item,
      plan
    );

  let relevance =
    direct * 0.30 +
    audience * 0.20 +
    research * 0.20 +
    strategic * 0.15 +
    sourcePriority * 0.15;

  /*
   * Role-specific bonuses are deliberately small.
   *
   * We do NOT want to force artificial source
   * domination just because of the role.
   */

  if (
    role ===
    "knowledge" &&
    research >= 15
  ) {
    relevance += 4;
  }

  if (
    role ===
    "audience" &&
    audience >= 15
  ) {
    relevance += 4;
  }

  if (
    role ===
    "research" &&
    research >= 15
  ) {
    relevance += 4;
  }

  if (
    role ===
    "input"
  ) {
    relevance += 3;
  }

  if (
    role ===
    "radar"
  ) {
    const radarRelevance =
      Number(
        item?.radarMetadata
          ?.relevance || 0
      );

    relevance +=
      Math.min(
        8,
        radarRelevance /
          12
      );

    if (
      item?.radarMetadata
        ?.context?.local
    ) {
      relevance +=
        3;
    }
  }

  if (
    isNavigationItem(
      item
    )
  ) {
    relevance -=
      15;
  }

  const reasons: string[] =
    [];

  if (
    direct >= 20
  ) {
    reasons.push(
      "direct relevance"
    );
  }

  if (
    audience >= 20
  ) {
    reasons.push(
      "audience relevance"
    );
  }

  if (
    research >= 20
  ) {
    reasons.push(
      "research relevance"
    );
  }

  if (
    strategic >= 20
  ) {
    reasons.push(
      "strategic relevance"
    );
  }

  if (
    sourcePriority >=
    80
  ) {
    reasons.push(
      "planner source priority"
    );
  }

  if (
    role ===
    "radar"
  ) {
    reasons.push(
      "current radar signal"
    );
  }

  if (
    isNavigationItem(
      item
    )
  ) {
    reasons.push(
      "navigation source"
    );
  }

  return {
    relevance:
      Math.round(
        relevance *
          100
      ) / 100,

    sourcePriority,

    reasons,
  };
}

async function resolveContent(
  projectRoot: string,
  item: any
): Promise<string> {
  if (!item) {
    return "";
  }

  /*
   * Radar signal content already exists in
   * the Librarian item metadata.
   */
  if (
    item.type ===
    "radar_signal"
  ) {
    return [
      item.title,
      item.purpose,
      ...(item.keywords || []),
      item.radarMetadata
        ?.primaryCategory,
      JSON.stringify(
        item.radarMetadata
          ?.matchedCategories ||
          {}
      ),
    ]
      .filter(Boolean)
      .join(
        "\n"
      );
  }

  const relativePath =
    String(
      item.path || ""
    );

  if (
    !relativePath
  ) {
    return "";
  }

  if (
    relativePath.includes(
      "#signal-"
    )
  ) {
    return [
      item.title,
      item.purpose,
      ...(item.keywords || []),
      item.sourceRole,
    ]
      .filter(Boolean)
      .join(
        "\n"
      );
  }

  const absolutePath =
    path.resolve(
      projectRoot,
      relativePath
    );

  if (
    absolutePath !==
      projectRoot &&
    !absolutePath.startsWith(
      projectRoot +
        path.sep
    )
  ) {
    return "";
  }

  try {
    const stat =
      await fs.stat(
        absolutePath
      );

    if (
      !stat.isFile()
    ) {
      return "";
    }

    if (
      stat.size >
      1_500_000
    ) {
      return "";
    }

    return await fs.readFile(
      absolutePath,
      "utf8"
    );
  } catch {
    return "";
  }
}

async function loadLibraryMap(
  projectRoot: string
): Promise<any> {
  const mapPath =
    path.join(
      projectRoot,
      "07_AUTOMATION",
      "knowledge-retrieval",
      "runtime",
      "library-map.json"
    );

  const raw =
    await fs.readFile(
      mapPath,
      "utf8"
    );

  return JSON.parse(
    raw
  );
}

function emptyComposition():
  RetrievalComposition {
  return {
    knowledge: 0,
    audience: 0,
    research: 0,
    content: 0,
    seo: 0,
    input: 0,
    radar: 0,
    system: 0,
    other: 0,
    total: 0,
    characters: 0,
  };
}

function addToComposition(
  composition: RetrievalComposition,
  role: RetrievalSourceRole,
  size: number
) {
  if (
    role ===
    "knowledge"
  ) {
    composition.knowledge++;
  } else if (
    role ===
    "audience"
  ) {
    composition.audience++;
  } else if (
    role ===
    "research"
  ) {
    composition.research++;
  } else if (
    role ===
    "content"
  ) {
    composition.content++;
  } else if (
    role ===
    "seo"
  ) {
    composition.seo++;
  } else if (
    role ===
    "input"
  ) {
    composition.input++;
  } else if (
    role ===
    "radar"
  ) {
    composition.radar++;
  } else if (
    role ===
    "system"
  ) {
    composition.system++;
  } else {
    composition.other++;
  }

  composition.total++;
  composition.characters +=
    size;
}

function selectDiverseSources(
  ranked: RetrievalCandidate[],
  maxCharacters: number,
  maxSources: number
): RetrievalCandidate[] {
  const selected:
    RetrievalCandidate[] =
    [];

  const used =
    new Set<string>();

  let totalCharacters =
    0;

  /*
   * First pass:
   *
   * Give every meaningful role a chance.
   *
   * This is diversity protection,
   * not relevance ranking.
   */

  for (
    const role of ROLE_ORDER
  ) {
    if (
      selected.length >=
      maxSources
    ) {
      break;
    }

    const candidate =
      ranked.find(
        item =>
          !used.has(
            item.item.path
          ) &&
          item.role ===
            role
      );

    if (
      !candidate
    ) {
      continue;
    }

    if (
      totalCharacters +
        candidate.size >
      maxCharacters
    ) {
      continue;
    }

    used.add(
      candidate.item.path
    );

    selected.push(
      candidate
    );

    totalCharacters +=
      candidate.size;
  }

  /*
   * Second pass:
   *
   * Fill remaining capacity with the best
   * unused candidates while respecting the
   * physical context limit.
   */

  for (
    const candidate of ranked
  ) {
    if (
      selected.length >=
      maxSources
    ) {
      break;
    }

    if (
      used.has(
        candidate.item.path
      )
    ) {
      continue;
    }

    if (
      totalCharacters +
        candidate.size >
      maxCharacters
    ) {
      continue;
    }

    used.add(
      candidate.item.path
    );

    selected.push(
      candidate
    );

    totalCharacters +=
      candidate.size;
  }

  /*
   * Third pass:
   *
   * When a large source does not fit,
   * try smaller unused sources.
   *
   * This prevents one huge document from
   * destroying diversity.
   */

  if (
    selected.length <
    maxSources
  ) {
    const smallSources =
      [...ranked]
        .filter(
          candidate =>
            !used.has(
              candidate.item.path
            )
        )
        .sort(
          (a, b) =>
            a.size -
            b.size
        );

    for (
      const candidate of smallSources
    ) {
      if (
        selected.length >=
        maxSources
      ) {
        break;
      }

      if (
        used.has(
          candidate.item.path
        )
      ) {
        continue;
      }

      if (
        totalCharacters +
          candidate.size >
        maxCharacters
      ) {
        continue;
      }

      used.add(
        candidate.item.path
      );

      selected.push(
        candidate
      );

      totalCharacters +=
        candidate.size;
    }
  }

  return selected;
}

export async function discoverAndRank(
  libraryMap: any,
  plan: any,
  projectRoot = process.cwd(),
  limits = DEFAULT_LIMITS
): Promise<KnowledgePackage> {
  const allItems =
    Array.isArray(
      libraryMap?.items
    )
      ? libraryMap.items
      : [];

  const candidates:
    RetrievalCandidate[] =
    [];

  for (
    const item of allItems
  ) {
    if (
      isExcludedItem(
        item
      )
    ) {
      continue;
    }

    const role =
      roleOf(
        item
      );

    /*
     * Internal system files remain available
     * only as low-priority fallback knowledge.
     *
     * They are never deliberately preferred.
     */
    const content =
      await resolveContent(
        projectRoot,
        item
      );

    if (
      !content.trim()
    ) {
      continue;
    }

    const result =
      calculateRelevance(
        item,
        content,
        plan
      );

    const candidate:
      RetrievalCandidate = {
      item,

      role,

      content,

      size:
        content.length,

      relevance:
        result.relevance,

      sourcePriority:
        result.sourcePriority,

      reasons:
        result.reasons,
    };

    candidates.push(
      candidate
    );
  }

  /*
   * Ranking is only used to order candidates.
   *
   * It is NOT used as the meaning of the
   * retrieval system.
   *
   * Diversity selection below has priority
   * over simply taking the top N.
   */

  const ranked =
    [...candidates]
      .sort(
        (a, b) => {
          if (
            b.relevance !==
            a.relevance
          ) {
            return (
              b.relevance -
              a.relevance
            );
          }

          return (
            b.size -
            a.size
          );
        }
      );

  const selected =
    selectDiverseSources(
      ranked,
      limits.maxCharacters,
      limits.maxSources
    );

  const composition =
    emptyComposition();

  for (
    const candidate of selected
  ) {
    addToComposition(
      composition,
      candidate.role,
      candidate.size
    );
  }

  return {
    generatedAt:
      new Date().toISOString(),

    limits: {
      maxCharacters:
        limits.maxCharacters,

      maxSources:
        limits.maxSources,
    },

    query: {
      audience:
        plan?.audience ||
        "",

      topic:
        plan?.topic ||
        "",

      subtopic:
        plan?.subtopic ||
        "",

      goal:
        plan?.goal ||
        "",

      audienceNeed:
        plan?.audienceNeed ||
        "",

      keyMessage:
        plan?.keyMessage ||
        "",

      contentAngle:
        plan?.contentAngle ||
        "",

      researchSignals:
        Array.isArray(
          plan?.researchSignals
        )
          ? plan.researchSignals
          : [],

      knowledgeNeeds:
        Array.isArray(
          plan?.knowledgeNeeds
        )
          ? plan.knowledgeNeeds
          : [],

      radarSignals:
        Array.isArray(
          plan?.radarSignals
        )
          ? plan.radarSignals
          : [],

      seoConsiderations:
        Array.isArray(
          plan?.seoConsiderations
        )
          ? plan.seoConsiderations
          : [],

      constraints:
        Array.isArray(
          plan?.constraints
        )
          ? plan.constraints
          : [],

      sourcePriorities:
        Array.isArray(
          plan?.sourcePriorities
        )
          ? plan.sourcePriorities
          : [],
    },

    candidates:
      ranked,

    selected,

    composition,
  };
}

export async function buildRetrievalPackage(
  projectRoot: string,
  plan: any,
  limits = DEFAULT_LIMITS
): Promise<KnowledgePackage> {
  const libraryMap =
    await loadLibraryMap(
      projectRoot
    );

  return discoverAndRank(
    libraryMap,
    plan,
    projectRoot,
    limits
  );
}

export function formatKnowledgePackage(
  pkg: KnowledgePackage
): string {
  const header = `
==================================================
KNOWLEDGE RETRIEVAL PACKAGE
==================================================

MAX CHARACTERS: ${pkg.limits.maxCharacters}
MAX SOURCES: ${pkg.limits.maxSources}

SELECTED SOURCES:
${pkg.composition.total}

TOTAL CHARACTERS:
${pkg.composition.characters}

COMPOSITION:
Knowledge: ${pkg.composition.knowledge}
Audience: ${pkg.composition.audience}
Research: ${pkg.composition.research}
Content: ${pkg.composition.content}
SEO: ${pkg.composition.seo}
Input: ${pkg.composition.input}
Radar: ${pkg.composition.radar}
System: ${pkg.composition.system}
Other: ${pkg.composition.other}

==================================================
`;

  const blocks =
    pkg.selected.map(
      (
        candidate,
        index
      ) => {
        return `
SOURCE ${index + 1}
PATH: ${candidate.item.path}
ROLE: ${candidate.role}
TYPE: ${candidate.item.type}
SIZE: ${candidate.size}
RELEVANCE: ${candidate.relevance}
REASONS: ${
          candidate.reasons.join(
            ", "
          ) ||
          "selected for diversity and context coverage"
        }

TITLE:
${candidate.item.title || ""}

CONTENT:
${candidate.content}

==================================================
`;
      }
    );

  return (
    header +
    blocks.join(
      "\n"
    )
  );
}