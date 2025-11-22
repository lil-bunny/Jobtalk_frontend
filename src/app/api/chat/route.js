import { NextResponse } from 'next/server';
import { getDefaultEmbedder } from '@/services/embeddingService';
import { ensureIndex, upsertChunks, querySimilar } from '@/services/vectorService';
import { answerWithLLM } from '@/services/llmService';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, resumeText = '', sessionId, resumeChunks = [], bootstrap = false } = body || {};

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing "message"' }, { status: 400 });
    }

    const embedder = getDefaultEmbedder();

    // Choose dimension to match embedder implementation
    const dimension = process.env.OPENAI_API_KEY ? (parseInt(process.env.OPENAI_EMBEDDING_DIM || '1536', 10) || 1536) : 128;
    const indexName = process.env.PINECONE_INDEX || 'resume-index';
    const namespace = `session-${sessionId || 'default'}`;

    const doBootstrap = !!(bootstrap && Array.isArray(resumeChunks) && resumeChunks.length > 0);

    if (doBootstrap) {
      await ensureIndex(indexName, dimension, {
        cloud: process.env.PINECONE_CLOUD || 'aws',
        region: process.env.PINECONE_REGION || 'us-east-1',
        waitUntilReady: true,
      });
      try {
        await upsertChunks({ indexName, namespace, chunks: resumeChunks, embedder, idPrefix: `${namespace}-` });
      } catch (e) {
        console.warn('[chat] upsertChunks failed:', e?.message || e);
      }
    }

    // Retrieve similar chunks for this message
    let contextText = '';
    if (doBootstrap || (Array.isArray(resumeChunks) && resumeChunks.length > 0)) {
      try {
        const { matches } = await querySimilar({ indexName, namespace, queryText: message, topK: 5, embedder });
        const top = (matches || []).slice(0, 5);
        contextText = top.map((m, i) => `(${i + 1}) ${m.metadata?.text || ''}`).join('\n\n');
      } catch (e) {
        console.warn('[chat] querySimilar failed:', e?.message || e);
      }
    }

    // LLM answer using retrieved context (fallback handled in service)
    try {
      const reply = await answerWithLLM({
        question: message,
        context: contextText,
      });
      return NextResponse.json({ reply });
    } catch (e) {
      console.error('[chat] LLM call failed:', e?.message || e);
      const fallback = `Could not reach the LLM right now. Here are relevant excerpts from your resume:\n\n${contextText || '(no context found)'}\n\nYour question: "${message}"`;
      return NextResponse.json({ reply: fallback, degraded: true });
    }
  } catch (err) {
    console.error('[chat] route error:', err);
    return NextResponse.json({ error: 'Chat error', detail: String(err?.message || err) }, { status: 500 });
  }
}
