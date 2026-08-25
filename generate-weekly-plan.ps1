[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$ApiUrl = "https://dance-content-engine-v1.vercel.app/api/ai"

$body = @{
    mode = "WEEKLY_PLAN"

    task = "Собери стратегический контент-план на 7 дней для проекта детских танцев в Серпухове. Используй AI Analyst Evidence как основную доказательную базу. План должен быть разделён на три канала: VK, Telegram и Website / SEO. Для каждого дня и каждого канала определи отдельную контентную единицу: тему, подтему, цель, этап принятия решения, контентную задачу, роль контента и формат. Не пиши сами посты и статьи. Не создавай Writer output. Нужен именно недельный стратегический контент-план."

    profile = "CONTENT"

    channels = @(
        "VK",
        "Telegram",
        "Website / SEO"
    )

    includeRadar = $true
} | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "============================================"
Write-Host " DANCE CONTENT ENGINE"
Write-Host " WEEKLY CONTENT PLAN"
Write-Host "============================================"
Write-Host ""

Write-Host "Отправка запроса на Vercel..."
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
    Write-Host "ОШИБКА API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Ответ сервера:"
        Write-Host $_.ErrorDetails.Message
    }

    exit 1
}

Write-Host "=== API ==="
Write-Host $data.ok

Write-Host ""
Write-Host "=== MODE ==="
Write-Host $data.mode

Write-Host ""
Write-Host "=== ANALYST EVIDENCE ==="

if ($data.meta.analystEvidence) {
    Write-Host "Files loaded: $($data.meta.analystEvidence.filesLoaded)"
    Write-Host "Characters:   $($data.meta.analystEvidence.contextCharacters)"
}
else {
    Write-Host "Analyst Evidence metadata отсутствует."
}

Write-Host ""
Write-Host "=== ANALYST SOURCES ==="

if ($data.meta.analystEvidence.sources) {
    $data.meta.analystEvidence.sources | ForEach-Object {
        Write-Host $_
    }
}

Write-Host ""
Write-Host "=== WEEKLY CONTENT PLAN ==="

$data.weeklyContentPlan | ConvertTo-Json -Depth 30

Write-Host ""
Write-Host "=== STORED PLAN ==="

if ($data.storedWeeklyPlan) {
    $data.storedWeeklyPlan | ConvertTo-Json -Depth 10
}

Write-Host ""
Write-Host "=== ITEM COUNT ==="

if ($data.weeklyContentPlan.items) {
    Write-Host $data.weeklyContentPlan.items.Count
}
else {
    Write-Host "0"
}

Write-Host ""
Write-Host "=== CHANNELS ==="

if ($data.weeklyContentPlan.channels) {
    $data.weeklyContentPlan.channels
}

Write-Host ""
Write-Host "=== DAYS ==="

if ($data.weeklyContentPlan.items) {
    $data.weeklyContentPlan.items |
        Select-Object day, channel, topic, format, priority, status |
        Format-Table -AutoSize
}

Write-Host ""
Write-Host "============================================"
Write-Host " ГОТОВО"
Write-Host "============================================"
Write-Host ""

if ($data.ok -eq $true) {
    Write-Host "Weekly Plan успешно создан."
}
else {
    Write-Host "API вернул ошибку." -ForegroundColor Red
    Write-Host ""
    $data | ConvertTo-Json -Depth 20
}

Write-Host ""
