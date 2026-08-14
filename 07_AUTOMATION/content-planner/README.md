# Content Planner v2

## Назначение

Content Planner превращает входную контентную задачу в развёрнутый, но структурированный стратегический brief для Writer.

Planner отвечает за направление и требования к будущему материалу, а не за написание финального текста и не за пересказ всей базы знаний.

## INPUT

- user task;
- context profile;
- project context.

## STRATEGIC INPUT LAYERS

- 02_RESEARCH — рынок, конкуренты, спрос, исследования;
- 03_AUDIENCE — потребности, боли, вопросы, возражения, язык и путь аудитории;
- 01_KNOWLEDGE — экспертное и owner knowledge;
- 07_AUTOMATION/Rardar world feed — актуальные внешние сигналы;
- 04_CONTENT — контентная методология;
- 05_SEO — поисковый контекст, если релевантно;
- 06_ANALYTICS — фактическая эффективность, если доступна.

В будущем Planner может получать дополнительный стратегический вход от Information / Content Architect без изменения своей основной роли.

## PROCESS

1. Понять задачу.
2. Определить аудиторию.
3. Определить тему и под-тему.
4. Определить цель.
5. Определить канал и формат.
6. Определить ключевую потребность аудитории.
7. Сформировать ключевой смысл и контентный угол.
8. Выделить релевантные research / audience / knowledge / radar signals.
9. Определить, какие знания и факты Writer должен учитывать.
10. Зафиксировать CTA и ограничения.
11. Сформировать приоритеты источников.
12. Вернуть полный структурированный JSON brief.

## OUTPUT

Planner возвращает:

- audience;
- topic;
- subtopic;
- goal;
- channel;
- format;
- audienceNeed;
- keyMessage;
- contentAngle;
- researchSignals;
- knowledgeNeeds;
- radarSignals;
- seoConsiderations;
- cta;
- constraints;
- sourcePriorities.

## Архитектурное правило

Planner не заменяет Analyst.
Planner не заменяет будущего Information / Content Architect.
Planner не заменяет Writer.

Planner отвечает на вопрос:
**Что именно должен решить будущий контент и в каком направлении его нужно создавать?**

Writer отвечает на вопрос:
**Как раскрыть эту задачу на основе релевантных материалов проекта?**
