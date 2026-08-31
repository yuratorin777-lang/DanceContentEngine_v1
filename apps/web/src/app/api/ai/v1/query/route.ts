// apps/web/src/app/api/ai/v1/query/route.ts
import { NextResponse } from 'next/server';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildRetrievalPackage } from '@automation/knowledge-retrieval/retriever';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_ASSISTANT_API_KEY!);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('x-api-key');
    if (authHeader !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, history } = await req.json();

    // 1. Поиск в базе знаний
    const projectRoot = path.resolve(process.cwd(), '../..');
    const plan = {
      topic: query,
      keyMessage: query,
      subtopic: '',
      goal: '',
      audience: '',
      audienceNeed: '',
      contentAngle: '',
    };

    const knowledgePackage = await buildRetrievalPackage(projectRoot, plan);
    const contextText = knowledgePackage.selected
      .map((source, index) => `--- Источник ${index + 1}: ${source.item.title || source.item.path} ---\n${source.content}`)
      .join('\n\n');

    // 2. Базовый системный промт
    const baseSystemInstruction = `Ты — заботливый, умный и опытный ИИ-наставник и ассистент детской танцевальной студии DanceKids.
Твоя главная задача — помогать родителям и ученикам в чате Личного Кабинета, давая глубокие, экспертные и понятные ответы.

ПРИОРИТЕТЫ И СТРАТЕГИЯ ПОИСКА ОТВЕТА:
1. ПЕРВЫЙ ПРИОРИТЕТ — БАЗА ЗНАНИЙ СТУДИИ:
   - Внимательно изучи предоставленный КОНТЕКСТ. Если в нём есть ответ — опирайся В ПЕРВУЮ ОЧЕРЕДЬ на него.
2. ВТОРОЙ ПРИОРИТЕТ — СОБСТВЕННАЯ ЭКСПЕРТИЗА (Эрудиция):
   - Если в КОНТЕКСТЕ нет прямого ответа — давай полезные советы от лица эксперта DanceKids (детская психология, мотивация, хореография).
3. ОРГАНИЗАЦИОННЫЕ И ТЕХНИЧЕСКИЕ ВОПРОСЫ:
   - Подскажи, что расписание/оплату можно посмотреть в соседних разделах ЛК.

ТОН И ФОРМАТ ОБЩЕНИЯ:
- Общайся как опытный педагог-наставник: тепло, вовлекающе, структурированно.
- Дели ответ на короткие абзацы для удобства чтения с телефона.
- В конце каждого ответа обязательно задавай короткий открытый или уточняющий вопрос.

УПРАВЛЕНИЕ ДИАЛОГОМ И ИСТОРИЕЙ:
- КРИТИЧЕСКИ ВАЖНО: Приветствуй пользователя («Здравствуйте!», «Добрый день!») СТРОГО ОДИН РАЗ — только в самом первом сообщении.
- Если в диалоге уже есть история ответов, КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО здороваться снова! Сразу отвечай на вопрос пользователя.
- Не повторяй вводные фразу про школу и не дублируй то, что уже говорил ранее.`;

    // Динамически внедряем найденный RAG-контекст прямо в системную инструкцию текущего запроса
    const fullSystemInstruction = `${baseSystemInstruction}\n\nАКТУАЛЬНЫЙ КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ ДЛЯ ТЕКУЩЕГО ОТВЕТА:\n${contextText || 'Контекст не найден.'}`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: fullSystemInstruction,
    });

    // 3. Строгая очистка и нормализация истории диалога
    const formattedHistory = Array.isArray(history)
      ? history
          .filter((item: any) => item.content || item.text) // Убираем пустые
          .map((item: any) => ({
            role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
            parts: [{ text: String(item.content || item.text || '').trim() }]
          }))
      : [];

    // 4. Запуск чата с чистой историей
    const chat = model.startChat({
      history: formattedHistory,
    });

    // Отправляем ТОЛЬКО чистый вопрос пользователя (без RAG-обёрток)
    const result = await chat.sendMessage(query);
    const finalAnswer = result.response.text();

    return NextResponse.json({ 
      text: finalAnswer,
      sourcesCount: knowledgePackage.selected.length 
    });

  } catch (error) {
    console.error('Knowledge API Error:', error);
    return NextResponse.json(
      { error: 'Ошибка при поиске и генерации ответа' }, 
      { status: 500 }
    );
  }
}