# Content Planner v1

## Назначение

Content Planner превращает входную контентную задачу в структурированное стратегическое задание для Writer.

Planner не пишет финальный контент и не проводит новое рыночное исследование. Он синтезирует уже доступные слои проекта:

- 02_RESEARCH — исследования, рынок, конкуренты, спрос;
- 03_AUDIENCE — аудитория, боли, потребности, вопросы, путь;
- 01_KNOWLEDGE — экспертное знание;
- 07_AUTOMATION/Rardar world feed/runtime/latest.json — актуальные внешние сигналы;
- 04_CONTENT — контентная методология;
- 05_SEO — поисковые возможности, когда релевантно;
- 06_ANALYTICS — результаты и сигналы эффективности, когда они есть.

## INPUT

- user task;
- context profile;
- project context.

## PROCESS

1. Понять задачу.
2. Определить аудиторию.
3. Определить тему и под-тему.
4. Определить цель.
5. Определить канал и формат.
6. Определить информационную потребность аудитории.
7. Выделить релевантные research / audience / knowledge / radar signals.
8. Определить ключевой смысл и возможный CTA.
9. Сформировать ограничения и требования Writer.
10. Не придумывать отсутствующие факты.

## OUTPUT

Planner возвращает структурированный JSON с полями:

- audience
- topic
- subtopic
- goal
- channel
- format
- audienceNeed
- keyMessage
- contentAngle
- researchSignals
- knowledgeNeeds
- radarSignals
- seoConsiderations
- cta
- constraints
- sourcePriorities

## Архитектурное правило

Planner сейчас работает как стратегический слой над Analyst / Research / Audience / Knowledge / Radar.

В будущем он может получать дополнительный структурированный вход от Information / Content Architect без изменения своей базовой роли.

Planner не заменяет Analyst и не заменяет Architect.
