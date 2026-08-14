# Validator — Dance Content Engine v1

## Назначение

Validator проверяет готовый результат Writer перед тем, как он считается готовым к использованию.

Validator не пишет контент заново и не заменяет Writer. Его задача — найти нарушения и определить:

- `PASS` — результат можно принять;
- `REWRITE_REQUIRED` — результат нужно переписать.

## Источники правил

Validator НЕ хранит правила проекта как единственный источник истины.

Перед каждой проверкой он читает актуальные правила из проектных файлов:

- `00_SYSTEM/AI_WORK_RULES.md`
- `04_CONTENT/CONTENT_WORK_RULES.md`
- `05_SEO/LOCAL_SEO_RULES.md`
- `01_KNOWLEDGE/OWNER_INPUT_RULES.md`
- `03_AUDIENCE/AUDIENCE_INDEX.md`

Это означает, что изменение правил в проектной документации автоматически влияет на Validator после следующего запроса. Код Validator для этого менять не требуется.

## Место в системе

```text
Task
  ↓
Writer
  ↓
Validator
  ↓
PASS → Approved / Published
  ↓
REWRITE_REQUIRED → Writer
```

## INPUT

- `task` — исходная задача;
- `outputContract` — тип ожидаемого результата;
- `content` — результат Writer;
- `context` — проектный контекст Writer;
- `projectRoot` — корень DanceContentEngine.

## PROCESS

1. Загружает актуальные проектные правила.
2. Проверяет Output Contract.
3. Проверяет полноту результата.
4. Проверяет мета-текст.
5. Проверяет проектные запреты и ограничения.
6. Проверяет конкретные бизнес-факты по переданному контексту.
7. Формирует PASS / REWRITE_REQUIRED.

## V1 CHECKS

- `OUTPUT_TYPE`
- `META_OUTPUT`
- `UNSUPPORTED_CLAIM`
- `INVENTED_BUSINESS_FACT`
- `CONTENT_RULE_VIOLATION`
- `AUDIENCE_MISMATCH`
- `CHANNEL_MISMATCH`
- `INCOMPLETE_RESULT`

## Architecture rule

Validator остаётся отдельным модулем.

`route.ts` только передаёт ему Writer result, исходную задачу, контекст и project root.

Validator не должен превращаться в копию всей проектной методологии: документы проекта остаются Single Source of Truth.
