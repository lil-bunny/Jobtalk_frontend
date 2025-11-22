// Pinecone client scaffold. Plug in your API key via env: PINECONE_API_KEY
// and environment: PINECONE_ENV or supported regions.
// Usage example in a service: const pc = await getPinecone();

let clientPromise = null;

export async function getPinecone() {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      console.warn('[pinecone] PINECONE_API_KEY not set; returning null client');
      return null;
    }
    const pc = new Pinecone({ apiKey });
    return pc;
  })();
  return clientPromise;
}
