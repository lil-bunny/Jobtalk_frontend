"use client";
import { useState } from 'react';

export default function UploadGate({ onUploaded }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const simpleChunk = (text, chunkSize = 1000, chunkOverlap = 200) => {
    const input = typeof text === 'string' ? text : String(text || '');
    if (!input) return [];
    const chunks = [];
    let i = 0;
    const step = Math.max(1, chunkSize - chunkOverlap);
    while (i < input.length) {
      const end = Math.min(input.length, i + chunkSize);
      chunks.push(input.slice(i, end));
      i += step;
    }
    return chunks;
  };

  const parsePdfInBrowser = async (file) => {
    const buffer = await file.arrayBuffer();
    const pdfjs = await import('pdfjs-dist/build/pdf');
    // Use CDN worker to avoid bundler worker config
    const version = pdfjs?.version || '3.11.174';
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    let out = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const strings = content.items?.map((it) => (typeof it.str === 'string' ? it.str : (it?.unicode || ''))) || [];
      out += strings.join(' ') + '\n\n';
    }
    try { await pdf.destroy(); } catch {}
    return out.trim();
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      let text = '';
      let chunks = [];
      const isPdf = file.type === 'application/pdf' || (file.name || '').toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setError('Only PDF files are allowed.');
        return;
      }

      // 1) Call PDF parser API for PDFs with external fallback
      if (isPdf) {
        try {
          const formPdf = new FormData();
          formPdf.append('file', file);
          const base = (process.env.NEXT_PUBLIC_PDF_API || '').replace(/\/$/, '');
          const url = base ? `${base}/api/parse-pdf` : '/api/parse-pdf';
          console.log('[client] Posting to', url);
          let resPdf = await fetch(url, { method: 'POST', body: formPdf });
          let dataPdf = null;
          if (resPdf.ok) {
            try { dataPdf = await resPdf.json(); } catch {}
            text = dataPdf?.text || '';
          } else {
            const detail = await resPdf.text().catch(() => '<no-body>');
            console.warn('[client] parse-pdf failed', resPdf.status, detail);
          }

          // Fallback to public backend if no text yet and not already using it
          if (!text) {
            const externalUrl = 'https://jobtalk-backend.onrender.com/api/parse-pdf';
            if (url !== externalUrl) {
              console.log('[client] Retrying parse at', externalUrl);
              resPdf = await fetch(externalUrl, { method: 'POST', body: formPdf });
              if (resPdf.ok) {
                try { dataPdf = await resPdf.json(); } catch {}
                text = dataPdf?.text || '';
              } else {
                const detail2 = await resPdf.text().catch(() => '<no-body>');
                console.warn('[client] external parse failed', resPdf.status, detail2);
              }
            }
          }

          if (text) {
            chunks = simpleChunk(text, 1000, 200);
            console.log('[client] Parsed resume text length:', text.length);
          }
        } catch (e) {
          console.warn('[client] /api/parse-pdf error, will try browser parse:', e);
        }
      }

      // 2) No browser fallback; we strictly rely on API(s) for PDFs

      // 3) No server fallback for non-PDFs; we already blocked above

      if (isPdf && !text) {
        console.error('[client] PDF parsing failed via API(s).');
        throw new Error('Could not parse PDF via APIs.');
      }

      console.log('[client] Final parsed resume text length:', text.length);
      if (text) console.log('[client] FULL TEXT (first 2000 chars):\n' + text.slice(0, 2000));
      console.log('[client] Chunk count:', chunks.length);
      if (chunks.length) {
        try {
          console.table(chunks.slice(0, 20).map((c, i) => ({ i, length: c.length, sample: c.slice(0, 120) })));
        } catch {
          console.log('[client] Chunks sample (first 3):', chunks.slice(0, 3));
        }
      }

      onUploaded?.(file.name || 'resume', text, chunks);
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    handleUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleUpload(file);
  };

  const onDragOver = (e) => e.preventDefault();

  return (
    <section className="chat-container grid place-items-center">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="w-full max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-soft"
      >
        <h2 className="text-lg font-semibold">Upload your resume</h2>
        <p className="text-slate-500 mt-1">PDF, DOC, or DOCX up to ~5MB</p>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 justify-center">
          <label className="button-primary cursor-pointer">
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFileChange} />
            {isUploading ? 'Uploading & chunking…' : 'Choose file'}
          </label>
          <button className="button-ghost" onClick={() => document.querySelector('input[type=file]')?.click()} disabled={isUploading}>
            or drag & drop
          </button>
        </div>

        {isUploading && !error && (
          <p className="text-slate-500 mt-4 text-sm">Chunking the resume…</p>
        )}
        {error && <p className="text-red-600 mt-4 text-sm">{error}</p>}
      </div>
    </section>
  );
}
