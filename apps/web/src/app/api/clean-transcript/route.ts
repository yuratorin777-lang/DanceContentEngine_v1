import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Инициализируем Gemini SDK (убедись, что GEMINI_API_KEY добавлен в переменные Vercel)
const ai = new GoogleGenAI({});

export async function POST(req: NextRequest) {
  try {
    const { text, filename } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const prompt = `Ты — редактор текстовых расшифровок. Твоя задача — сделать из сырой распознанной речи чистый, читаемый текст.

ВЕЛЕНИЕ:
1. НЕ ВЫРЕЗАЙ мысли, подробности, факты или примеры. Сохрани 100% авторского смысла и объема речи.
2. Исправляй ослышки распознавания речи (Whisper), опечатки и грамматические ошибки.
3. Убирай заикания, повторы слов и вводные мусорные слова ("э-э-э", "ну", "типа", "как бы"), если они не несут смысла.
4. Разбей текст на логичные абзацы и расставь знаки препинания для удобного чтения.
5. Заголовок сделай на основе названия файла.

Исходное имя файла: ${filename}
Сырой текст:
${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const cleanedText = response.text;

    return NextResponse.json({ cleanedText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}