// LLM service using OpenAI Chat Completions via fetch
// Requires OPENAI_API_KEY in environment. Falls back to a simple template if missing.

const DEFAULT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

export async function answerWithLLM({ question, context, systemPrompt, model = DEFAULT_MODEL }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const ctx = (context || '').trim();
  if (!apiKey) {
    // Fallback: return a heuristic answer using context
    const summary = ctx ? `Based on your resume context, here are relevant excerpts:\n\n${ctx}` : 'No context available.';
    return `${summary}\n\nAnswer (non-LLM fallback): ${question}`;
  }

  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful assistant that answers strictly using the provided resume context where possible. If the answer is not in the context, say so briefly.' },
    { role: 'user', content: `Context from resume:\n\n${ctx || '(no context)'}\n\nQuestion: ${question}` },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await safeText(res);
    throw new Error(`[llm] OpenAI error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim?.() || '';
  return content || '(empty LLM response)';
}

async function safeText(res) {
  try { return await res.text(); } catch { return '<no-body>'; }
}
