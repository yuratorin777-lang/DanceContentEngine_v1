const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');

const CONFIG = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'config.json'),
    'utf8'
  )
);

const RUNTIME = path.join(ROOT, 'runtime');
const HISTORY = path.join(RUNTIME, 'history');

function ensureDirs() {
  fs.mkdirSync(RUNTIME, { recursive: true });
  fs.mkdirSync(HISTORY, { recursive: true });
}

function fetchUrl(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://')
      ? https
      : http;

    const req = client.get(
      url,
      {
        headers: {
          'User-Agent':
            'DanceContentEngine-Radar/1.2',
          'Accept':
            'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
        }
      },
      res => {
        let data = '';

        res.setEncoding('utf8');

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            const redirectedUrl = new URL(
              res.headers.location,
              url
            ).toString();

            return fetchUrl(
              redirectedUrl,
              timeoutMs
            )
              .then(resolve)
              .catch(reject);
          }

          if (
            res.statusCode < 200 ||
            res.statusCode >= 300
          ) {
            reject(
              new Error(
                `HTTP ${res.statusCode}`
              )
            );
            return;
          }

          resolve(data);
        });
      }
    );

    req.setTimeout(
      timeoutMs,
      () =>
        req.destroy(
          new Error('Request timeout')
        )
    );

    req.on('error', reject);
  });
}

function decodeEntities(s = '') {
  return s
    .replace(
      /<!\[CDATA\[([\s\S]*?)\]\]>/gi,
      '$1'
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(
      /&#(\d+);/g,
      (_, n) =>
        String.fromCharCode(Number(n))
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, n) =>
        String.fromCharCode(
          parseInt(n, 16)
        )
    );
}

function clean(s = '') {
  return decodeEntities(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block, name) {
  const re = new RegExp(
    `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,
    'i'
  );

  const match = block.match(re);

  return match
    ? clean(match[1])
    : '';
}

function extractLink(block) {
  const hrefMatches = [
    ...block.matchAll(
      /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/gi
    )
  ];

  if (hrefMatches.length) {
    for (const match of hrefMatches) {
      const tag = match[0].toLowerCase();

      if (
        tag.includes('alternate') ||
        tag.includes('text/html')
      ) {
        return decodeEntities(
          match[1].trim()
        );
      }
    }

    return decodeEntities(
      hrefMatches[0][1].trim()
    );
  }

  const linkMatch = block.match(
    /<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i
  );

  if (linkMatch) {
    const value = clean(
      linkMatch[1]
    );

    if (value) {
      return value;
    }
  }

  const guidMatch = block.match(
    /<guid[^>]*>([\s\S]*?)<\/guid>/i
  );

  if (guidMatch) {
    const guid = clean(
      guidMatch[1]
    );

    if (/^https?:\/\//i.test(guid)) {
      return guid;
    }
  }

  return '';
}

function extractPublished(block) {
  const candidates = [
    extractTag(block, 'pubDate'),
    extractTag(block, 'published'),
    extractTag(block, 'updated'),
    extractTag(block, 'dc:date')
  ].filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  const parsed = new Date(
    candidates[0]
  );

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed.toISOString();
}

function parseRSS(xml, source) {
  const blocks = [];

  const rssItems =
    xml.match(
      /<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi
    ) || [];

  const atomEntries =
    xml.match(
      /<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi
    ) || [];

  const items =
    rssItems.length
      ? rssItems
      : atomEntries;

  for (
    const block of items.slice(
      0,
      CONFIG.limits.itemsPerSource
    )
  ) {
    const title =
      extractTag(
        block,
        'title'
      );

    if (!title) {
      continue;
    }

    const url =
      extractLink(block);

    const content =
      extractTag(
        block,
        'description'
      ) ||
      extractTag(
        block,
        'content'
      ) ||
      extractTag(
        block,
        'summary'
      );

    const publishedAt =
      extractPublished(block);

    const normalizedTitle =
      title
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    const normalizedUrl =
      url
        .trim()
        .toLowerCase();

    const identity =
      `${normalizedUrl}|${normalizedTitle}`;

    const id =
      Buffer
        .from(identity, 'utf8')
        .toString('base64')
        .replace(
          /[^a-zA-Z0-9]/g,
          ''
        )
        .slice(0, 64);

    blocks.push({
      id,

      source: source.name,
      sourceScope: source.scope,
      sourceWeight: source.weight,

      title,
      url,

      content:
        clean(content).slice(
          0,
          3000
        ),

      publishedAt,

      collectedAt:
        new Date().toISOString()
    });
  }

  return blocks;
}

/**
 * Radar classification.
 *
 * ВАЖНО:
 * Radar не принимает решение,
 * делать ли из материала контент.
 *
 * Он только определяет:
 * 1. к какой области относится материал;
 * 2. насколько он связан с нашей системой;
 * 3. локальный / российский / мировой контекст;
 * 4. какие смысловые категории обнаружены.
 */

function classifyFact(fact) {
  const text =
    `${fact.title} ${fact.content}`
      .toLowerCase();

  const hits = {};

  for (
    const [category, words]
    of Object.entries(
      CONFIG.categories
    )
  ) {
    const found =
      words.filter(word =>
        text.includes(
          word.toLowerCase()
        )
      );

    if (found.length) {
      hits[category] = [
        ...new Set(found)
      ].slice(0, 8);
    }
  }

  const has =
    category => !!hits[category];

  const hasCore =
    has('CORE_DANCE');

  const hasChild =
    has('CHILD_DEVELOPMENT');

  const hasHealth =
    has('HEALTH_SAFETY');

  const hasNutrition =
    has('NUTRITION');

  const hasPsychology =
    has('PSYCHOLOGY_PEDAGOGY');

  const hasActivity =
    has('ACTIVITY_CONTEXT');

  const hasLocal =
    has('LOCAL_ECOSYSTEM');

  const hasWorld =
    has('DANCE_WORLD');

  const hasContentSignal =
    has('CONTENT_SIGNAL');

  const adjacent =
    hasChild ||
    hasHealth ||
    hasNutrition ||
    hasPsychology ||
    hasActivity;

  /*
   * Relevance is intentionally broad.
   *
   * We are building an information radar,
   * not a content selector.
   */

  let relevance = 0;

  if (hasCore) {
    relevance += 40;
  }

  if (hasWorld) {
    relevance += 20;
  }

  if (hasLocal) {
    relevance += 25;
  }

  if (adjacent) {
    relevance += 20;
  }

  if (
    hasCore &&
    adjacent
  ) {
    relevance += 20;
  }

  if (
    hasLocal &&
    adjacent
  ) {
    relevance += 15;
  }

  if (
    hasWorld &&
    hasCore
  ) {
    relevance += 15;
  }

  if (
    hasContentSignal
  ) {
    relevance += 5;
  }

  /*
   * Source weight influences
   * ranking, but does not destroy
   * the original signal.
   */

  relevance = Math.round(
    relevance *
    (fact.sourceWeight || 1)
  );

  relevance =
    Math.max(
      0,
      Math.min(
        100,
        relevance
      )
    );

  /*
   * Broad information classes.
   */

  let primaryCategory =
    'OTHER';

  if (
    hasLocal &&
    hasCore
  ) {
    primaryCategory =
      'LOCAL_DANCE';
  } else if (
    hasWorld &&
    hasCore
  ) {
    primaryCategory =
      'DANCE_WORLD';
  } else if (
    hasCore
  ) {
    primaryCategory =
      'CORE_DANCE';
  } else if (
    hasChild ||
    hasHealth ||
    hasNutrition ||
    hasPsychology ||
    hasActivity
  ) {
    primaryCategory =
      'ADJACENT_DOMAIN';
  } else if (
    hasLocal
  ) {
    primaryCategory =
      'LOCAL_ECOSYSTEM';
  }

  let relevanceLevel =
    'LOW';

  if (relevance >= 70) {
    relevanceLevel =
      'HIGH';
  } else if (
    relevance >= 45
  ) {
    relevanceLevel =
      'MEDIUM';
  }

  return {
    relevance,
    relevanceLevel,

    primaryCategory,

    matchedCategories:
      hits,

    context: {
      local:
        fact.sourceScope ===
          'LOCAL' ||
        hasLocal,

      russia:
        fact.sourceScope ===
          'RUSSIA',

      global:
        fact.sourceScope ===
          'GLOBAL' ||
        hasWorld
    },

    isFact: true,

    confidence:
      fact.url
        ? 0.8
        : 0.5
  };
}

async function collectSource(
  source
) {
  const started =
    Date.now();

  try {
    const xml =
      await fetchUrl(
        source.url
      );

    const facts =
      parseRSS(
        xml,
        source
      );

    return {
      source:
        source.name,

      ok: true,

      count:
        facts.length,

      durationMs:
        Date.now() -
        started,

      facts
    };
  } catch (error) {
    return {
      source:
        source.name,

      ok: false,

      count: 0,

      durationMs:
        Date.now() -
        started,

      error:
        error.message,

      facts: []
    };
  }
}

async function run() {
  ensureDirs();

  const started =
    Date.now();

  console.log(
    '=============================================='
  );

  console.log(
    ' DANCE CONTENT ENGINE — RADAR / WORLD FEED v1'
  );

  console.log(
    '=============================================='
  );

  console.log(
    `Sources: ${CONFIG.sources.length}`
  );

  console.log(
    'Collecting real external data...\n'
  );

  const results = [];

  for (
    const source of
    CONFIG.sources
  ) {
    process.stdout.write(
      `→ ${source.name} ... `
    );

    const result =
      await collectSource(
        source
      );

    results.push(
      result
    );

    console.log(
      result.ok
        ? `OK (${result.count})`
        : `ERROR: ${result.error}`
    );
  }

  const all =
    results.flatMap(
      result =>
        result.facts
    );

  /*
   * Deduplication.
   */

  const uniqueMap =
    new Map();

  let duplicates = 0;

  for (
    const fact of all
  ) {
    if (
      uniqueMap.has(
        fact.id
      )
    ) {
      duplicates++;
    } else {
      uniqueMap.set(
        fact.id,
        fact
      );
    }
  }

  const unique =
    [
      ...uniqueMap.values()
    ];

  /*
   * Classification.
   *
   * No aggressive content filtering.
   */

  const classified =
    unique.map(
      fact => ({
        ...fact,

        analysis:
          classifyFact(
            fact
          )
      })
    );

  const signals =
    classified
      .filter(
        fact =>
          fact.analysis.relevance >=
          CONFIG.limits.minRelevance
      )
      .sort(
        (a, b) =>
          b.analysis.relevance -
          a.analysis.relevance
      )
      .slice(
        0,
        CONFIG.limits.maxSignals
      );

  /*
   * Distribution.
   */

  const distribution = {};

  for (
    const fact of signals
  ) {
    const category =
      fact.analysis
        .primaryCategory;

    distribution[category] =
      (distribution[category] || 0) +
      1;
  }

  const output = {
    engine:
      'DanceContentEngine Radar / World Feed',

    version:
      CONFIG.version,

    runAt:
      new Date().toISOString(),

    realWorldData:
      true,

    focus: {
      local:
        CONFIG.location_focus,

      globalFeed:
        CONFIG.global_feed
    },

    statistics: {
      sourcesConfigured:
        CONFIG.sources.length,

      sourcesSucceeded:
        results.filter(
          r => r.ok
        ).length,

      sourcesFailed:
        results.filter(
          r => !r.ok
        ).length,

      rawFacts:
        all.length,

      uniqueFacts:
        unique.length,

      duplicatesRemoved:
        duplicates,

      classifiedFacts:
        classified.length,

      relevantSignals:
        signals.length,

      durationMs:
        Date.now() -
        started
    },

    distribution,

    sourceBreakdown:
      results.map(
        result => ({
          source:
            result.source,

          ok:
            result.ok,

          count:
            result.count,

          durationMs:
            result.durationMs,

          error:
            result.error ||
            null
        })
      ),

    signals
  };

  fs.writeFileSync(
    path.join(
      RUNTIME,
      'latest.json'
    ),
    JSON.stringify(
      output,
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(
      HISTORY,
      `radar_${new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          '-'
        )}.json`
    ),
    JSON.stringify(
      output,
      null,
      2
    )
  );

  console.log(
    '\n----------------------------------------------'
  );

  console.log(
    `Raw facts:          ${output.statistics.rawFacts}`
  );

  console.log(
    `Unique facts:       ${output.statistics.uniqueFacts}`
  );

  console.log(
    `Duplicates removed: ${output.statistics.duplicatesRemoved}`
  );

  console.log(
    `Classified facts:   ${output.statistics.classifiedFacts}`
  );

  console.log(
    `Relevant signals:   ${output.statistics.relevantSignals}`
  );

  console.log(
    'Saved: runtime/latest.json'
  );

  console.log(
    '----------------------------------------------'
  );

  console.log(
    '\nDISTRIBUTION:\n'
  );

  for (
    const [
      category,
      count
    ] of Object.entries(
      distribution
    )
  ) {
    console.log(
      `${category}: ${count}`
    );
  }

  if (
    signals.length
  ) {
    console.log(
      '\nTOP SIGNALS:\n'
    );

    for (
      const [
        index,
        signal
      ] of signals
        .slice(0, 10)
        .entries()
    ) {
      console.log(
        `${index + 1}. [${signal.analysis.relevance}] ${signal.title}`
      );

      console.log(
        `   ${signal.analysis.primaryCategory} | ${signal.source}`
      );

      console.log(
        `   ${signal.url}\n`
      );
    }
  }

  return output;
}

if (
  require.main ===
  module
) {
  run().catch(
    error => {
      console.error(
        '\nRADAR FAILED:',
        error
      );

      process.exit(1);
    }
  );
}

module.exports = {
  run,
  classifyFact,
  parseRSS
};