// Resume domain service: decides how to extract text from various file types
// and can later handle persistence, chunking, embedding, etc.
import { parsePdf } from './pdfService';

const MIME = {
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export async function extractTextFromFile({ buffer, fileName = '', mimeType = '' }) {
  const lower = (fileName || '').toLowerCase();
  if (mimeType === MIME.PDF || lower.endsWith('.pdf')) {
    return await parsePdf(buffer);
  }
  // TODO: Add DOCX parsing (e.g., with 'mammoth') and DOC support
  return '';
}

export function isSupportedMime(mimeType) {
  return [MIME.PDF, MIME.DOC, MIME.DOCX].includes(mimeType);
}

export const SupportedMimes = MIME;
