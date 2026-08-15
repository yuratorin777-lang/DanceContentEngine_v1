import os
import glob
import time
import requests
from datetime import datetime
import whisper
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# --- КОНФИГУРАЦИЯ ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_DIR = os.path.join(BASE_DIR, "08_input")
KNOWLEDGE_DIR = os.path.join(BASE_DIR, "01_KNOWLEDGE")

# Твой URL на Vercel
VERCEL_API_URL = "https://dance-content-engine-v1.vercel.app/api/clean-transcript"

# Глобальная переменная для хранения модели (загружается 1 раз)
WHISPER_MODEL = None

def get_whisper_model():
    global WHISPER_MODEL
    if WHISPER_MODEL is None:
        print("🎙️ Загрузка модели Whisper (small)...")
        WHISPER_MODEL = whisper.load_model("small")
    return WHISPER_MODEL

def clean_via_vercel(raw_text, filename):
    """Отправляет сырой текст на Vercel для обработки через Gemini"""
    print(f"📡 Отправка на Vercel/Gemini для вычистки...")
    try:
        response = requests.post(
            VERCEL_API_URL,
            json={"text": raw_text, "filename": filename},
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        if response.status_code == 200:
            return response.json().get("cleanedText", raw_text)
        else:
            print(f"⚠️ Ошибка Vercel API ({response.status_code}): {response.text}")
            return raw_text
    except Exception as e:
        print(f"⚠️ Не удалось связаться с Vercel: {e}. Сохраняем сырой текст.")
        return raw_text

def process_single_file(file_path):
    """Обрабатывает один конкретный аудиофайл"""
    filename = os.path.basename(file_path)
    name_without_ext, _ = os.path.splitext(filename)
    date_prefix = datetime.now().strftime("%Y-%m-%d")
    topic_folder_name = f"{date_prefix}_{name_without_ext}"
    expected_md_path = os.path.join(KNOWLEDGE_DIR, topic_folder_name, "raw_parts", f"{name_without_ext}.md")

    if os.path.exists(expected_md_path):
        print(f"⏭️ Пропуск (уже обработан): {filename}")
        return False

    print(f"\n⏳ 1/2 Транскрибация локально: {filename}...")
    model = get_whisper_model()
    result = model.transcribe(file_path, language="ru", fp16=False)
    raw_transcript = result["text"].strip()

    print(f"🤖 2/2 Обработка через Gemini...")
    cleaned_transcript = clean_via_vercel(raw_transcript, filename)

    target_folder = os.path.join(KNOWLEDGE_DIR, topic_folder_name)
    raw_parts_folder = os.path.join(target_folder, "raw_parts")
    os.makedirs(raw_parts_folder, exist_ok=True)

    md_file_path = os.path.join(raw_parts_folder, f"{name_without_ext}.md")
    with open(md_file_path, "w", encoding="utf-8") as f:
        f.write(f"# {name_without_ext}\n\n")
        f.write(f"**Дата:** {datetime.now().strftime('%d.%m.%Y %H:%M')}\n")
        f.write(f"**Исходник:** {filename}\n\n")
        f.write("--- \n\n")
        f.write(cleaned_transcript)

    print(f"✅ Успешно! Файл сохранен: 01_KNOWLEDGE/{topic_folder_name}/raw_parts/{name_without_ext}.md\n")
    return True

def process_all_existing():
    """Сканирует папку 08_input и обрабатывает все новые файлы"""
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(KNOWLEDGE_DIR, exist_ok=True)

    extensions = ("*.aac", "*.mp3", "*.m4a", "*.wav", "*.ogg")
    audio_files = []
    for ext in extensions:
        audio_files.extend(glob.glob(os.path.join(INPUT_DIR, ext)))

    if not audio_files:
        print("📥 В папке 08_input пока нет файлов.")
        return

    for file_path in audio_files:
        process_single_file(file_path)

class AudioFolderHandler(FileSystemEventHandler):
    """Класс-обработчик событий файловой системы"""
    def on_created(self, event):
        if event.is_directory:
            return
        valid_exts = ('.aac', '.mp3', '.m4a', '.wav', '.ogg')
        if event.src_path.lower().endswith(valid_exts):
            print(f"\n🔔 Обнаружен новый файл: {os.path.basename(event.src_path)}")
            # Небольшая пауза, чтобы файл успел полностью дописаться на диск
            time.sleep(2)
            process_single_file(event.src_path)

def start_watching():
    """Запускает режим непрерывного наблюдения"""
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(KNOWLEDGE_DIR, exist_ok=True)

    # 1. Сначала обрабатываем всё, что уже есть
    print("🔍 Проверка имеющихся файлов...")
    process_all_existing()

    # 2. Включаем наблюдатель
    event_handler = AudioFolderHandler()
    observer = Observer()
    observer.schedule(event_handler, path=INPUT_DIR, recursive=False)
    observer.start()

    print(f"\n👀 Режим наблюдения активен! Слежу за папкой: 08_input")
    print("💡 Вы можете просто закидывать аудио в папку — обработка начнется автоматически.")
    print("Нажмите Ctrl+C для остановки.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n🛑 Наблюдение остановлено.")
    observer.join()

if __name__ == "__main__":
    start_watching()