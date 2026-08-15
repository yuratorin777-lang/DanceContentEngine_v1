import fs from "node:fs/promises";
import path from "node:path";

export type LibraryDomain =
  | "00_SYSTEM"
  | "01_KNOWLEDGE"
  | "02_RESEARCH"
  | "03_AUDIENCE"
  | "04_CONTENT"
  | "05_SEO"
  | "06_ANALYTICS"
  | "07_AUTOMATION"
  | "08_INPUT"
  | "09_ARCHIVE";

export type LibraryItemType =
  | "index"
  | "readme"
  | "rules"
  | "research"
  | "audience"
  | "content"
  | "seo"
  | "analytics"
  | "automation"
  | "knowledge"
  | "input"
  | "data"
  | "config"
  | "code"
  | "document"
  | "radar_signal"
  | "other";

export type RadarMetadata = {
  signalId?: string;
  relevance?: number;
  relevanceLevel?: string;
  danceRelevance?: number;
  audienceRelevance?: number;
  contentRelevance?: number;
  localRelevance?: number;
  importance?: number;
  freshness?: number;
  sourceConfidence?: number;
  primaryCategory?: string;
  matchedCategories?: Record<string, string[]>;
  context?: {
    local?: boolean;
    russia?: boolean;
    global?: boolean;
  };
  confidence?: number;
  isFact?: boolean;
  source?: string;
  url?: string;
  observedDate?: string;
  collectedAt?: string;
  publishedAt?: string;
  sourceType?: string;
};

export type LibraryItem = {
  path: string;
  domain: LibraryDomain;
  fileName: string;
  extension: string;
  type: LibraryItemType;
  title: string;
  purpose: string;
  priority: number;
  size: number;
  modifiedAt: string;
  keywords: string[];
  sourceRole: string;
  radarMetadata?: RadarMetadata | null;
};

export type LibraryMap = {
  generatedAt: string;
  project: string;
  version: "1.1";
  domains: Record<string, number>;
  items: LibraryItem[];
};

const DOMAINS: LibraryDomain[] = [
  "00_SYSTEM",
  "01_KNOWLEDGE",
  "02_RESEARCH",
  "03_AUDIENCE",
  "04_CONTENT",
  "05_SEO",
  "06_ANALYTICS",
  "07_AUTOMATION",
  "08_INPUT",
  "09_ARCHIVE",
];

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "dist",
  "build",
  "coverage",
  "history",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".ico",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".lock",
]);

const EXCLUDED_GENERATED_PATHS = new Set([
  "07_AUTOMATION/knowledge-retrieval/runtime/retrieval-test.json",
  "07_AUTOMATION/knowledge-retrieval/runtime/library-map.json",
  "07_AUTOMATION/knowledge-retrieval/test-retriever.ts",
]);

const RADAR_LATEST_PATH =
  "07_AUTOMATION/Rardar_world feed/runtime/latest.json";

function normalize(input: string): string {
  return input.replace(/\\/g, "/");
}

function isDomain(
  value: string
): value is LibraryDomain {
  return DOMAINS.includes(
    value as LibraryDomain
  );
}

function getDomain(
  relativePath: string
): LibraryDomain | null {
  const first =
    normalize(relativePath).split("/")[0];

  return isDomain(first)
    ? first
    : null;
}

function getPriority(
  relativePath: string
): number {
  const p = normalize(relativePath);

  if (
    p.endsWith("SYSTEM_INDEX.md") ||
    p.endsWith("KNOWLEDGE_INDEX.md") ||
    p.endsWith("RESEARCH_INDEX.md") ||
    p.endsWith("AUDIENCE_INDEX.md") ||
    p.endsWith("CONTENT_INDEX.md") ||
    p.endsWith("SEO_INDEX.md") ||
    p.endsWith("ANALYTICS_INDEX.md") ||
    p.endsWith("AUTOMATION_INDEX.md") ||
    p.endsWith("INPUT_INDEX.md")
  ) {
    return 100;
  }

  if (p.endsWith("README.md")) {
    return 95;
  }

  if (
    p.includes("RADAR") ||
    p.includes("radar")
  ) {
    return 90;
  }

  const domain = getDomain(p);

  const domainPriority: Record<
    string,
    number
  > = {
    "00_SYSTEM": 95,
    "01_KNOWLEDGE": 90,
    "02_RESEARCH": 85,
    "03_AUDIENCE": 80,
    "04_CONTENT": 75,
    "05_SEO": 70,
    "06_ANALYTICS": 65,
    "07_AUTOMATION": 60,
    "08_INPUT": 55,
    "09_ARCHIVE": 30,
  };

  return domain
    ? (domainPriority[domain] ?? 30)
    : 30;
}

function detectType(
  relativePath: string
): LibraryItemType {
  const p =
    normalize(relativePath);

  const name =
    path.basename(p).toLowerCase();

  const ext =
    path.extname(name);

  if (name === "readme.md") {
    return "readme";
  }

  if (
    name.includes("index") &&
    ext === ".md"
  ) {
    return "index";
  }

  if (
    name.includes("rule") ||
    name.includes("rules")
  ) {
    return "rules";
  }

  if (
    name.includes("research") ||
    p.startsWith("02_RESEARCH/")
  ) {
    return "research";
  }

  if (
    p.startsWith("03_AUDIENCE/")
  ) {
    return "audience";
  }

  if (
    p.startsWith("04_CONTENT/")
  ) {
    return "content";
  }

  if (
    p.startsWith("05_SEO/")
  ) {
    return "seo";
  }

  if (
    p.startsWith("06_ANALYTICS/")
  ) {
    return "analytics";
  }

  if (p === RADAR_LATEST_PATH) {
    return "data";
  }

  if (
    p.startsWith("07_AUTOMATION/")
  ) {
    if (
      ext === ".json" ||
      name.includes("config")
    ) {
      return "config";
    }

    if (
      ext === ".js" ||
      ext === ".ts"
    ) {
      return "code";
    }

    return "automation";
  }

  if (
    p.startsWith("08_INPUT/")
  ) {
    return "input";
  }

  if (
    p.startsWith("01_KNOWLEDGE/")
  ) {
    return "knowledge";
  }

  if (ext === ".json") {
    return "data";
  }

  if (
    ext === ".js" ||
    ext === ".ts"
  ) {
    return "code";
  }

  if (
    [".md", ".txt"].includes(ext)
  ) {
    return "document";
  }

  return "other";
}

function extractTitle(
  content: string,
  fileName: string
): string {
  const heading =
    content.match(
      /^#\s+(.+)$/m
    );

  return (
    heading?.[1]?.trim() ||
    fileName.replace(
      /\.[^.]+$/,
      ""
    )
  );
}

function extractPurpose(
  content: string,
  fileName: string
): string {
  const normalized =
    content.replace(/\r/g, "");

  const lines =
    normalized
      .split("\n")
      .map(
        line => line.trim()
      )
      .filter(Boolean);

  const nonHeading =
    lines.find(
      line =>
        !line.startsWith("#") &&
        !line.startsWith("-") &&
        !line.startsWith("*") &&
        !line.startsWith("```")
    );

  return (
    nonHeading ||
    `Материал ${fileName}`
  ).slice(0, 500);
}

function extractKeywords(
  content: string,
  fileName: string
): string[] {
  const source =
    `${fileName} ${content.slice(
      0,
      12000
    )}`.toLowerCase();

  const tokens =
    source
      .replace(
        /[^a-zа-яё0-9_\- ]/gi,
        " "
      )
      .split(/\s+/)
      .filter(
        token =>
          token.length >= 5
      )
      .filter(
        token =>
          !/^[0-9]+$/.test(
            token
          )
      );

  const stop =
    new Set([
      "about",
      "which",
      "there",
      "their",
      "these",
      "those",
      "project",
      "данные",
      "которые",
      "который",
      "может",
      "должен",
      "должны",
      "после",
      "система",
      "только",
      "будет",
      "этому",
      "этого",
      "также",
      "если",
    ]);

  const counts =
    new Map<
      string,
      number
    >();

  for (
    const token of tokens
  ) {
    if (
      stop.has(token)
    ) {
      continue;
    }

    counts.set(
      token,
      (counts.get(token) || 0) + 1
    );
  }

  return [
    ...counts.entries(),
  ]
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        a[0].localeCompare(
          b[0]
        )
    )
    .slice(0, 20)
    .map(
      ([token]) => token
    );
}

function inferSourceRole(
  domain: LibraryDomain,
  type: LibraryItemType
): string {
  if (
    domain === "00_SYSTEM"
  ) {
    return "system-governance";
  }

  if (
    domain === "01_KNOWLEDGE"
  ) {
    return "expert-knowledge";
  }

  if (
    domain === "02_RESEARCH"
  ) {
    return "research-evidence";
  }

  if (
    domain === "03_AUDIENCE"
  ) {
    return "audience-context";
  }

  if (
    domain === "04_CONTENT"
  ) {
    return "content-methodology";
  }

  if (
    domain === "05_SEO"
  ) {
    return "search-context";
  }

  if (
    domain === "06_ANALYTICS"
  ) {
    return "measurement";
  }

  if (
    domain === "07_AUTOMATION"
  ) {
    if (
      type === "radar_signal"
    ) {
      return "radar-external-signal";
    }

    return "automation-context";
  }

  if (
    domain === "08_INPUT"
  ) {
    return "raw-input";
  }

  if (
    domain === "09_ARCHIVE"
  ) {
    return "archive";
  }

  return type;
}

function getFirstString(
  value: unknown
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function getFirstNumber(
  value: unknown
): number | undefined {
  return typeof value === "number"
    ? value
    : undefined;
}

function getBoolean(
  value: unknown
): boolean | undefined {
  return typeof value === "boolean"
    ? value
    : undefined;
}

function extractRadarMetadataFromSignal(
  signal: any,
  index: number
): RadarMetadata {
  const analysis =
    signal?.analysis ?? {};

  return {
    signalId:
      getFirstString(
        signal?.id
      ) ??
      `radar-signal-${index + 1}`,

    relevance:
      getFirstNumber(
        analysis?.relevance
      ),

    relevanceLevel:
      getFirstString(
        analysis?.relevanceLevel
      ),

    danceRelevance:
      getFirstNumber(
        analysis?.dance_relevance
      ),

    audienceRelevance:
      getFirstNumber(
        analysis?.audience_relevance
      ),

    contentRelevance:
      getFirstNumber(
        analysis?.content_relevance
      ),

    localRelevance:
      getFirstNumber(
        analysis?.local_relevance
      ),

    importance:
      getFirstNumber(
        analysis?.importance
      ),

    freshness:
      getFirstNumber(
        analysis?.freshness
      ),

    sourceConfidence:
      getFirstNumber(
        analysis?.source_confidence
      ),

    primaryCategory:
      getFirstString(
        analysis?.primaryCategory
      ),

    matchedCategories:
      analysis?.matchedCategories,

    context:
      analysis?.context,

    confidence:
      getFirstNumber(
        analysis?.confidence
      ),

    isFact:
      getBoolean(
        analysis?.isFact
      ),

    source:
      getFirstString(
        signal?.source
      ),

    url:
      getFirstString(
        signal?.url
      ),

    observedDate:
      getFirstString(
        signal?.observedDate
      ) ??
      getFirstString(
        signal?.observed_at
      ),

    collectedAt:
      getFirstString(
        signal?.collectedAt
      ) ??
      getFirstString(
        signal?.collected_at
      ),

    publishedAt:
      getFirstString(
        signal?.publishedAt
      ) ??
      getFirstString(
        signal?.published_at
      ),

    sourceType:
      getFirstString(
        signal?.sourceType
      ) ??
      getFirstString(
        signal?.source_type
      ),
  };
}

function extractRadarSignalText(
  signal: any
): string {
  const chunks = [
    signal?.title,
    signal?.content,
    signal?.summary,
    signal?.description,
    signal?.text,
  ];

  return chunks
    .filter(
      value =>
        typeof value ===
          "string" &&
        value.trim()
    )
    .join("\n\n")
    .trim();
}

function buildRadarSignalItem(
  signal: any,
  index: number
): LibraryItem {
  const signalMetadata =
    extractRadarMetadataFromSignal(
      signal,
      index
    );

  const signalText =
    extractRadarSignalText(
      signal
    );

  const title =
    getFirstString(
      signal?.title
    ) ||
    `Radar Signal ${
      index + 1
    }`;

  const source =
    getFirstString(
      signal?.source
    ) ||
    "Radar / World Feed";

  const signalPath =
    `${RADAR_LATEST_PATH}#signal-${
      signalMetadata.signalId ||
      index + 1
    }`;

  return {
    path: signalPath,
    domain: "07_AUTOMATION",

    fileName:
      `${signalMetadata.signalId ||
        `signal-${index + 1}`}.json`,

    extension: ".json",
    type: "radar_signal",

    title,

    purpose:
      signalText
        ? signalText.slice(
            0,
            500
          )
        : `External Radar signal from ${source}`,

    priority:
      Math.max(
        60,
        Math.min(
          100,
          Math.round(
            signalMetadata.relevance ??
              60
          )
        )
      ),

    size:
      Buffer.byteLength(
        JSON.stringify(
          signal
        ),
        "utf8"
      ),

    modifiedAt:
      signalMetadata.collectedAt ||
      new Date().toISOString(),

    keywords:
      extractKeywords(
        signalText,
        title
      ),

    sourceRole:
      "radar-external-signal",

    radarMetadata:
      signalMetadata,
  };
}

async function loadRadarSignals(
  projectRoot: string
): Promise<LibraryItem[]> {
  const radarPath =
    path.join(
      projectRoot,
      "07_AUTOMATION",
      "Rardar_world feed",
      "runtime",
      "latest.json"
    );

  try {
    const raw =
      await fs.readFile(
        radarPath,
        "utf8"
      );

    const parsed =
      JSON.parse(raw);

    const signals =
      Array.isArray(
        parsed?.signals
      )
        ? parsed.signals
        : [];

    return signals.map(
      (
        signal: any,
        index: number
      ) =>
        buildRadarSignalItem(
          signal,
          index
        )
    );
  } catch {
    return [];
  }
}

async function walk(
  currentDir: string,
  projectRoot: string,
  output: LibraryItem[]
): Promise<void> {
  let entries;

  try {
    entries =
      await fs.readdir(
        currentDir,
        {
          withFileTypes: true,
        }
      );
  } catch {
    return;
  }

  for (
    const entry of entries
  ) {
    if (
      EXCLUDED_DIRS.has(
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
      normalize(
        path.relative(
          projectRoot,
          absolutePath
        )
      );

      if (
  relativePath.startsWith(
    "07_AUTOMATION/knowledge-retrieval/runtime/"
  )
) {
  continue;
}

if (
  EXCLUDED_GENERATED_PATHS.has(
    relativePath
  )
) {
  continue;
}

    if (
      entry.isDirectory()
    ) {
      const domain =
        getDomain(
          relativePath
        );

      if (
        path.dirname(
          relativePath
        ) === "." &&
        !domain
      ) {
        continue;
      }

      await walk(
        absolutePath,
        projectRoot,
        output
      );

      continue;
    }

    if (
      !entry.isFile()
    ) {
      continue;
    }

    const extension =
      path
        .extname(
          entry.name
        )
        .toLowerCase();

    if (
      EXCLUDED_EXTENSIONS.has(
        extension
      )
    ) {
      continue;
    }

    const domain =
      getDomain(
        relativePath
      );

    if (!domain) {
      continue;
    }

    if (
      relativePath ===
      RADAR_LATEST_PATH
    ) {
      continue;
    }

    let stat;

    try {
      stat =
        await fs.stat(
          absolutePath
        );
    } catch {
      continue;
    }

    let content = "";

    if (
      [
        ".md",
        ".txt",
        ".json",
      ].includes(extension) &&
      stat.size <=
        1_000_000
    ) {
      try {
        content =
          await fs.readFile(
            absolutePath,
            "utf8"
          );
      } catch {
        content = "";
      }
    }

    const type =
      detectType(
        relativePath
      );

    output.push({
      path: relativePath,
      domain,
      fileName: entry.name,
      extension,
      type,

      title:
        extractTitle(
          content,
          entry.name
        ),

      purpose:
        extractPurpose(
          content,
          entry.name
        ),

      priority:
        getPriority(
          relativePath
        ),

      size: stat.size,

      modifiedAt:
        stat.mtime.toISOString(),

      keywords:
        extractKeywords(
          content,
          entry.name
        ),

      sourceRole:
        inferSourceRole(
          domain,
          type
        ),

      radarMetadata: null,
    });
  }
}

export async function buildLibraryMap(
  projectRoot: string
): Promise<LibraryMap> {
  const items: LibraryItem[] = [];

  await walk(
    projectRoot,
    projectRoot,
    items
  );

  const radarSignals =
    await loadRadarSignals(
      projectRoot
    );

  items.push(
    ...radarSignals
  );

  items.sort(
    (a, b) =>
      b.priority -
        a.priority ||
      a.domain.localeCompare(
        b.domain
      ) ||
      a.path.localeCompare(
        b.path
      )
  );

  const domains: Record<
    string,
    number
  > = {};

  for (
    const item of items
  ) {
    domains[item.domain] =
      (domains[item.domain] || 0) +
      1;
  }

  return {
    generatedAt:
      new Date().toISOString(),

    project:
      path.basename(
        projectRoot
      ),

    version:
      "1.1",

    domains,

    items,
  };
}

export async function writeLibraryMap(
  projectRoot: string,
  outputPath = path.join(
    projectRoot,
    "07_AUTOMATION",
    "knowledge-retrieval",
    "runtime",
    "library-map.json"
  )
): Promise<LibraryMap> {
  const map =
    await buildLibraryMap(
      projectRoot
    );

  await fs.mkdir(
    path.dirname(
      outputPath
    ),
    {
      recursive: true,
    }
  );

  await fs.writeFile(
    outputPath,
    JSON.stringify(
      map,
      null,
      2
    ),
    "utf8"
  );

  return map;
}

/*
 * ==================================================
 * STANDALONE LOCAL RUNNER
 * ==================================================
 *
 * Для локального запуска используем process.cwd(),
 * поэтому import.meta / __dirname не нужны.
 */

const projectRoot =
  path.resolve(
    process.cwd()
  );

writeLibraryMap(
  projectRoot
)
  .then(
    map => {
      console.log(
        "=============================================="
      );

      console.log(
        " DanceContentEngine — Librarian v1.1"
      );

      console.log(
        "=============================================="
      );

      console.log(
        `Project: ${map.project}`
      );

      console.log(
        `Indexed items: ${map.items.length}`
      );

      console.log(
        "\nDomains:"
      );

      for (
        const [
          domain,
          count,
        ] of Object.entries(
          map.domains
        )
      ) {
        console.log(
          `- ${domain}: ${count}`
        );
      }

      const radarCount =
        map.items.filter(
          item =>
            item.type ===
            "radar_signal"
        ).length;

      console.log(
        `\nRadar signals: ${radarCount}`
      );

      console.log(
        "\nSaved: 07_AUTOMATION/knowledge-retrieval/runtime/library-map.json"
      );
    }
  )
  .catch(
    error => {
      console.error(
        "LIBRARIAN FAILED:",
        error
      );

      process.exit(1);
    }
  );