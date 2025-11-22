import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function chunkAndSplitText(text) {
  const input = typeof text === 'string' ? text : String(text || '');
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitText(input);
  console.log(`[langchain] Chunked into ${chunks.length} chunks`);
  return chunks;
}
