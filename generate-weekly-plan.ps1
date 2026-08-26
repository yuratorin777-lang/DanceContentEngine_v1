[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

# ============================================================
# CONFIG
# ============================================================

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$ApiUrl = "https://dance-content-engine-v1.vercel.app/api/ai"

$PlansDir = Join-Path $ProjectRoot "04_CONTENT\plans\weekly"

# Создаем локальную папку для Weekly Plans
New-Item -ItemType Directory -Force -Path $PlansDir | Out-Null


# ============================================================
# REQUEST
# ============================================================

$body = @{
    mode = "WEEKLY_PLAN"

    task = @"
Собери стратегический контент-план на 7 дней для проекта детских танцев в Серпухове.

Используй AI Analyst Evidence как основную доказательную базу.

ВАЖНО: перед формированием недельного плана самостоятельно определи АКТУАЛЬНЫЙ КОНТЕКСТ КАМПАНИИ на текущий момент.

Определи:
- campaign — название текущей контентной кампании;
- campaignGoal — главная коммерческая или стратегическая цель кампании;
- location — локальный рынок;
- ageFocus — основной возрастной фокус.

Для определения актуальной кампании используй:
- текущий сезонный контекст;
- AI Analyst Evidence;
- данные аудитории;
- исследования рынка;
- поисковый спрос;
- контентную стратегию;
- текущие сигналы Radar;
- знания владельца;
- другие релевантные материалы проекта.

Не считай заранее заданным ни название кампании, ни её цель.
Не придумывай сезонность без подтверждения релевантными данными.

Если текущий контекст действительно связан с началом учебного сезона и привлечением новых учеников, campaign может быть определена как "Новый сезон", а campaignGoal — как "Набор новых учеников". Но это должно быть результатом анализа, а не безусловным заданием.

Недельный план должен быть построен ВНУТРИ определённой кампании.

План должен быть разделён на три канала:
1. VK
2. Telegram
3. Website / SEO

Для каждого контентного элемента определи:
- день;
- канал;
- аудиторию;
- тему;
- подтему;
- цель;
- этап принятия решения;
- контентную задачу;
- роль контента;
- формат;
- возможность переработки контента;
- обоснование;
- аналитическую основу;
- приоритет;
- статус.

Не пиши сами посты и статьи.
Не создавай Writer output.
Нужен именно недельный стратегический контент-план.

ВАЖНО:
Весь текстовый контент Weekly Plan должен быть написан НА РУССКОМ ЯЗЫКЕ.
Не используй транслитерацию русского языка латиницей.
Не пиши русские фразы вида "S kakogo vozrasta..." или "Pochemu rebenok...".
Используй нормальный русский текст на кириллице.

Идентификаторы, названия файлов и технические поля могут оставаться на английском языке.

"Website / SEO" оставь именно в таком виде.
"VK" и "Telegram" оставь без изменений.

Добавь в верхний уровень Weekly Plan следующие поля:
- campaign
- campaignGoal
- location
- ageFocus

Все четыре поля должны содержать результат самостоятельного анализа текущего контекста кампании.

"campaign" — название текущей кампании на русском языке.
"campaignGoal" — главная цель кампании на русском языке.
"location" — локальный рынок на русском языке.
"ageFocus" — основной возрастной фокус на русском языке.

"priority" и "status" должны использовать стандартные значения схемы.
"status" = "PLANNED".
"priority" = "HIGH" или "MEDIUM" или "LOW".

"decisionStage" и остальные значения должны быть осмысленными и согласованными с русским содержанием.

"analystBasis" должен ссылаться на реально использованные документы Analyst Evidence.
"rationale" напиши на русском языке.

"audience", "topic", "subtopic", "goal", "contentJob", "contentRole", "format", "repurposingPotential" также напиши на русском языке.

"strategicObjective" и "audience" верхнего уровня тоже напиши на русском языке.

"analystBasis" верхнего уровня может содержать имена файлов без перевода.

"channels" оставь:
VK
Telegram
Website / SEO

"planId" может оставаться техническим идентификатором.
"periodDays" = 7.
"items" должен содержать все элементы недельного плана.

Контент всех 7 дней должен работать на общую кампанию, но не должен превращаться в семь одинаковых рекламных сообщений.

Каждый день должен иметь собственную контентную задачу и собственный угол раскрытия темы.

При этом учитывай связь между днями недели: контент должен формировать последовательное движение аудитории от первого контакта и интереса к сравнению, доверию, снятию возражений и действию.

Не добавляй Markdown вокруг JSON.
Верни валидный JSON согласно WEEKLY_CONTENT_PLAN_SCHEMA.
"@

    profile = "CONTENT"

    channels = @(
        "VK",
        "Telegram",
        "Website / SEO"
    )

    includeRadar = $true

} | ConvertTo-Json -Depth 20


# ============================================================
# HEADER
# ============================================================

Write-Host ""
Write-Host "============================================================"
Write-Host " DANCE CONTENT ENGINE"
Write-Host " НЕДЕЛЬНЫЙ КОНТЕНТ-ПЛАН"
Write-Host "============================================================"
Write-Host ""

Write-Host "Отправка запроса на Vercel..."
Write-Host ""


# ============================================================
# API REQUEST
# ============================================================

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

    exit 1
}


# ============================================================
# BASIC VALIDATION
# ============================================================

if ($data.ok -ne $true) {

    Write-Host ""
    Write-Host "API вернул ошибку." -ForegroundColor Red
    Write-Host ""

    $data | ConvertTo-Json -Depth 30

    exit 1
}

if (-not $data.weeklyContentPlan) {

    Write-Host ""
    Write-Host "ОШИБКА: API не вернул Weekly Content Plan." -ForegroundColor Red
    exit 1
}

$plan = $data.weeklyContentPlan


# ============================================================
# PLAN ID
# ============================================================

$planId = $plan.planId

if ([string]::IsNullOrWhiteSpace($planId)) {

    $planId = "weekly-plan-" + (Get-Date -Format "yyyy-MM-dd-HHmmss")
}


# ============================================================
# SAVE JSON LOCALLY
# ============================================================

$fileName = "$planId.json"

$filePath = Join-Path $PlansDir $fileName

$planJson = $plan | ConvertTo-Json -Depth 50

[System.IO.File]::WriteAllText(
    $filePath,
    $planJson,
    [System.Text.UTF8Encoding]::new($false)
)


# ============================================================
# CREATE HUMAN-READABLE MD
# ============================================================

$mdFileName = "$planId.md"

$mdFilePath = Join-Path $PlansDir $mdFileName

$md = New-Object System.Text.StringBuilder

[void]$md.AppendLine("# Недельный контент-план")
[void]$md.AppendLine("")

[void]$md.AppendLine("**Plan ID:** $($plan.planId)")
[void]$md.AppendLine("")

[void]$md.AppendLine("**Период:** $($plan.periodDays) дней")
[void]$md.AppendLine("")

# ============================================================
# CAMPAIGN CONTEXT
# ============================================================

[void]$md.AppendLine("## Контекст кампании")
[void]$md.AppendLine("")

[void]$md.AppendLine("**Кампания:** $($plan.campaign)")
[void]$md.AppendLine("")

[void]$md.AppendLine("**Цель кампании:** $($plan.campaignGoal)")
[void]$md.AppendLine("")

[void]$md.AppendLine("**Локальность:** $($plan.location)")
[void]$md.AppendLine("")

[void]$md.AppendLine("**Возрастной фокус:** $($plan.ageFocus)")
[void]$md.AppendLine("")

# ============================================================
# GENERAL PLAN
# ============================================================

[void]$md.AppendLine("## Целевая аудитория")
[void]$md.AppendLine("")

[void]$md.AppendLine($plan.audience)
[void]$md.AppendLine("")

[void]$md.AppendLine("## Стратегическая цель")
[void]$md.AppendLine("")

[void]$md.AppendLine($plan.strategicObjective)
[void]$md.AppendLine("")

[void]$md.AppendLine("## Каналы")
[void]$md.AppendLine("")

foreach ($channel in $plan.channels) {
    [void]$md.AppendLine("- $channel")
}

[void]$md.AppendLine("")

[void]$md.AppendLine("## Контент на неделю")
[void]$md.AppendLine("")


# ============================================================
# WEEKLY ITEMS
# ============================================================

foreach ($item in $plan.items) {

    [void]$md.AppendLine("### День $($item.day) — $($item.channel)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Аудитория:** $($item.audience)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Тема:** $($item.topic)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Подтема:** $($item.subtopic)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Цель:** $($item.goal)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Этап принятия решения:** $($item.decisionStage)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Контентная задача:** $($item.contentJob)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Роль контента:** $($item.contentRole)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Формат:** $($item.format)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Возможность переработки:** $($item.repurposingPotential)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Обоснование:**")
    [void]$md.AppendLine("")
    [void]$md.AppendLine($item.rationale)
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Приоритет:** $($item.priority)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("**Статус:** $($item.status)")
    [void]$md.AppendLine("")

    [void]$md.AppendLine("---")
    [void]$md.AppendLine("")
}


[System.IO.File]::WriteAllText(
    $mdFilePath,
    $md.ToString(),
    [System.Text.UTF8Encoding]::new($false)
)


# ============================================================
# OUTPUT
# ============================================================

Write-Host ""
Write-Host "============================================================"
Write-Host " РЕЗУЛЬТАТ"
Write-Host "============================================================"
Write-Host ""

Write-Host "API: успешно"
Write-Host "Режим: WEEKLY_PLAN"
Write-Host ""

# ============================================================
# CAMPAIGN
# ============================================================

Write-Host "=== КОНТЕКСТ КАМПАНИИ ==="
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
# ANALYST EVIDENCE
# ============================================================

Write-Host "=== ANALYST EVIDENCE ==="
Write-Host ""

if ($data.meta.analystEvidence) {

    Write-Host "Загружено документов: $($data.meta.analystEvidence.filesLoaded)"
    Write-Host "Объём аналитического контекста: $($data.meta.analystEvidence.contextCharacters) символов"

}
else {

    Write-Host "Данные Analyst Evidence отсутствуют."

}


Write-Host ""
Write-Host "=== ИСТОЧНИКИ АНАЛИТИКА ==="
Write-Host ""

if ($data.meta.analystEvidence.sources) {

    foreach ($source in $data.meta.analystEvidence.sources) {
        Write-Host "  $source"
    }

}


# ============================================================
# WEEKLY PLAN
# ============================================================

Write-Host ""
Write-Host "=== НЕДЕЛЬНЫЙ КОНТЕНТ-ПЛАН ==="
Write-Host ""

Write-Host "Plan ID: $($plan.planId)"
Write-Host "Период: $($plan.periodDays) дней"
Write-Host ""

Write-Host "Целевая аудитория:"
Write-Host "  $($plan.audience)"
Write-Host ""

Write-Host "Стратегическая цель:"
Write-Host "  $($plan.strategicObjective)"
Write-Host ""

Write-Host "Каналы:"
foreach ($channel in $plan.channels) {
    Write-Host "  - $channel"
}


# ============================================================
# CONTENT BY DAYS
# ============================================================

Write-Host ""
Write-Host "=== КОНТЕНТ ПО ДНЯМ ==="
Write-Host ""


foreach ($item in $plan.items) {

    Write-Host "------------------------------------------------------------"
    Write-Host "ДЕНЬ $($item.day) | $($item.channel)"
    Write-Host "------------------------------------------------------------"

    Write-Host "Тема:"
    Write-Host "  $($item.topic)"

    Write-Host "Подтема:"
    Write-Host "  $($item.subtopic)"

    Write-Host "Аудитория:"
    Write-Host "  $($item.audience)"

    Write-Host "Цель:"
    Write-Host "  $($item.goal)"

    Write-Host "Этап решения:"
    Write-Host "  $($item.decisionStage)"

    Write-Host "Контентная задача:"
    Write-Host "  $($item.contentJob)"

    Write-Host "Роль:"
    Write-Host "  $($item.contentRole)"

    Write-Host "Формат:"
    Write-Host "  $($item.format)"

    Write-Host "Приоритет:"
    Write-Host "  $($item.priority)"

    Write-Host "Статус:"
    Write-Host "  $($item.status)"

    Write-Host ""

}


# ============================================================
# FILES
# ============================================================

Write-Host "============================================================"
Write-Host " ФАЙЛЫ СОЗДАНЫ"
Write-Host "============================================================"
Write-Host ""

Write-Host "JSON:"
Write-Host "  $filePath"

Write-Host ""

Write-Host "Markdown:"
Write-Host "  $mdFilePath"

Write-Host ""

Write-Host "Количество контентных единиц: $($plan.items.Count)"

Write-Host ""

Write-Host "============================================================"
Write-Host " ГОТОВО"
Write-Host "============================================================"
Write-Host ""

Write-Host "Weekly Plan успешно создан локально."
Write-Host ""

# Автоматически открыть папку с результатом
Start-Process explorer.exe $PlansDir