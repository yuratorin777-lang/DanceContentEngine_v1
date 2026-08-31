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

    // 1. Приводим историю к строгому формату Gemini SDK
    const rawHistory = Array.isArray(history) ? history : [];
    const formattedHistory = rawHistory
      .filter((item: any) => (item.content || item.text) && String(item.content || item.text).trim() !== '')
      .map((item: any) => ({
        role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(item.content || item.text || '').trim() }]
      }));

    // 2. Вызов ретривера базы знаний (с защитой от сбоев на короткие ответы)
    const isShortReply = query.trim().length <= 15;
    let contextText = '';
    let sourcesCount = 0;

    if (!isShortReply) {
      let searchQuery = query;
      if (formattedHistory.length > 0) {
        const lastMessages = [...formattedHistory].reverse();
        const lastModelMsg = lastMessages.find(m => m.role === 'model');
        const lastUserMsg = lastMessages.find(m => m.role === 'user');
        searchQuery = `${lastUserMsg?.parts[0]?.text || ''} ${lastModelMsg?.parts[0]?.text || ''} ${query}`.slice(0, 300);
      }

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
      contextText = knowledgePackage.selected
        .map((source, index) => `--- Источник ${index + 1}: ${source.item.title || source.item.path} ---\n${source.content}`)
        .join('\n\n');
      sourcesCount = knowledgePackage.selected.length;
    }

    // 3. Базовый промпт с адаптацией под Lite-модель
    const baseSystemInstruction = `Ты — заботливый, умный и опытный ИИ-наставник и ассистент детской танцевальной студии DanceKids.
Твоя главная задача — быть внимательным собеседником и экспертным консультантом для родителей в Личном Кабинете.

ПРИОРИТЕТЫ И СТРАТЕГИЯ ПОИСКА ОТВЕТА:
1. ПЕРВЫЙ ПРИОРИТЕТ — БАЗА ЗНАНИЙ СТУДИИ:
   - Изучи КОНТЕКСТ. Опирайся В ПЕРВУЮ ОЧЕРЕДЬ на него.
   - Используй факты и регламенты только тогда, когда они ПРЯМО отвечают на вопрос.
2. ВТОРОЙ ПРИОРИТЕТ — СОБСТВЕННАЯ ЭКСПЕРТИЗА:
   - Если в КОНТЕКСТЕ нет прямого ответа — давай конкретные советы (детская психология, хореография).

ПРАВИЛА ИЗБЕЖАНИЯ ПОВТОРОВ И ДИНАМИКИ (ДЛЯ LITE МОДЕЛИ):
- НЕ ПОВТОРЯЙ списки советов, которые уже есть в истории диалога!
- Отвечай точечно. Если спросили "Через сколько пройдет?" — ответь только про сроки и работу педагогов, без повторного списка из 5 пунктов.
- Избегай общих рассуждений (о "гаджетах", "современных родителях"), пиши только по существу проблемы.`;

    // Важно: Помещаем правила короткого ответа в САМЫЙ КОНЕЦ перед контекстом (Lite-модели лучше всего считывают финал промпта)
    const finalInstructions = `
ГЛАВНОЕ ПРАВИЛО ПРОДОЛЖЕНИЯ ДИАЛОГА:
- Если пользователь пишет короткий ответ ("Да", "Расскажи", "Интересно", "Давай") — он отвечает на ТВОЙ ПОСЛЕДНИЙ ВОПРОС!
- СРАЗУ раскрывай тему, которую пообещал в предыдущем сообщении.
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО заново спрашивать "Чем я могу помочь?" или повторять приветствия ("Здравствуйте").`;

    const fullSystemInstruction = `${baseSystemInstruction}\n${finalInstructions}\n\nАКТУАЛЬНЫЙ КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:\n${contextText || 'Контекст не подтягивался (короткая реплика) или не найден.'}`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash-lite',
      systemInstruction: fullSystemInstruction,
    });

    // 4. Запуск чата с историей
    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(query);
    const finalAnswer = result.response.text();

    return NextResponse.json({ 
      text: finalAnswer,
      sourcesCount: sourcesCount
    });

  } catch (error) {
    console.error('Knowledge API Error:', error);
    return NextResponse.json(
      { error: 'Ошибка при поиске и генерации ответа' }, 
      { status: 500 }
    );
  }
}