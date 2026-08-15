import fs from "node:fs/promises";
import path from "node:path";

export type RetrievalCandidate = {
  item: any;
  score: number;
  reasons: string[];
  match: {
    direct: number;
    audience: number;
    strategic: number;
    expert: number;
    adjacent: number;
    freshness: number;
    confidence: number;
    novelty: number;
    contentDepth: number;
    sourcePriority: number;
  };
};

export type KnowledgePackage = {
  generatedAt: string;

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

  composition: {
    direct: number;
    audience: number;
    expert: number;
    research: number;
    adjacent: number;
    radar: number;
    strategic: number;
    total: number;
  };
};

const DEFAULT_LIMITS = {
  discoveryPool: 40,

  selectedTotal: 14,

  direct: 3,
  audience: 2,
  expert: 3,
  research: 3,
  adjacent: 2,
  radar: 2,
  strategic: 1,
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

const NAVIGATION_TYPES = new Set([
  "index",
  "readme",
]);

const NAVIGATION_FILE_NAMES = new Set([
  "README.md",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\s_-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return [
    ...new Set(
      normalize(text)
        .split(" ")
        .filter(
          token =>
            token.length >= 4 &&
            !STOP_WORDS.has(token)
        )
    ),
  ];
}

function joinPlan(plan: any): string {
  return [
    plan?.audience,
    plan?.topic,
    plan?.subtopic,
    plan?.goal,
    plan?.audienceNeed,
    plan?.keyMessage,
    plan?.contentAngle,
    ...(Array.isArray(plan?.researchSignals)
      ? plan.researchSignals
      : []),
    ...(Array.isArray(plan?.knowledgeNeeds)
      ? plan.knowledgeNeeds
      : []),
    ...(Array.isArray(plan?.radarSignals)
      ? plan.radarSignals
      : []),
    ...(Array.isArray(plan?.seoConsiderations)
      ? plan.seoConsiderations
      : []),
    ...(Array.isArray(plan?.constraints)
      ? plan.constraints
      : []),
    ...(Array.isArray(plan?.sourcePriorities)
      ? plan.sourcePriorities
      : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function overlapScore(
  query: string,
  text: string
): number {
  const queryTokens = tokenize(query);
  const textTokens = new Set(
    tokenize(text)
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
        textTokens.has(token)
    ).length;

  return Math.min(
    100,
    Math.round(
      (hits /
        Math.max(
          queryTokens.length,
          1
        )) *
        100
    )
  );
}

function contentDepthScore(
  content: string
): number {
  const length = content.length;

  if (length === 0) return 0;
  if (length < 300) return 10;
  if (length < 1000) return 30;
  if (length < 3000) return 50;
  if (length < 7000) return 70;
  if (length < 15000) return 85;

  return 100;
}

function isTechnicalPlaceholder(
  item: any
): boolean {
  if (!item) return true;

  const fileName =
    String(
      item.fileName || ""
    ).toLowerCase();

  const title =
    String(
      item.title || ""
    ).trim()
    .toLowerCase();

  const purpose =
    String(
      item.purpose || ""
    ).trim()
    .toLowerCase();

  if (
    EXCLUDED_FILES.has(
      fileName
    )
  ) {
    return true;
  }

  if (
    title === ".gitkeep" ||
    purpose === "материал .gitkeep"
  ) {
    return true;
  }

  return false;
}

function isNavigationItem(
  item: any
): boolean {
  if (!item) return false;

  const fileName =
    String(
      item.fileName || ""
    );

  if (
    NAVIGATION_FILE_NAMES.has(
      fileName
    )
  ) {
    return true;
  }

  return NAVIGATION_TYPES.has(
    String(
      item.type || ""
    )
  );
}

function categoryRole(
  item: any
): string {
  if (
    item?.type ===
    "radar_signal"
  ) {
    return "radar";
  }

  if (
    item?.domain ===
    "03_AUDIENCE"
  ) {
    return "audience";
  }

  if (
    item?.domain ===
    "01_KNOWLEDGE"
  ) {
    return "expert";
  }

  if (
    item?.domain ===
    "02_RESEARCH"
  ) {
    return "research";
  }

  if (
    item?.domain ===
      "04_CONTENT" ||
    item?.domain ===
      "05_SEO"
  ) {
    return "strategic";
  }

  if (
    item?.domain ===
    "06_ANALYTICS"
  ) {
    return "analytics";
  }

  return "other";
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

  const normalizedPath =
    String(
      item?.path || ""
    ).toLowerCase();

  const normalizedDomain =
    String(
      item?.domain || ""
    ).toLowerCase();

  for (
    let index = 0;
    index < priorities.length;
    index++
  ) {
    const priority =
      String(
        priorities[index]
      ).toLowerCase();

    if (
      normalizedPath.includes(
        priority
      ) ||
      normalizedDomain.includes(
        priority
      )
    ) {
      return Math.max(
        40,
        100 - index * 10
      );
    }
  }

  return 30;
}

function radarFreshnessScore(
  item: any
): number {
  if (
    item?.type !==
    "radar_signal"
  ) {
    return 40;
  }

  const metadata =
    item?.radarMetadata;

  if (
    typeof metadata?.freshness ===
    "number"
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        metadata.freshness
      )
    );
  }

  const publishedAt =
    metadata?.publishedAt;

  if (!publishedAt) {
    return 50;
  }

  const time =
    new Date(
      publishedAt
    ).getTime();

  if (
    Number.isNaN(time)
  ) {
    return 50;
  }

  const ageDays =
    Math.max(
      0,
      (Date.now() - time) /
        86_400_000
    );

  if (ageDays <= 7) return 100;
  if (ageDays <= 30) return 90;
  if (ageDays <= 90) return 75;
  if (ageDays <= 180) return 60;
  if (ageDays <= 365) return 40;

  return 20;
}

function confidenceScore(
  item: any
): number {
  if (
    typeof item?.radarMetadata
      ?.confidence ===
    "number"
  ) {
    return Math.round(
      item.radarMetadata.confidence *
        100
    );
  }

  if (
    item?.domain ===
      "01_KNOWLEDGE" ||
    item?.domain ===
      "02_RESEARCH"
  ) {
    return 85;
  }

  if (
    item?.type ===
    "radar_signal"
  ) {
    return 70;
  }

  return 60;
}

function noveltyScore(
  item: any
): number {
  if (
    item?.type ===
    "radar_signal"
  ) {
    return 90;
  }

  if (
    item?.domain ===
    "08_INPUT"
  ) {
    return 90;
  }

  if (
    item?.domain ===
    "01_KNOWLEDGE"
  ) {
    return 80;
  }

  if (
    item?.domain ===
    "02_RESEARCH"
  ) {
    return 75;
  }

  return 50;
}

async function resolveCandidateContent(
  projectRoot: string,
  item: any
): Promise<string> {
  if (!item) return "";

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
      Object.keys(
        item.radarMetadata
          ?.matchedCategories || {}
      ),
    ]
      .filter(Boolean)
      .join(" ");
  }

  const relativePath =
    String(
      item.path || ""
    );

  if (
    !relativePath ||
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
      .join(" ");
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
    return [
      item.title,
      item.purpose,
      ...(item.keywords || []),
      item.sourceRole,
    ]
      .filter(Boolean)
      .join(" ");
  }

  try {
    const stat =
      await fs.stat(
        absolutePath
      );

    if (
      !stat.isFile()
    ) {
      return [
        item.title,
        item.purpose,
        ...(item.keywords || []),
        item.sourceRole,
      ]
        .filter(Boolean)
        .join(" ");
    }

    if (
      stat.size >
      1_500_000
    ) {
      return [
        item.title,
        item.purpose,
        ...(item.keywords || []),
        item.sourceRole,
      ]
        .filter(Boolean)
        .join(" ");
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
      item.sourceRole,
    ]
      .filter(Boolean)
      .join(" ");
  }
}

async function relevanceFor(
  item: any,
  plan: any,
  projectRoot: string
): Promise<RetrievalCandidate> {
  const content =
    await resolveCandidateContent(
      projectRoot,
      item
    );

  const searchable =
    [
      content,
      item.title,
      item.purpose,
      ...(item.keywords || []),
      item.sourceRole,
      item.radarMetadata
        ?.primaryCategory,
      ...Object.keys(
        item.radarMetadata
          ?.matchedCategories || {}
      ),
      ...Object.values(
        item.radarMetadata
          ?.matchedCategories || {}
      ).flat(),
    ]
      .filter(Boolean)
      .join(" ");

  const directQuery =
    [
      plan?.topic,
      plan?.subtopic,
      plan?.keyMessage,
      plan?.contentAngle,
    ]
      .filter(Boolean)
      .join(" ");

  const audienceQuery =
    [
      plan?.audience,
      plan?.audienceNeed,
    ]
      .filter(Boolean)
      .join(" ");

  const strategicQuery =
    [
      plan?.goal,
      plan?.contentAngle,
      ...(plan?.seoConsiderations || []),
    ]
      .filter(Boolean)
      .join(" ");

  const expertQuery =
    Array.isArray(
      plan?.knowledgeNeeds
    )
      ? plan.knowledgeNeeds.join(
          " "
        )
      : "";

  const researchQuery =
    Array.isArray(
      plan?.researchSignals
    )
      ? plan.researchSignals.join(
          " "
        )
      : "";

  const adjacentQuery =
    [
      plan?.audienceNeed,
      plan?.contentAngle,
      ...(plan?.researchSignals || []),
      ...(plan?.knowledgeNeeds || []),
    ]
      .filter(Boolean)
      .join(" ");

  const direct =
    overlapScore(
      directQuery,
      searchable
    );

  const audience =
    overlapScore(
      audienceQuery,
      searchable
    );

  const strategic =
    overlapScore(
      strategicQuery,
      searchable
    );

  let expert =
    overlapScore(
      expertQuery,
      searchable
    );

  if (
    item.domain ===
    "01_KNOWLEDGE"
  ) {
    expert =
      Math.min(
        100,
        40 +
          expert * 0.6
      );
  }

  const research =
    overlapScore(
      researchQuery,
      searchable
    );

  const adjacentRaw =
    overlapScore(
      adjacentQuery,
      searchable
    );

  const role =
    categoryRole(
      item
    );

  let adjacent =
    adjacentRaw;

  if (
    role === "audience" ||
    role === "expert" ||
    role === "research"
  ) {
    adjacent =
      Math.min(
        100,
        adjacentRaw + 10
      );
  }

  const freshness =
    radarFreshnessScore(
      item
    );

  const confidence =
    confidenceScore(
      item
    );

  const novelty =
    noveltyScore(
      item
    );

  const contentDepth =
    contentDepthScore(
      content
    );

  const sourcePriority =
    sourcePriorityScore(
      item,
      plan
    );

  const navigationPenalty =
    isNavigationItem(
      item
    )
      ? -18
      : 0;

  const placeholderPenalty =
    isTechnicalPlaceholder(
      item
    )
      ? -100
      : 0;

  const shallowPenalty =
    contentDepth < 25
      ? -12
      : 0;

  /*
   * Важный принцип:
   * прямое смысловое соответствие
   * важнее свежести/priority.
   */
  let score =
    direct * 0.26 +
    audience * 0.15 +
    strategic * 0.10 +
    expert * 0.12 +
    adjacent * 0.11 +
    freshness * 0.05 +
    confidence * 0.06 +
    novelty * 0.04 +
    contentDepth * 0.06 +
    sourcePriority * 0.05;

  /*
   * Radar получает дополнительный бонус
   * только когда он реально относится
   * к задаче.
   */
  if (
    item.type ===
    "radar_signal"
  ) {
    const radarRelevance =
      Number(
        item.radarMetadata
          ?.relevance || 0
      );

    const radarCategory =
      String(
        item.radarMetadata
          ?.primaryCategory || ""
      );

    const radarContext =
      item.radarMetadata
        ?.context || {};

    const radarTopicFit =
      overlapScore(
        directQuery,
        [
          item.title,
          item.purpose,
          radarCategory,
          Object.keys(
            item.radarMetadata
              ?.matchedCategories ||
              {}
          ),
        ]
          .flat()
          .join(" ")
      );

    const localBonus =
      radarContext.local &&
      normalize(
        String(
          plan?.audience || ""
        )
      ).includes(
        "серпухов"
      )
        ? 8
        : 0;

    if (
      radarTopicFit >= 20 ||
      audience >= 20 ||
      strategic >= 20
    ) {
      score +=
        Math.min(
          8,
          radarRelevance / 12
        ) +
        localBonus;
    } else {
      score -= 4;
    }
  }

  score +=
    Math.min(
      5,
      Math.max(
        0,
        (item.priority || 0) /
          20
      )
    );

  score +=
    navigationPenalty +
    placeholderPenalty +
    shallowPenalty;

  if (
    role === "research" &&
    research >= 20
  ) {
    score += 4;
  }

  if (
    role === "expert" &&
    expert >= 25
  ) {
    score += 4;
  }

  if (
    role === "audience" &&
    audience >= 25
  ) {
    score += 4;
  }

  if (
    role === "strategic" &&
    strategic >= 25
  ) {
    score += 3;
  }

  const reasons: string[] = [];

  if (direct >= 25) {
    reasons.push(
      "direct topic match"
    );
  }

  if (audience >= 25) {
    reasons.push(
      "audience match"
    );
  }

  if (strategic >= 25) {
    reasons.push(
      "strategic match"
    );
  }

  if (expert >= 25) {
    reasons.push(
      "expert relevance"
    );
  }

  if (research >= 25) {
    reasons.push(
      "research relevance"
    );
  }

  if (adjacent >= 25) {
    reasons.push(
      "adjacent relevance"
    );
  }

  if (
    contentDepth >= 70
  ) {
    reasons.push(
      "substantive source"
    );
  }

  if (
    item.type ===
    "radar_signal"
  ) {
    reasons.push(
      "radar signal"
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
    item,

    score:
      Math.round(
        score * 100
      ) / 100,

    reasons,

    match: {
      direct:
        Math.round(
          direct
        ),

      audience:
        Math.round(
          audience
        ),

      strategic:
        Math.round(
          strategic
        ),

      expert:
        Math.round(
          expert
        ),

      adjacent:
        Math.round(
          adjacent
        ),

      freshness:
        Math.round(
          freshness
        ),

      confidence:
        Math.round(
          confidence
        ),

      novelty:
        Math.round(
          novelty
        ),

      contentDepth:
        Math.round(
          contentDepth
        ),

      sourcePriority:
        Math.round(
          sourcePriority
        ),
    },
  };
}

function canBeSelected(
  candidate: RetrievalCandidate
): boolean {
  if (
    isTechnicalPlaceholder(
      candidate.item
    )
  ) {
    return false;
  }

  /*
   * README и INDEX допускаются
   * только если у них есть реальная
   * содержательная связь и нет лучшего
   * содержательного кандидата.
   */
  if (
    isNavigationItem(
      candidate.item
    ) &&
    candidate.match.contentDepth <
      60
  ) {
    return false;
  }

  return candidate.score >=
    18;
}

function classifyBucket(
  candidate: RetrievalCandidate
): string {
  const item =
    candidate.item;

  if (
    item.type ===
    "radar_signal"
  ) {
    return "radar";
  }

  if (
    item.domain ===
    "03_AUDIENCE"
  ) {
    return "audience";
  }

  if (
    item.domain ===
    "01_KNOWLEDGE"
  ) {
    return "expert";
  }

  if (
    item.domain ===
    "02_RESEARCH"
  ) {
    return "research";
  }

  if (
    item.domain ===
      "04_CONTENT" ||
    item.domain ===
      "05_SEO"
  ) {
    return "strategic";
  }

  if (
    candidate.match.direct >= 25
  ) {
    return "direct";
  }

  if (
    candidate.match.adjacent >= 25
  ) {
    return "adjacent";
  }

  return "other";
}

function diversify(
  ranked: RetrievalCandidate[],
  limits = DEFAULT_LIMITS
): RetrievalCandidate[] {
  const buckets: Record<
    string,
    RetrievalCandidate[]
  > = {
    direct: [],
    audience: [],
    expert: [],
    research: [],
    adjacent: [],
    radar: [],
    strategic: [],
    other: [],
  };

  const sorted =
    [...ranked]
      .filter(
        canBeSelected
      )
      .sort(
        (
          a,
          b
        ) =>
          b.score -
          a.score
      );

  for (
    const candidate of sorted
  ) {
    const bucket =
      classifyBucket(
        candidate
      );

    buckets[bucket].push(
      candidate
    );
  }

  const selected: RetrievalCandidate[] =
    [];

  const used =
    new Set<string>();

  const take =
    (
      bucket: RetrievalCandidate[],
      count: number
    ) => {
      for (
        const candidate of bucket
      ) {
        if (
          selected.length >=
            limits.selectedTotal ||
          count <= 0
        ) {
          break;
        }

        const key =
          candidate.item.path;

        if (
          used.has(key)
        ) {
          continue;
        }

        used.add(key);
        selected.push(
          candidate
        );
        count--;
      }
    };

  /*
   * Сначала покрываем смысловые роли.
   */
  take(
    buckets.direct,
    limits.direct
  );

  take(
    buckets.audience,
    limits.audience
  );

  take(
    buckets.expert,
    limits.expert
  );

  take(
    buckets.research,
    limits.research
  );

  take(
    buckets.adjacent,
    limits.adjacent
  );

  take(
    buckets.strategic,
    limits.strategic
  );

  take(
    buckets.radar,
    limits.radar
  );

  /*
   * Потом добираем лучшие оставшиеся
   * содержательные источники.
   */
  for (
    const candidate of sorted
  ) {
    if (
      selected.length >=
      limits.selectedTotal
    ) {
      break;
    }

    const key =
      candidate.item.path;

    if (
      used.has(key)
    ) {
      continue;
    }

    used.add(key);
    selected.push(
      candidate
    );
  }

  return selected.slice(
    0,
    limits.selectedTotal
  );
}

export async function loadLibraryMap(
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

export async function discoverAndRank(
  libraryMap: any,
  plan: any,
  limits = DEFAULT_LIMITS,
  projectRoot = process.cwd()
): Promise<KnowledgePackage> {
  const allItems =
    Array.isArray(
      libraryMap?.items
    )
      ? libraryMap.items
      : [];

  const scored =
    await Promise.all(
      allItems.map(
        (item: any) =>
          relevanceFor(
            item,
            plan,
            projectRoot
          )
      )
    );

  const ranked =
    scored.sort(
      (
        a,
        b
      ) =>
        b.score -
        a.score
    );

  const candidates =
    ranked.slice(
      0,
      limits.discoveryPool
    );

  const selected =
    diversify(
      ranked,
      limits
    );

  const composition = {
    direct:
      selected.filter(
        x =>
          classifyBucket(
            x
          ) ===
          "direct"
      ).length,

    audience:
      selected.filter(
        x =>
          classifyBucket(
            x
          ) ===
          "audience"
      ).length,

    expert:
      selected.filter(
        x =>
          classifyBucket(
            x
          ) ===
          "expert"
      ).length,

    research:
      selected.filter(
        x =>
          classifyBucket(
            x
          ) ===
          "research"
      ).length,

    adjacent:
      selected.filter(
        x =>
          classifyBucket(
            x
          ) ===
          "adjacent"
      ).length,

    radar:
      selected.filter(
        x =>
          classifyBucket(
            x
          ) ===
          "radar"
      ).length,

    strategic:
      selected.filter(
        x =>
          classifyBucket(
            x
          ) ===
          "strategic"
      ).length,

    total:
      selected.length,
  };

  return {
    generatedAt:
      new Date().toISOString(),

    query: {
      audience:
        plan?.audience || "",

      topic:
        plan?.topic || "",

      subtopic:
        plan?.subtopic || "",

      goal:
        plan?.goal || "",

      audienceNeed:
        plan?.audienceNeed || "",

      keyMessage:
        plan?.keyMessage || "",

      contentAngle:
        plan?.contentAngle || "",

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

    candidates,

    selected,

    composition,
  };
}

export function formatKnowledgePackage(
  pkg: KnowledgePackage
): string {
  const blocks =
    pkg.selected.map(
      (
        candidate,
        index
      ) => {
        const item =
          candidate.item;

        return `
==================================================
SOURCE ${index + 1}: ${item.path}
ROLE: ${item.sourceRole}
TYPE: ${item.type}
SCORE: ${candidate.score}
REASONS: ${
          candidate.reasons.join(
            ", "
          ) ||
          "relevant project source"
        }
==================================================
TITLE: ${item.title}
PURPOSE: ${item.purpose}
KEYWORDS: ${
          (
            item.keywords ||
            []
          ).join(", ")
        }
CONTENT DEPTH: ${
          candidate.match
            .contentDepth
        }
RADAR METADATA: ${
          item.radarMetadata
            ? JSON.stringify(
                item.radarMetadata
              )
            : "none"
        }
==================================================
`;
      }
    );

  return blocks.join(
    "\n"
  );
}