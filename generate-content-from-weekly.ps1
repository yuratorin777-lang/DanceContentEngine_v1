[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

# ============================================================
# CONFIG
# ============================================================

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$ApiUrl = "https://dance-content-engine-v1.vercel.app/api/ai"

$PlansDir = Join-Path $ProjectRoot "04_CONTENT\plans\weekly"
$ContentDir = Join-Path $ProjectRoot "04_CONTENT\content"

New-Item -ItemType Directory -Force -Path $ContentDir | Out-Null


# ============================================================
# FIND LATEST WEEKLY PLAN
# ============================================================

$weeklyFiles = Get-ChildItem `
    -Path $PlansDir `
    -Filter "*.json" `
    -File |
    Sort-Object LastWriteTime -Descending

if (-not $weeklyFiles -or $weeklyFiles.Count -eq 0) {

    Write-Host ""
    Write-Host "ОШИБКА: Weekly Plan JSON не найден." -ForegroundColor Red
    Write-Host ""
    Write-Host "Папка:"
    Write-Host "  $PlansDir"
    Write-Host ""

    exit 1
}

$weeklyFile = $weeklyFiles[0]


# ============================================================
# HEADER
# ============================================================

Write-Host ""
Write-Host "============================================================"
Write-Host " DANCE CONTENT ENGINE"
Write-Host " ПОЛНЫЙ PIPELINE ИЗ WEEKLY PLAN"
Write-Host "============================================================"
Write-Host ""

Write-Host "Используется Weekly Plan:"
Write-Host "  $($weeklyFile.FullName)"
Write-Host ""


# ============================================================
# LOAD WEEKLY PLAN
# ============================================================

try {

    $planJson = Get-Content `
        -Path $weeklyFile.FullName `
        -Raw `
        -Encoding UTF8

    $plan = $planJson | ConvertFrom-Json

}
catch {

    Write-Host ""
    Write-Host "ОШИБКА: не удалось прочитать Weekly Plan." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    exit 1
}


# ============================================================
# VALIDATION
# ============================================================

if (-not $plan.items) {

    Write-Host ""
    Write-Host "ОШИБКА: Weekly Plan не содержит items." -ForegroundColor Red

    exit 1
}

if ($plan.items.Count -eq 0) {

    Write-Host ""
    Write-Host "ОШИБКА: Weekly Plan содержит 0 контентных единиц." -ForegroundColor Red

    exit 1
}


# ============================================================
# CAMPAIGN CONTEXT
# ============================================================

Write-Host "============================================================"
Write-Host " КОНТЕКСТ КАМПАНИИ"
Write-Host "============================================================"
Write-Host ""

Write-Host "Кампания:"
Write-Host "  $($plan.campaign)"

Write-Host ""

Write-Host "Цель кампании:"
Write-Host "  $($plan.campaignGoal)"

Write-Host ""

Write-Host "Локальность:"
Write-Host "  $($plan.location)"

Write-Host ""

Write-Host "Возрастной фокус:"
Write-Host "  $($plan.ageFocus)"

Write-Host ""


# ============================================================
# WEEKLY ITEMS
# ============================================================

Write-Host "============================================================"
Write-Host " КОНТЕНТ WEEKLY PLAN"
Write-Host "============================================================"
Write-Host ""

foreach ($item in $plan.items) {

    Write-Host "[$($item.day)] $($item.channel)"
    Write-Host "    Тема: $($item.topic)"
    Write-Host "    Подтема: $($item.subtopic)"
    Write-Host "    Формат: $($item.format)"
    Write-Host "    Этап: $($item.decisionStage)"
    Write-Host "    Приоритет: $($item.priority)"
    Write-Host ""

}


# ============================================================
# SELECT ITEM
# ============================================================

Write-Host "============================================================"
Write-Host " ВЫБОР КОНТЕНТНОЙ ЕДИНИЦЫ"
Write-Host "============================================================"
Write-Host ""

Write-Host "Введите номер дня для генерации материала."
Write-Host "Или введите ALL для генерации всех материалов."
Write-Host ""

$selection = Read-Host "Ваш выбор"


# ============================================================
# BUILD ITEMS TO GENERATE
# ============================================================

if (
    $selection -eq "ALL" -or
    $selection -eq "all" -or
    $selection -eq "All"
) {

    $itemsToGenerate = @($plan.items)

}
else {

    $selectedItem = $plan.items |
        Where-Object {
            [string]$_.day -eq [string]$selection
        } |
        Select-Object -First 1

    if (-not $selectedItem) {

        Write-Host ""
        Write-Host "ОШИБКА: элемент с выбранным днем не найден." -ForegroundColor Red
        Write-Host ""

        exit 1
    }

    $itemsToGenerate = @($selectedItem)
}


# ============================================================
# GENERATION FUNCTION
# ============================================================

function Generate-ContentItem {

    param(
        [Parameter(Mandatory=$true)]
        $Item,

        [Parameter(Mandatory=$true)]
        $Plan
    )


    # ========================================================
    # TASK
    # ========================================================

    $task = @"
ВЫПОЛНИ ПОЛНОЕ СОЗДАНИЕ КОНТЕНТА ДЛЯ КОНКРЕТНОЙ ЕДИНИЦЫ WEEKLY CONTENT PLAN.

Это production-задача.

Weekly Content Plan уже создан ранее стратегическим Weekly Content Planner.

Текущая задача НЕ заключается в создании нового Weekly Plan.

Текущая задача заключается в том, чтобы передать выбранную контентную единицу в ПОЛНЫЙ production pipeline DanceContentEngine_v1.

============================================================
ОБЯЗАТЕЛЬНАЯ АРХИТЕКТУРА EXECUTION PIPELINE
============================================================

Выполнение должно пройти через полный pipeline:

ANALYST EVIDENCE
        ↓
CONTENT PLANNER
        ↓
CONTENT PLAN
        ↓
RETRIEVER
        ↓
WRITER
        ↓
VALIDATOR
        ↓
FINAL CONTENT

Не пропускай этапы pipeline.

Не используй сокращённый режим.

Не выполняй только Writer.

Не выполняй только Retriever + Writer.

Не создавай материал напрямую из Weekly Plan.

Weekly Plan является входным стратегическим заданием.

Content Planner должен сформировать нормальный Content Plan для выбранной единицы.

Retriever должен подобрать проектный контекст уже после формирования Content Plan.

Writer должен создать финальный материал на основании Content Plan и retrieved context.

Validator должен проверить финальный материал.

============================================================
КОНТЕКСТ КАМПАНИИ
============================================================

Кампания:
$($Plan.campaign)

Цель кампании:
$($Plan.campaignGoal)

Локальность:
$($Plan.location)

Возрастной фокус:
$($Plan.ageFocus)

============================================================
ВЫБРАННАЯ ЕДИНИЦА WEEKLY CONTENT PLAN
============================================================

Plan ID:
$($Plan.planId)

День:
$($Item.day)

Канал:
$($Item.channel)

Аудитория:
$($Item.audience)

Тема:
$($Item.topic)

Подтема:
$($Item.subtopic)

Цель:
$($Item.goal)

Этап принятия решения:
$($Item.decisionStage)

Контентная задача:
$($Item.contentJob)

Роль контента:
$($Item.contentRole)

Формат:
$($Item.format)

Приоритет:
$($Item.priority)

Возможность переработки:
$($Item.repurposingPotential)

Обоснование:
$($Item.rationale)

Аналитическая основа:
$($Item.analystBasis)

============================================================
ОБЯЗАТЕЛЬНАЯ ИНТЕРПРЕТАЦИЯ WEEKLY ITEM
============================================================

Weekly Item является исходным стратегическим заданием для production pipeline.

Сохрани его стратегический смысл.

Не заменяй его другой темой.

Не создавай вместо него другую контентную возможность.

Не меняй выбранный канал.

Не меняй указанную аудиторию.

Не меняй этап принятия решения.

Не меняй основную контентную задачу.

Не меняй назначение материала.

Content Planner может определить необходимые параметры конкретного Content Plan для исполнения этой единицы, но итоговый Content Plan должен соответствовать выбранному Weekly Item.

============================================================
ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА
============================================================

1. Выполни полный production pipeline.

2. Weekly Plan уже существует.

3. Не создавай новый Weekly Plan.

4. Не заменяй выбранную контентную единицу другой.

5. Не меняй тему.

6. Не меняй стратегический смысл темы.

7. Не меняй канал.

8. Не меняй аудиторию.

9. Не меняй этап принятия решения.

10. Не меняй контентную задачу.

11. Не меняй формат без объективной необходимости, предусмотренной существующей методологией.

12. Content Planner должен использовать Analyst Evidence и существующую Content Strategy.

13. Retriever должен выполняться ПОСЛЕ Content Planner.

14. Retriever должен подбирать контекст под сформированный Content Plan.

15. Writer должен использовать Content Plan и retrieved project context.

16. Validator должен проверить итоговый материал.

17. Используй релевантные:
- Analyst Evidence;
- стратегию проекта;
- данные аудитории;
- 01_KNOWLEDGE;
- 02_RESEARCH;
- 03_AUDIENCE;
- 04_CONTENT;
- 05_SEO;
- RADAR;
- другие релевантные проектные источники.

18. Не выдумывай:
- цены;
- расписание;
- адреса;
- преподавателей;
- достижения;
- отзывы;
- конкретные даты;
- статистику;
- факты о школе;
- результаты бизнеса;
- любые другие сведения, которых нет в проектном контексте.

19. Если факт отсутствует, не выдумывай его.

20. RADAR является источником внешних сигналов и не должен автоматически считаться подтверждённым фактом.

21. Не превращай социальный пост в SEO-статью.

22. Не превращай экспертный материал в рекламное объявление.

23. Соблюдай специфику выбранного канала.

24. Учитывай этап принятия решения.

25. Материал должен выполнять указанную контентную задачу.

26. Избегай шаблонного и повторяющегося контента.

27. Не добавляй объяснение своей работы.

28. Не описывай внутренний процесс генерации в итоговом материале.

29. Не выводи Content Plan вместо готового материала.

30. Не выводи отчёт Validator вместо готового материала.

31. Итоговым результатом должен быть готовый материал для выбранного канала.

32. Язык — русский.

33. Русский текст — кириллицей.

============================================================
ФИНАЛЬНОЕ ТРЕБОВАНИЕ
============================================================

Верни только готовый финальный материал.

Весь внутренний production pipeline должен быть выполнен системой до формирования этого результата.
"@


    # ========================================================
    # REQUEST BODY
    # ========================================================

    $bodyObject = @{
        mode = "CONTENT"

        task = $task

        profile = "CONTENT"

        # Важно:
        # channel — именно это поле читает текущий API route.
        channel = [string]$Item.channel

        # Оставляем channels для совместимости
        # с существующим API-контрактом.
        channels = @(
            [string]$Item.channel
        )

        includeRadar = $true
    }


    $body = $bodyObject | ConvertTo-Json -Depth 30


    # ========================================================
    # API REQUEST
    # ========================================================

    Write-Host ""
    Write-Host "============================================================"
    Write-Host " ПОЛНЫЙ PRODUCTION PIPELINE"
    Write-Host "============================================================"
    Write-Host ""

    Write-Host "Plan ID:"
    Write-Host "  $($Plan.planId)"

    Write-Host ""

    Write-Host "День:"
    Write-Host "  $($Item.day)"

    Write-Host ""

    Write-Host "Канал:"
    Write-Host "  $($Item.channel)"

    Write-Host ""

    Write-Host "Тема:"
    Write-Host "  $($Item.topic)"

    Write-Host ""

    Write-Host "Формат:"
    Write-Host "  $($Item.format)"

    Write-Host ""

    Write-Host "Этап принятия решения:"
    Write-Host "  $($Item.decisionStage)"

    Write-Host ""

    Write-Host "Контентная задача:"
    Write-Host "  $($Item.contentJob)"

    Write-Host ""

    Write-Host "PIPELINE:"
    Write-Host "  Analyst Evidence"
    Write-Host "       ↓"
    Write-Host "  Content Planner"
    Write-Host "       ↓"
    Write-Host "  Content Plan"
    Write-Host "       ↓"
    Write-Host "  Retriever"
    Write-Host "       ↓"
    Write-Host "  Writer"
    Write-Host "       ↓"
    Write-Host "  Validator"
    Write-Host "       ↓"
    Write-Host "  Final Content"
    Write-Host ""


    try {

        $response = Invoke-WebRequest `
            -Uri $ApiUrl `
            -Method Post `
            -ContentType "application/json; charset=utf-8" `
            -Body $body `
            -UseBasicParsing

        $bytes = $response.RawContentStream.ToArray()

        $jsonText = [System.Text.Encoding]::UTF8.GetString($bytes)

        $data = $jsonText | ConvertFrom-Json

    }
    catch {

        Write-Host ""
        Write-Host "ОШИБКА API" -ForegroundColor Red
        Write-Host "------------------------------------------------------------"
        Write-Host $_.Exception.Message -ForegroundColor Red

        if ($_.ErrorDetails.Message) {

            Write-Host ""
            Write-Host "Ответ сервера:"
            Write-Host $_.ErrorDetails.Message
        }

        return $null
    }


    # ========================================================
    # API VALIDATION
    # ========================================================

    if ($data.ok -ne $true) {

        Write-Host ""
        Write-Host "API вернул ошибку." -ForegroundColor Red
        Write-Host ""

        $data | ConvertTo-Json -Depth 30

        return $null
    }


    if (-not $data.result) {

        Write-Host ""
        Write-Host "ОШИБКА: Writer не вернул готовый материал." -ForegroundColor Red

        return $null
    }


    # ========================================================
    # CONTENT OUTPUT
    # ========================================================

    $content = [string]$data.result


    # ========================================================
    # SAFE CHANNEL NAME
    # ========================================================

    $safeChannel = [string]$Item.channel

    $safeChannel = $safeChannel -replace '[\/:*?"<>|]', '-'


    # ========================================================
    # CONTENT FILE NAME
    # ========================================================

    $contentFileBase =
        "$($Plan.planId)-day-$($Item.day)-$safeChannel-content"

    $contentFileBase =
        $contentFileBase -replace '[\/:*?"<>|]', '-'


    $contentFilePath =
        Join-Path $ContentDir "$contentFileBase.md"


    # ========================================================
    # SAVE CONTENT
    # ========================================================

    [System.IO.File]::WriteAllText(
        $contentFilePath,
        $content,
        [System.Text.UTF8Encoding]::new($false)
    )


    # ========================================================
    # RESULT
    # ========================================================

    Write-Host ""
    Write-Host "============================================================"
    Write-Host " ГОТОВО"
    Write-Host "============================================================"
    Write-Host ""

    Write-Host "Pipeline:"
    Write-Host "  Analyst Evidence -> Content Planner -> Content Plan -> Retriever -> Writer -> Validator"

    Write-Host ""

    Write-Host "Plan ID:"
    Write-Host "  $($Plan.planId)"

    Write-Host ""

    Write-Host "День:"
    Write-Host "  $($Item.day)"

    Write-Host ""

    Write-Host "Канал:"
    Write-Host "  $($Item.channel)"

    Write-Host ""

    Write-Host "Тема:"
    Write-Host "  $($Item.topic)"

    Write-Host ""

    Write-Host "Файл:"
    Write-Host "  $contentFilePath"

    Write-Host ""

    return $contentFilePath
}


# ============================================================
# GENERATE
# ============================================================

$generatedFiles = @()

foreach ($item in $itemsToGenerate) {

    $resultFile = Generate-ContentItem `
        -Item $item `
        -Plan $plan

    if ($resultFile) {

        $generatedFiles += $resultFile
    }

}


# ============================================================
# FINAL RESULT
# ============================================================

Write-Host ""
Write-Host "============================================================"
Write-Host " ИТОГ"
Write-Host "============================================================"
Write-Host ""

Write-Host "Weekly Plan:"
Write-Host "  $($plan.planId)"

Write-Host ""

Write-Host "Кампания:"
Write-Host "  $($plan.campaign)"

Write-Host ""

Write-Host "Материалов запрошено:"
Write-Host "  $($itemsToGenerate.Count)"

Write-Host ""

Write-Host "Материалов успешно создано:"
Write-Host "  $($generatedFiles.Count)"

Write-Host ""

if ($generatedFiles.Count -gt 0) {

    Write-Host "Созданные файлы:"
    Write-Host ""

    foreach ($file in $generatedFiles) {

        Write-Host "  $file"
    }

}

Write-Host ""
Write-Host "============================================================"
Write-Host " FULL PIPELINE ЗАВЕРШЕН"
Write-Host "============================================================"
Write-Host ""

Start-Process explorer.exe $ContentDir