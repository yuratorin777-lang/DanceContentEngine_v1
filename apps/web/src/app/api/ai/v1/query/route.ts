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

    // 3. Задаем РОЛЬ АССИСТЕНТА для Gemini (используем модель gemini-2.5-flash)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: `Ты — заботливый, вежливый и отзывчивый ИИ-ассистент детской танцевальной студии DanceKids.
Твоя задача — консультировать родителей и учеников в чате Личного Кабинета.

ПРАВИЛА ОТВЕТА:
1. ИСТОЧНИК ДАННЫХ: Отвечай строго на основе предоставленного КОНТЕКСТА. Не придумывай правила, цены и расписание от себя.
2. ФОРМАТ И ТОН: Пиши кратко, дружелюбно и по делу, как заботливый администратор в онлайн-чате. Избегай маркетинговых лозунгов, штампов и длинных вступлений.
3. СТРУКТУРА: Если ответ содержит несколько пунктов или шагов (например, список вещей на занятие), оформляй их списком (1, 2, 3 или маркерами).
4. ОТСУТСТВИЕ ИНФОРМАЦИИ: Если в контексте нет прямого ответа на вопрос, ответь нейтрально: "К сожалению, в моей базе нет точной информации по этому вопросу. Обратитесь, пожалуйста, к администратору вашей группы или филиала."`
    });

    const prompt = `
КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:
${contextText || 'Контекст не найден.'}

ВОПРОС ПОЛЬЗОВАТЕЛЯ ИЗ ЧАТА:
${query}
`;

    // 4. Генерируем финальный ответ
    const result = await model.generateContent(prompt);
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