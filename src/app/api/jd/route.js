import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// POST /api/jd
// Accepts multipart/form-data field "file". Supports PDF or TXT.
// Returns { text }
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = '';

    const isPdf = type.includes('pdf') || name.endsWith('.pdf');
    const isTxt = type.includes('text/plain') || name.endsWith('.txt');

    if (isPdf) {
      // Forward the PDF to external parse endpoint
      try {
        const form = new FormData();
        const blob = new Blob([buffer], { type: 'application/pdf' });
        form.append('file', blob, file.name || 'upload.pdf');
        const res = await fetch('https://jobtalk-backend.onrender.com/api/parse-pdf', { method: 'POST', body: form });
        if (!res.ok) {
          const detail = await res.text().catch(() => '<no-body>');
          return NextResponse.json({ error: 'PDF parse API error', detail }, { status: res.status });
        }
        const data = await res.json();
        text = data?.text || '';
      } catch (e) {
        return NextResponse.json({ error: 'PDF parse API error', detail: String(e?.message || e) }, { status: 500 });
      }
    } else if (isTxt) {
      text = new TextDecoder('utf-8').decode(buffer);
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Upload a PDF or TXT.' }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: 'JD upload error', detail: String(err?.message || err) }, { status: 500 });
  }
}
