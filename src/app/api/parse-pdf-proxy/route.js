import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// POST /api/parse-pdf-proxy
// Forwards multipart PDF to external parse API to avoid CORS in the browser
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const externalBase = process.env.NEXT_PUBLIC_PDF_API || 'https://jobtalk-backend.onrender.com';
    const url = `${externalBase.replace(/\/$/, '')}/api/parse-pdf`;

    const forward = new FormData();
    // Ensure we forward as Blob to keep filename and type
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blob = new Blob([buffer], { type: file.type || 'application/pdf' });
    forward.append('file', blob, file.name || 'upload.pdf');

    const res = await fetch(url, { method: 'POST', body: forward });
    const bodyText = await res.text().catch(() => '<no-body>');

    // Pass-through status and body
    return new NextResponse(bodyText, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Proxy error', detail: String(err?.message || err) }, { status: 500 });
  }
}
