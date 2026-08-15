# Knowledge Retrieval / Librarian v1

## Назначение

Librarian — единый каталог всей информационной библиотеки DanceContentEngine_v1.

Его задача на v1:

1. видеть всю структуру библиотеки;
2. знать, где находится каждый допустимый материал;
3. определять домен и базовый тип материала;
4. извлекать из материала краткое описание назначения;
5. сохранять ключевые термины для последующего поиска;
6. использовать существующие Radar metadata там, где они доступны;
7. строить машинно-читаемую карту библиотеки для будущего Retrieval/Ranking.

Librarian не пишет контент и не принимает редакционные решения.

## Источники библиотеки

- 00_SYSTEM
- 01_KNOWLEDGE
- 02_RESEARCH
- 03_AUDIENCE
- 04_CONTENT
- 05_SEO
- 06_ANALYTICS
- 07_AUTOMATION
- 08_INPUT
- 09_ARCHIVE

При этом технические каталоги и runtime/history исключаются из обычной карты, если они не являются отдельными данными, необходимыми системе.

## Что хранится в карте

Для каждого материала:

- path
- domain
- fileName
- extension
- type
- title
- purpose
- priority
- size
- modifiedAt
- keywords
- sourceRole
- radarMetadata (если найдено)

## Важный принцип

Librarian отвечает за знание карты библиотеки.

Retrieval отвечает за выбор материалов под конкретный Content Brief.

Это разные задачи.

## V1

В первой версии не используется vector database.

Карта строится из:

- структуры папок;
- имени файла;
- Markdown headings;
- первых содержательных абзацев;
- существующих metadata Radar;
- приоритетов домена.

Следующий слой сможет использовать эту карту для candidate discovery и ranking.

## Запуск

```cmd
node 07_AUTOMATION/knowledge-retrieval/index.ts
```

Для runtime-приложения файл можно импортировать и вызвать `buildLibraryMap(projectRoot)`.
