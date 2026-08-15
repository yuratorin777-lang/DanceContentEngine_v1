import {
  buildRetrievalPackage,
} from "./retriever.ts";

const projectRoot = process.cwd();

const plan = {
  audience:
    "Родители детей дошкольного и младшего школьного возраста в Серпухове, которые ищут развивающие и увлекательные внешкольные занятия.",

  topic:
    "Набор детей на новый танцевальный сезон",

  subtopic:
    "Преимущества танцев для развития ребенка и комфортная адаптация детей",

  goal:
    "Привлечь родителей к записи детей в новый танцевальный сезон.",

  audienceNeed:
    "Родителям важно, чтобы ребенку нравились занятия, был хороший педагог, был видимый прогресс, комфортная адаптация и позитивная атмосфера.",

  keyMessage:
    "Танцы дают ребенку радость, развитие, уверенность и возможность раскрывать себя в поддерживающей среде.",

  contentAngle:
    "Показать танцы одновременно как развитие, удовольствие ребенка, адаптацию и возможность видеть результаты.",

  researchSignals: [
    "Родители ценят удовольствие ребенка от занятий.",
    "Родители обращают внимание на педагога и атмосферу.",
    "Видимый прогресс является важным фактором выбора.",
    "Выступления являются заметным результатом обучения.",
  ],

  knowledgeNeeds: [
    "Реальный опыт школы",
    "Педагогический подход",
    "Адаптация детей",
    "Развитие ребенка",
    "Танцевальные направления",
    "Примеры работы с детьми",
  ],

  radarSignals: [
    "Актуальные исследования о танцах и развитии детей.",
    "Актуальные события в детском танцевальном и творческом пространстве.",
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
    "Не использовать неподтвержденные факты.",
  ],

  sourcePriorities: [
    "01_KNOWLEDGE",
    "03_AUDIENCE",
    "02_RESEARCH",
    "04_CONTENT",
    "05_SEO",
    "08_INPUT",
  ],
};

async function main() {
  console.log("==============================================");
  console.log(" DanceContentEngine — Retriever v2 Smoke Test");
  console.log("==============================================");

  const pkg =
    await buildRetrievalPackage(
      projectRoot,
      plan,
      {
        maxCharacters: 180000,
        maxSources: 30,
      }
    );

  console.log("\n=== LIMITS ===");
  console.log(
    JSON.stringify(
      pkg.limits,
      null,
      2
    )
  );

  console.log("\n=== COMPOSITION ===");
  console.log(
    JSON.stringify(
      pkg.composition,
      null,
      2
    )
  );

  console.log("\n=== SELECTED SOURCES ===");

  pkg.selected.forEach(
    (candidate, index) => {
      console.log(
        `${index + 1}. ${candidate.item.path}`
      );

      console.log(
        `   ROLE: ${candidate.role}`
      );

      console.log(
        `   SIZE: ${candidate.size}`
      );

      console.log(
        `   RELEVANCE: ${candidate.relevance}`
      );
    }
  );

  console.log("\n=== KNOWLEDGE SOURCES ===");

  pkg.selected
    .filter(
      candidate =>
        candidate.role === "knowledge"
    )
    .forEach(
      candidate =>
        console.log(
          candidate.item.path
        )
    );

  console.log("\n=== INPUT SOURCES ===");

  pkg.selected
    .filter(
      candidate =>
        candidate.role === "input"
    )
    .forEach(
      candidate =>
        console.log(
          candidate.item.path
        )
    );

  console.log("\n=== RADAR SOURCES ===");

  pkg.selected
    .filter(
      candidate =>
        candidate.role === "radar"
    )
    .forEach(
      candidate =>
        console.log(
          candidate.item.path
        )
    );

  const valid =
    pkg.selected.length <=
      pkg.limits.maxSources &&
    pkg.composition.characters <=
      pkg.limits.maxCharacters;

  console.log("\n=== TEST RESULT ===");
  console.log(
    valid
      ? "PASS"
      : "FAIL"
  );

  console.log(
    `Selected sources: ${pkg.selected.length}/${pkg.limits.maxSources}`
  );

  console.log(
    `Characters: ${pkg.composition.characters}/${pkg.limits.maxCharacters}`
  );
}

main().catch(
  error => {
    console.error(
      "\nRETRIEVER TEST FAILED:",
      error
    );

    process.exit(1);
  }
);