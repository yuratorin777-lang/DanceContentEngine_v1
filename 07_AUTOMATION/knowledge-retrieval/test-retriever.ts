import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  loadLibraryMap,
  discoverAndRank,
  formatKnowledgePackage,
  type RetrievalCandidate,
} from "./retriever.ts";

const currentFile = fileURLToPath(
  import.meta.url
);

const currentDir = path.dirname(
  currentFile
);

const projectRoot = path.resolve(
  currentDir,
  "../.."
);

const plan = {
  audience:
    "Родители детей дошкольного и младшего школьного возраста (3-8 лет) в Серпухове, ищущие развивающие и увлекательные внешкольные занятия.",

  topic:
    "Набор детей на новый танцевальный сезон",

  subtopic:
    "Преимущества танцев для развития ребенка и комфортная адаптация в школе",

  goal:
    "Привлечь новых родителей к записи детей на первое занятие или в группы нового танцевального сезона, подчеркивая положительный опыт ребенка, его развитие и комфортную адаптацию.",

  audienceNeed:
    "Родители хотят найти для ребенка занятие, которое будет ему нравиться, где будет хороший педагог, и где они увидят реальный прогресс, а также уверены в безопасности и комфортной адаптации.",

  keyMessage:
    "Танцы — это радость для ребенка, его гармоничное развитие и уверенность в себе под руководством внимательного педагога, с видимыми результатами и возможностью выступать на сцене.",

  contentAngle:
    "Фокус на радости и всестороннем развитии ребенка через танец, поддерживающей атмосфере, ощутимых результатах и легкой адаптации.",

  researchSignals: [
    "Удовольствие ребенка от занятий и позитивные отношения с педагогом являются важными факторами удовлетворенности родителей.",
    "Родители ценят видимый прогресс в координации, чувстве ритма, технике и уверенности.",
    "Возможности для выступлений являются видимым результатом для родителей.",
  ],

  knowledgeNeeds: [
    "Возрастные группы",
    "Танцевальные направления",
    "Педагогический подход",
    "Адаптация детей",
    "Прогресс ребенка",
    "Выступления",
  ],

  radarSignals: [
    "Новые исследования о связи танцев и позитивного эмоционального состояния детей.",
  ],

  seoConsiderations: [
    "Серпухов",
    "детские танцы Серпухов",
    "танцы для детей",
  ],

  constraints: [
    "Не придумывать цены.",
    "Не придумывать расписание.",
    "Не придумывать даты.",
    "Использовать первое занятие вместо пробного занятия.",
  ],

  sourcePriorities: [
    "02_RESEARCH",
    "03_AUDIENCE",
    "01_KNOWLEDGE",
    "07_AUTOMATION",
    "04_CONTENT",
    "05_SEO",
  ],
};

async function main(): Promise<void> {
  console.log(
    "=============================================="
  );

  console.log(
    " DanceContentEngine — Retrieval Test v1"
  );

  console.log(
    "=============================================="
  );

  console.log(
    `Project root: ${projectRoot}`
  );

  const libraryMap =
    await loadLibraryMap(
      projectRoot
    );

  console.log(
    `Library items: ${libraryMap.items.length}`
  );

  const pkg =
    await discoverAndRank(
      libraryMap,
      plan,
      undefined,
      projectRoot
    );

  console.log(
    "\n=== COMPOSITION ==="
  );

  console.log(
    JSON.stringify(
      pkg.composition,
      null,
      2
    )
  );

  console.log(
    "\n=== TOP CANDIDATES ==="
  );

  pkg.candidates
    .slice(0, 20)
    .forEach(
      (
        candidate: RetrievalCandidate,
        index: number
      ) => {
        console.log(
          `\n${index + 1}. ${candidate.score}`
        );

        console.log(
          `PATH: ${candidate.item.path}`
        );

        console.log(
          `TITLE: ${candidate.item.title}`
        );

        console.log(
          `ROLE: ${candidate.item.sourceRole}`
        );

        console.log(
          `TYPE: ${candidate.item.type}`
        );

        console.log(
          `MATCH: ${JSON.stringify(
            candidate.match
          )}`
        );

        console.log(
          `REASONS: ${
            candidate.reasons.join(
              ", "
            ) || "none"
          }`
        );
      }
    );

  console.log(
    "\n=== SELECTED PACKAGE ==="
  );

  pkg.selected
    .forEach(
      (
        candidate: RetrievalCandidate,
        index: number
      ) => {
        console.log(
          `${index + 1}. ${candidate.item.path} | score=${candidate.score}`
        );
      }
    );

  console.log(
    "\n=== SELECTED PACKAGE BY ROLE ==="
  );

  const roleCounts: Record<
    string,
    number
  > = {};

  for (
    const candidate of pkg.selected
  ) {
    const role =
      candidate.item.sourceRole ||
      "unknown";

    roleCounts[role] =
      (roleCounts[role] || 0) + 1;
  }

  console.log(
    JSON.stringify(
      roleCounts,
      null,
      2
    )
  );

  console.log(
    "\n=== FORMATTED KNOWLEDGE PACKAGE ==="
  );

  console.log(
    formatKnowledgePackage(
      pkg
    )
  );

  const outputPath =
    path.join(
      projectRoot,
      "07_AUTOMATION",
      "knowledge-retrieval",
      "runtime",
      "retrieval-test.json"
    );

  await fs.writeFile(
    outputPath,
    JSON.stringify(
      pkg,
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `\nSaved: ${outputPath}`
  );
}

main().catch(
  (error: unknown) => {
    console.error(
      "\nRETRIEVAL TEST FAILED:",
      error
    );

    process.exit(1);
  }
);