import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// POST /api/parse-pdf
// Accepts multipart/form-data with a single field "file" (a PDF)
// Returns { text, pages, info }
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const name = file.name || 'upload.pdf';
    const mime = file.type || 'application/pdf';

    if (!/pdf/i.test(mime) && !/\.pdf$/i.test(name)) {
      return NextResponse.json({ error: 'Only PDF files are supported by this endpoint' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try pdf-parse v2 API first, then v1
    let text = '';
    let pages = undefined;
    let info = undefined;

    try {
      const mod = await import('pdf-parse');

      // v2 style: new PDFParse({ data }).getText()
      if (mod && typeof mod.PDFParse === 'function') {
        try {
          const parser = new mod.PDFParse({ data: buffer });
          const result = await parser.getText();
          if (result && typeof result.text === 'string') {
            text = result.text;
            pages = result?.numpages || result?.pages;
            info = result?.info || null;
          }
        } catch (_) {}
      }

      // v1 style: default export is a function (buffer) => { text, numpages, info }
      if (!text) {
        const pdfParse = mod.default || mod;
        if (typeof pdfParse === 'function') {
          const result = await pdfParse(buffer);
          if (result && typeof result.text === 'string') {
            text = result.text;
            pages = result?.numpages || result?.pages;
            info = result?.info || null;
          }
        }
      }
    } catch (e) {
      // Surface the error but keep consistent shape
      return NextResponse.json({ error: 'pdf-parse unavailable', detail: String(e?.message || e) }, { status: 500 });
    }

    if (!text) {
      return NextResponse.json({ error: 'Unable to extract text from PDF' }, { status: 500 });
    }

    return NextResponse.json({ text, pages: pages ?? null, info: info ?? null });
  } catch (err) {
    return NextResponse.json({ error: 'PDF parse API error', detail: String(err?.message || err) }, { status: 500 });
  }
}
