"use client";
import { useState } from 'react';

export default function JobUpload({ onUploaded }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (file) => {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/jd', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      const text = data?.text || '';
      if (!text) throw new Error('No text extracted from the file');
      onUploaded?.(file.name || 'job-description', text);
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
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center shadow-soft"
    >
      <h3 className="text-base font-semibold">Upload Job Description</h3>
      <p className="text-slate-500 mt-1 text-sm">PDF or TXT</p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <label className="button-primary cursor-pointer text-sm px-3 py-1.5">
          <input type="file" accept=".pdf,.txt" className="hidden" onChange={onFileChange} />
          {isUploading ? 'Uploading…' : 'Choose file'}
        </label>
        <button className="button-ghost text-sm px-3 py-1.5" onClick={() => document.querySelector('input[type=file]')?.click()} disabled={isUploading}>
          or drag & drop
        </button>
      </div>
      {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
    </div>
  );
}
