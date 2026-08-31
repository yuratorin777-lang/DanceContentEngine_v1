// apps/web/src/app/api/ai/v1/query/route.ts
import { NextResponse } from 'next/server';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildRetrievalPackage } from '@automation/knowledge-retrieval/retriever';

// Инициализируем Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_ASSISTANT_API_KEY!);

export async function POST(req: Request) {
  try {
    // 1. Проверка секретного ключа авторизации
    const authHeader = req.headers.get('x-api-key');
    if (authHeader !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, history } = await req.json();

    // 2. Вызываем ретривер для сбора контекста
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

    // Подготавливаем найденный контекст
    const contextText = knowledgePackage.selected
      .map((source, index) => `--- Источник ${index + 1}: ${source.item.title || source.item.path} ---\n${source.content}`)
      .join('\n\n');

    // 3. Задаем РОЛЬ АССИСТЕНТА для Gemini (исправлено: двоеточие вместо =)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash-lite',
      systemInstruction: `Ты — заботливый, умный и опытный ИИ-наставник и ассистент детской танцевальной студии DanceKids.
Твоя главная задача — помогать родителям и ученикам в чате Личного Кабинета, давая глубокие, экспертные и понятные ответы.

ПРИОРИТЕТЫ И СТРАТЕГИЯ ПОИСКА ОТВЕТА:

1. ПЕРВЫЙ ПРИОРИТЕТ — БАЗА ЗНАНИЙ СТУДИИ:
   - Внимательно изучи предоставленный КОНТЕКСТ. Это главная база методик, стандартов и глубоких знаний нашей студии.
   - Если в КОНТЕКСТЕ есть ответ на вопрос пользователя (даже частично) — опирайся В ПЕРВУЮ ОЧЕРЕДЬ на него, сохраняя авторскую терминологию и подходы DanceKids.

2. ВТОРОЙ ПРИОРИТЕТ — СОБСТВЕННАЯ ЭКСПЕРТИЗА (Эрудиция):
   - Если в КОНТЕКСТЕ нет прямого ответа на базовые, бытовые или педагогические вопросы (например, о мотивации ребенка, покупке первой формы, растяжке, преодолении стеснения) — не отказывай в ответе!
   - Используй свои глубокие знания о танцах, хореографии и детской психологии, чтобы давать полезные, добрые и практичные советы от лица эксперта DanceKids.

3. ОРГАНИЗАЦИОННЫЕ И ТЕХНИЧЕСКИЕ ВОПРОСЫ (Расписание, Оплата):
   - Учитывай, что пользователь уже находится в Личном Кабинете (он наш клиент). Расписание и абонементы доступны ему в соседних вкладках ЛК.
   - Если пользователь спрашивает про точное расписание своей группы или финансовые детали, а в КОНТЕКСТЕ этих данных нет — вежливо подскажи, что расписание можно посмотреть в соседнем разделе ЛК или уточнить у администратора группы.

ТОН И ФОРМАТ ОБЩЕНИЯ:
- Общайся как опытный педагог-наставник: тепло, вовлекающе, структурированно и с искренней заботой о ребенке.
- Избегай формализма, сухих отписок («Информация отсутствует») и рекламных лозунгов.
- Дели ответ на короткие абзацы или списки для удобного чтения с телефона.
- В конце каждого ответа обязательно задавай короткий открытый или уточняющий вопрос, чтобы поддержать диалог и помочь родителю лучше сориентироваться.

УПРАВЛЕНИЕ ДИАЛОГОМ И ИСТОРИЕЙ:
- Приветствуй пользователя («Здравствуйте!», «Добрый день!» и т.д.) СТРОГО ОДИН РАЗ — только в самом первом сообщении диалога (когда history пуста).
- Если в истории сообщений (history) уже есть предыдущие реплики, НЕ здоровайся повторно. Сразу переходи к сути ответа, соблюдая естественную нить беседы.
- Учитывай предыдущий контекст разговора и не повторяй то, что уже обсуждалось.`
    });

    // Форматируем историю для Gemini API (если передана)
    const formattedHistory = Array.isArray(history)
      ? history.map((item: any) => ({
          role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.content || item.text || '' }]
        }))
      : [];

    const prompt = `
КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:
${contextText || 'Контекст не найден.'}

ВОПРОС ПОЛЬЗОВАТЕЛЯ ИЗ ЧАТА:
${query}
`;

    // 4. Запускаем чат с сохранённой историей
    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(prompt);
    const finalAnswer = result.response.text();

    // 5. Возвращаем ответ в ЛК
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