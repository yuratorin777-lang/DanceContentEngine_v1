// apps/web/src/app/api/ai/v1/query/route.ts
import { NextResponse } from 'next/server';
import path from 'node:path';
// 1. Импортируем существующую функцию из ретривера
import { buildRetrievalPackage } from '@automation/knowledge-retrieval/retriever';

export async function POST(req: Request) {
  try {
    // Проверка секретного ключа авторизации
    const authHeader = req.headers.get('x-api-key');
    if (authHeader !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, history } = await req.json();

    // Корень вашего монорепозитория (из apps/web поднимаемся на два уровня вверх)
    const projectRoot = path.resolve(process.cwd(), '../..');

    // Формируем объект плана для ретривера
    const plan = {
      topic: query,
      keyMessage: query,
      subtopic: '',
      goal: '',
      audience: '',
      audienceNeed: '',
      contentAngle: '',
    };

    // 2. Вызываем ретривер — он собирает релевантный контекст из базы знаний
    const knowledgePackage = await buildRetrievalPackage(projectRoot, plan);

    // Подготавливаем найденный контекст для передачи в ИИ
    const contextText = knowledgePackage.selected
      .map((source, index) => `--- Источник ${index + 1}: ${source.item.title || source.item.path} ---\n${source.content}`)
      .join('\n\n');

    /* 
      3. Здесь вызывается ваша LLM (например, OpenAI / Anthropic / Gemini).
      Передаем ей contextText и query пользователя.
      
      Пример вызова LLM (замените на ваш генератор ответа):
      const answer = await generateAiResponse({
        systemPrompt: "Ты ассистент. Отвечай на вопросы строго по предоставленному контексту.",
        context: contextText,
        userQuery: query,
        history: history
      });
    */

    // Временная заглушка ответа, пока не подключен вызов LLM:
    const answer = `Найдено источников: ${knowledgePackage.selected.length}. Контекст успешно собран.`;

    // 4. Возвращаем итоговый ответ
    return NextResponse.json({ 
      text: answer,
      sourcesCount: knowledgePackage.selected.length 
    });
  } catch (error) {
    console.error('Knowledge API Error:', error);
    return NextResponse.json(
      { error: 'Ошибка при поиске в базе знаний' }, 
      { status: 500 }
    );
  }
}