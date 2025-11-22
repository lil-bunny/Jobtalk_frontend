// Robust PDF text extraction for Next.js API route (Node runtime)
// Strategy:
// 1) Try pdf-parse v2 API (PDFParse class) if available.
// 2) Fallback to pdf-parse v1-style default function.
// 3) Final fallback: dynamic import of pdfjs-dist ESM legacy build.






export async function parsePdf(buffer) {
  // Try pdf-parse first (v2 class API)
  try {
    const mod = await import('pdf-parse');
    if (mod && typeof mod.PDFParse === 'function') {
      try {
        const parser = new mod.PDFParse({ data: buffer });
        const result = await parser.getText();
        if (result && typeof result.text === 'string') return result.text;
      } catch (_) {}
    }
    // v1-style fallback
    const pdfParse = mod.default || mod;
    if (typeof pdfParse === 'function') {
      const data = await pdfParse(buffer);
      if (data && typeof data.text === 'string') return data.text;
    }
  } catch (_) {}

  // Last resort: pdfjs-dist ESM legacy build via dynamic import
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: buffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
    });
    const pdf = await loadingTask.promise;
    let out = '';
    const numPages = pdf.numPages || 0;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items?.map((it) => (typeof it.str === 'string' ? it.str : (it?.unicode || '')) ) || [];
      out += strings.join(' ') + '\n\n';
    }
    try { await pdf.destroy(); } catch {}
    return out.trim();
  } catch (e2) {
    console.error('[pdfService] All PDF parsers failed (pdf-parse and pdfjs-dist):', e2);
    return '';
  }
}
