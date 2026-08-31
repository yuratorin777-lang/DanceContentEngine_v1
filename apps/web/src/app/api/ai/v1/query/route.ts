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

    // 2. Определение контекста поиска для RAG
    // Если пользователь ответил коротко (например: "Да", "Расскажи", "Хорошо"), 
    // берем предыдущую тему диалога, чтобы ретривер не искал по пустому слову "Да"
    let searchQuery = query;
    if (query.trim().length <= 15 && formattedHistory.length > 0) {
      const lastMessages = [...formattedHistory].reverse();
      const lastModelMsg = lastMessages.find(m => m.role === 'model');
      const lastUserMsg = lastMessages.find(m => m.role === 'user');
      searchQuery = `${lastUserMsg?.parts[0]?.text || ''} ${lastModelMsg?.parts[0]?.text || ''} ${query}`.slice(0, 300);
    }

    // 3. Вызов ретривера базы знаний
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

    // 4. Системный промт с жесткими правилами продолжения бесед
    const baseSystemInstruction = `Ты — заботливый, умный и опытный ИИ-наставник и ассистент детской танцевальной студии DanceKids.
Твоя главная задача — быть внимательным собеседником и экспертным консультантом для родителей в Личном Кабинете.

ПРИОРИТЕТЫ И СТРАТЕГИЯ ПОИСКА ОТВЕТА:
1. ПЕРВЫЙ ПРИОРИТЕТ — БАЗА ЗНАНИЙ СТУДИИ:
   - Внимательно изучи предоставленный КОНТЕКСТ. Опирайся В ПЕРВУЮ ОЧЕРЕДЬ на него.
   - Используй факты, регламенты, правила и философию студии из КОНТЕКСТА только тогда, когда они ПРЯМО отвечают на вопрос пользователя.
2. ВТОРОЙ ПРИОРИТЕТ — СОБСТВЕННАЯ ЭКСПЕРТИЗА И ПРАКТИЧНОСТЬ:
   - Если в КОНТЕКСТЕ нет прямого ответа или контекст содержит общие рассуждения — давай конкретные, применимые советы от лица эксперта DanceKids (детская психология, сценический опыт, хореография).
   - Если родитель спрашивает про стеснение, адаптацию или страхи ребёнка — давай четкий список из 4-5 простых практических шагов, которые родитель или педагог могут сделать прямо сейчас.

СТРОГИЕ ПРАВИЛА РЕЛЕВАНТНОСТИ И ТОНА:
- Избегай общих философских лекций (о "современных родителях", "влиянии гаджетов", "трендах воспитания"), если родитель просит конкретный совет по поведению или эмоциям ребёнка.
- Говори с родителем поддерживающе, с душой и заботой, без поучений и наставнического тона.

ПРАВИЛА НЕПРЕРЫВНОГО ДИАЛОГА (КРИТИЧЕСКИ ВАЖНО):
- Если пользователь пишет короткий ответ ("Да", "Расскажи", "Интересно", "Давай" и т.д.) — он отвечает на ТВОЙ ПОСЛЕДНИЙ ВОПРОС!
- СРАЗУ раскрывай тему, которую ты сам пообещал или предложил в своём предыдущем сообщении! 
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО при ответах вроде "Да" спрашивать родителю заново: "Чем я могу помочь?" или "Какой у вас возник вопрос?". Ты ДОЛЖЕН ПРИСТУПАТЬ к раскрытию предложенной темы.
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО повторять приветствия ("Здравствуйте", "Добрый день", "Я к вашим услугам").`;

    const fullSystemInstruction = `${baseSystemInstruction}\n\nАКТУАЛЬНЫЙ КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:\n${contextText || 'Контекст не найден.'}`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: fullSystemInstruction,
    });

    // 5. Запуск чата с историей
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