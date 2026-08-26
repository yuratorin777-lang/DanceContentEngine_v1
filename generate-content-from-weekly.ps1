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
Write-Host " ГЕНЕРАЦИЯ КОНТЕНТА ИЗ WEEKLY PLAN"
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
    Write-Host "    Формат: $($item.format)"
    Write-Host "    Приоритет: $($item.priority)"
    Write-Host ""

}


# ============================================================
# SELECT MODE
# ============================================================

Write-Host "============================================================"
Write-Host " РЕЖИМ ГЕНЕРАЦИИ"
Write-Host "============================================================"
Write-Host ""

Write-Host "Введите номер дня для генерации одного материала."
Write-Host "Или введите ALL для генерации всех материалов."
Write-Host ""

$selection = Read-Host "Ваш выбор"


# ============================================================
# BUILD ITEMS TO GENERATE
# ============================================================

if ($selection -eq "ALL" -or $selection -eq "all") {

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
НАПИШИ ГОТОВЫЙ КОНТЕНТ ПО КОНКРЕТНОЙ ЕДИНИЦЕ WEEKLY CONTENT PLAN.

Это не запрос на создание нового контент-плана.

Weekly Plan уже сформирован стратегическим Content Planner.

Твоя задача — исполнить именно указанную контентную единицу.

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
WEEKLY CONTENT PLAN
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

Возможность переработки:
$($Item.repurposingPotential)

Обоснование:
$($Item.rationale)

Аналитическая основа:
$($Item.analystBasis)

============================================================
ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА
============================================================

1. Напиши готовый материал.

2. Не создавай новый контент-план.

3. Не меняй тему.

4. Не меняй подтему.

5. Не меняй канал.

6. Не меняй формат.

7. Материал должен выполнять указанную цель.

8. Учитывай указанный этап принятия решения.

9. Используй релевантный проектный контекст, который доступен системе.

10. Используй данные Analyst Evidence, стратегию проекта, данные аудитории, знания владельца, контентную архитектуру, SEO-правила и Radar, если они релевантны конкретному материалу.

11. Не выдумывай:
- цены;
- расписание;
- адреса;
- преподавателей;
- достижения;
- отзывы;
- конкретные даты;
- статистику;
- факты о школе, которых нет в проектном контексте.

12. Если факт отсутствует, не выдумывай его.

13. Не превращай социальный пост в SEO-статью.

14. Не превращай экспертный материал в рекламное объявление.

15. Соблюдай специфику выбранного канала.

16. Не добавляй объяснение своей работы.

17. Не описывай процесс генерации.

18. Верни только готовый материал.

19. Язык — русский.

20. Русский текст — кириллицей.

============================================================
КОНЕЦ WEEKLY CONTENT PLAN
============================================================

Выполни именно эту контентную единицу.
"@


    # ========================================================
    # REQUEST BODY
    # ========================================================

    $bodyObject = @{
        mode = "CONTENT"

        task = $task

        profile = "CONTENT"

        channels = @(
            "VK",
            "Telegram",
            "Website / SEO"
        )

        includeRadar = $true

        requestedChannel = $Item.channel

    }


    $body = $bodyObject | ConvertTo-Json -Depth 30


    # ========================================================
    # API REQUEST
    # ========================================================

    Write-Host ""
    Write-Host "============================================================"
    Write-Host " ГЕНЕРАЦИЯ"
    Write-Host "============================================================"
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

    Write-Host "Отправка задания:"
    Write-Host "  Content Planner -> Writer -> Validator"
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


    # Безопасное имя канала

    $safeChannel = [string]$Item.channel

    $safeChannel = $safeChannel -replace '[\/:*?"<>|]', '-'


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
    Write-Host "ГОТОВО" -ForegroundColor Green
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
Write-Host " ГОТОВО"
Write-Host "============================================================"
Write-Host ""

Start-Process explorer.exe $ContentDir