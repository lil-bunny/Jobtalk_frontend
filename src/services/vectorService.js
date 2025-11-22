// Vector service for Pinecone: upsert and query chunk embeddings
// This service expects an async `embedder` you provide that turns an array of
// strings into an array of float vectors. Example signature:
//   async function embedder(texts) => number[][]
// You can wire OpenAI, Cohere, Voyage, etc. from another service.

import { getPinecone } from '@/lib/pinecone';

/**
 * Ensure a Pinecone index exists. If it already exists, this is a no-op.
 * Note: Creating indexes can take time; avoid calling on every request.
 */
export async function ensureIndex(indexName, dimension, opts = {}) {
  const pc = await getPinecone();
  if (!pc) throw new Error('Pinecone client not initialized (missing PINECONE_API_KEY)');

  // Try to describe; if fails, attempt create
  try {
    // Some SDKs expose listIndexes/describeIndex; we try list first
    if (pc.listIndexes) {
      const indexes = await pc.listIndexes();
      if (Array.isArray(indexes) && indexes.find((x) => x.name === indexName)) return true;
    } else if (pc.describeIndex) {
      await pc.describeIndex(indexName);
      return true;
    }
  } catch (_) {
    // fall through to create
  }

  // Create the index if not present
  try {
    // Use serverless spec if available
    if (pc.createIndex) {
      const cloud = opts.cloud || process.env.PINECONE_CLOUD || 'aws';
      const region = opts.region || process.env.PINECONE_REGION || 'us-east-1';
      await pc.createIndex({
        name: indexName,
        dimension,
        metric: opts.metric || 'cosine',
        spec: opts.spec || { serverless: { cloud, region } },
      });
      return true;
    }
  } catch (e) {
    // If already exists, ignore
    if (!/already exists/i.test(String(e?.message || ''))) {
      throw e;
    }
  }
  return true;
}

/**
 * Upsert chunk texts as vectors into Pinecone.
 * @param {string} indexName
 * @param {string} namespace
 * @param {string[]} chunks
 * @param {function} embedder - async function(texts) => number[][]
 * @returns {Promise<{upsertedCount:number}>}
 */
export async function upsertChunks({ indexName, namespace = 'default', chunks, embedder, idPrefix }) {
  if (!Array.isArray(chunks) || chunks.length === 0) return { upsertedCount: 0 };
  if (typeof embedder !== 'function') throw new Error('embedder function is required');

  const pc = await getPinecone();
  if (!pc) throw new Error('Pinecone client not initialized (missing PINECONE_API_KEY)');
  const index = pc.index(indexName);

  const vectors = await embedAsVectors(chunks, embedder);
  const payload = vectors.map((v, i) => ({
    id: `${idPrefix || 'chunk-'}${i}`,
    values: v,
    metadata: { text: chunks[i], source: 'resume' },
  }));

  if (index.namespace) {
    await index.namespace(namespace).upsert(payload);
  } else {
    // Older SDK shape
    await index.upsert(payload, { namespace });
  }

  return { upsertedCount: payload.length };
}

/**
 * Query Pinecone with a text prompt, returning topK matches with metadata.
 * @param {string} indexName
 * @param {string} namespace
 * @param {string} queryText
 * @param {number} topK
 * @param {function} embedder - async function([text]) => number[][]
 */
export async function querySimilar({ indexName, namespace = 'default', queryText, topK = 5, embedder }) {
  if (!queryText) return { matches: [] };
  if (typeof embedder !== 'function') throw new Error('embedder function is required');

  const pc = await getPinecone();
  if (!pc) throw new Error('Pinecone client not initialized (missing PINECONE_API_KEY)');
  const index = pc.index(indexName);

  const [vector] = await embedder([queryText]);
  if (!Array.isArray(vector)) throw new Error('embedder must return number[][]');

  let result;
  if (index.namespace) {
    result = await index.namespace(namespace).query({
      vector,
      topK,
      includeMetadata: true,
    });
  console.log("result-vector",result)
  } else {
    result = await index.query({ vector, topK, includeMetadata: true, namespace });
    console.log("result-vector",result)
  }

  // Normalize output shape
  const matches = result?.matches || result?.data?.matches || [];
  return { matches };
}

async function embedAsVectors(texts, embedder) {
  const vectors = await embedder(texts);
  if (!Array.isArray(vectors) || !Array.isArray(vectors[0])) {
    throw new Error('embedder must return number[][]');
  }
  return vectors;
}
