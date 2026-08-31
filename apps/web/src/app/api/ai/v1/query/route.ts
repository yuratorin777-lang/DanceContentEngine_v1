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

    // 1. Форматируем и очищаем историю сообщений
    const formattedHistory = Array.isArray(history)
      ? history
          .filter((item: any) => item.content || item.text)
          .map((item: any) => ({
            role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
            parts: [{ text: String(item.content || item.text || '').trim() }]
          }))
      : [];

    // 2. Сбор поискового запроса для RAG: если сообщение короткое (согласие/уточнение), 
    // добавляем тему из предыдущего сообщения пользователя
    let searchQuery = query;
    if (formattedHistory.length > 0) {
      const lastUserMsg = [...formattedHistory].reverse().find(m => m.role === 'user');
      if (lastUserMsg && query.length < 30) {
        searchQuery = `${lastUserMsg.parts[0].text} ${query}`;
      }
    }

    // 3. Вызов ретривера базы знаний по составному поисковому запросу
    const projectRoot = path.resolve(process.cwd(), '../..');
    const plan = {
      topic: searchQuery,
      keyMessage: searchQuery,
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

    // 4. Системный промт с акцентом на ведение непрерывной беседы
    const baseSystemInstruction = `Ты — заботливый, умный и опытный ИИ-наставник и ассистент детской танцевальной студии DanceKids.
Твоя главная задача — быть собеседником и экспертным консультантом для родителей в Личном Кабинете.

ПРИОРИТЕТЫ И СТРАТЕГИЯ ПОИСКА ОТВЕТА:
1. ПЕРВЫЙ ПРИОРИТЕТ — БАЗА ЗНАНИЙ СТУДИИ:
   - Внимательно изучи предоставленный КОНТЕКСТ. Если в нём есть ответ — опирайся В ПЕРВУЮ ОЧЕРЕДЬ на него, сохраняя подходы DanceKids.
2. ВТОРОЙ ПРИОРИТЕТ — СОБСТВЕННАЯ ЭКСПЕРТИЗА:
   - Если в КОНТЕКСТЕ нет прямого ответа — давай практичные советы от лица эксперта DanceKids (детская психология, мотивация, хореография).
3. ОРГАНИЗАЦИОННЫЕ И ТЕХНИЧЕСКИЕ ВОПРОСЫ:
   - Подскажи, что точное расписание и оплату можно посмотреть в соседних разделах ЛК.

ПРИНЦИПЫ ВЕДЕНИЯ НЕПРЕРЫВНОГО ДИАЛОГА:
- Ты ведешь ЕДИНУЮ живую беседу с родителем, а не отвечаешь на изолированные вопросы.
- Всегда развивай мысли из предыдущих сообщений диалога.
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО здороваться повторно («Здравствуйте», «Добрый день»), если в истории диалога уже есть сообщения!
- Избегай повторения одинаковых вводных фраз про школу и презентаций студии.
- Дели ответ на короткие читаемые абзацы.
- В конце каждого ответа обязательно задавай короткий открытый или уточняющий вопрос по теме беседы.`;

    const fullSystemInstruction = `${baseSystemInstruction}\n\nАКТУАЛЬНЫЙ КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:\n${contextText || 'Контекст не найден.'}`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: fullSystemInstruction,
    });

    // 5. Запуск чата с переданной историей
    const chat = model.startChat({
      history: formattedHistory,
    });

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