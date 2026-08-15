import os
import glob
import json
import requests
from datetime import datetime
import whisper

# --- КОНФИГУРАЦИЯ ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_DIR = os.path.join(BASE_DIR, "08_input")
KNOWLEDGE_DIR = os.path.join(BASE_DIR, "01_KNOWLEDGE")

# Путь к твоему эндпоинту на Vercel (укажи свой URL)
VERCEL_API_URL = "https://dance-content-engine-v1.vercel.app/api/clean-transcript"

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

def process_audio_files():
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(KNOWLEDGE_DIR, exist_ok=True)

    extensions = ("*.aac", "*.mp3", "*.m4a", "*.wav", "*.ogg")
    audio_files = []
    for ext in extensions:
        audio_files.extend(glob.glob(os.path.join(INPUT_DIR, ext)))

    if not audio_files:
        print("📥 В папке 08_input нет аудиофайлов.")
        return

    print(f"🎙️ Найдено файлов: {len(audio_files)}. Загрузка Whisper (small)...")
    model = whisper.load_model("small")

    for file_path in audio_files:
        filename = os.path.basename(file_path)
        name_without_ext, _ = os.path.splitext(filename)
        
        print(f"\n⏳ 1/2 Транскрибация локально: {filename}...")

        # 1. Локальная транскрибация Whisper
        result = model.transcribe(file_path, language="ru", fp16=False)
        raw_transcript = result["text"].strip()

        # 2. Вычистка через Vercel -> Gemini
        print(f"🤖 2/2 Обработка через Gemini...")
        cleaned_transcript = clean_via_vercel(raw_transcript, filename)

        # 3. Сохранение структуры в 01_KNOWLEDGE
        date_prefix = datetime.now().strftime("%Y-%m-%d")
        topic_folder_name = f"{date_prefix}_{name_without_ext}"
        target_folder = os.path.join(KNOWLEDGE_DIR, topic_folder_name)
        raw_parts_folder = os.path.join(target_folder, "raw_parts")

        os.makedirs(raw_parts_folder, exist_ok=True)

        # Сохраняем обработанный .md файл
        md_file_path = os.path.join(raw_parts_folder, f"{name_without_ext}.md")
        with open(md_file_path, "w", encoding="utf-8") as f:
            f.write(f"# {name_without_ext}\n\n")
            f.write(f"**Дата:** {datetime.now().strftime('%d.%m.%Y %H:%M')}\n")
            f.write(f"**Исходник:** {filename}\n\n")
            f.write("--- \n\n")
            f.write(cleaned_transcript)

        print(f"✅ Успешно! Файл сохранен: 01_KNOWLEDGE/{topic_folder_name}/raw_parts/{name_without_ext}.md")

if __name__ == "__main__":
    process_audio_files()