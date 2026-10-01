const fs = require('fs');
const path = require('path');

const SEEN_FILE = path.join(__dirname, '../runtime/seen_history.json');

// 1. Загружаем историю просмотренных URL
let seenUrls = new Set();
if (fs.existsSync(SEEN_FILE)) {
    try {
        const raw = fs.readFileSync(SEEN_FILE, 'utf8');
        seenUrls = new Set(JSON.parse(raw));
    } catch (e) {
        seenUrls = new Set();
    }
}

// 2. При фильтрации полученных RSS-записей отсекаем то, что уже было
const uniqueSignals = rawSignals.filter(signal => {
    if (seenUrls.has(signal.url) || seenUrls.has(signal.id)) {
        return false; // Убираем дубликат из предыдущих дней
    }
    return true;
});

// 3. Сохраняем новые URL обратно в историю
uniqueSignals.forEach(s => seenUrls.add(s.url || s.id));

// (Опционально) Ограничиваем размер истории, чтобы файл не разрастался
const updatedSeenArray = Array.from(seenUrls).slice(-500); 
fs.writeFileSync(SEEN_FILE, JSON.stringify(updatedSeenArray, null, 2));