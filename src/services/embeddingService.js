// Embedding service with a default OpenAI REST implementation.
// Uses environment variable OPENAI_API_KEY. No external SDK required.

const DEFAULT_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'; // 1536 dims

export function getDefaultEmbedder() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[embedding] OPENAI_API_KEY not set; using random stub embeddings');
    return async (texts) => texts.map(stubVector);
  }
  return async (texts) => embedOpenAI(texts, { apiKey, model: DEFAULT_MODEL });
}

export async function embedOpenAI(texts, { apiKey, model = DEFAULT_MODEL } = {}) {
  const input = Array.isArray(texts) ? texts : [String(texts || '')];
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input }),
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(`[embedding] OpenAI error ${res.status}: ${msg}`);
  }
  const data = await res.json();
  const vectors = data?.data?.map((d) => d?.embedding) || [];
  return vectors;
}

function stubVector(text) {
  // Deterministic pseudo-embedding for development without API key
  const dim = 128; // small dev dimension
  const vec = new Array(dim).fill(0);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  for (let i = 0; i < dim; i++) vec[i] = ((h >>> (i % 24)) % 1000) / 1000;
  return vec;
}

async function safeText(res) {
  try { return await res.text(); } catch { return '<no-body>'; }
}
