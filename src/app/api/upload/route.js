import { NextResponse } from 'next/server';
import { extractTextFromFile, isSupportedMime } from '@/services/resumeService';
import { chunkAndSplitText } from '@/services/langchainService';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Reject PDFs here; they must go through /api/parse-pdf
    if ((file.type && /pdf/i.test(file.type)) || /\.pdf$/i.test(file.name || '')) {
      return NextResponse.json({ error: 'PDF uploads are not accepted here. Use /api/parse-pdf.' }, { status: 400 });
    }

    // Validate other file types (basic)
    if (file.type && !isSupportedMime(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Read the file into memory (demo only, not persisted)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Delegate to business logic service
    const text = await extractTextFromFile({ buffer, fileName: file.name, mimeType: file.type });
    const preview = text.slice(0, 500);
    console.log(`[upload] Parsed text length: ${text.length}`);
    if (preview) console.log(`[upload] Preview (first 500 chars):\n${preview}`);

    // Chunk the text (server-side) before responding
    const chunks = await chunkAndSplitText(text);
    console.log(`[upload] Chunked into ${chunks.length} chunks`);

    // Respond with parsed text and chunks
    return NextResponse.json({ success: true, size: buffer.length, text, chunks });
  } catch (err) {
    console.error('[upload] error:', err);
    return NextResponse.json({ error: 'Upload error', detail: String(err?.message || err) }, { status: 500 });
  }
}
