# Resume Chat (Next.js + Tailwind)

A modular, responsive ChatGPT-like UI that unlocks after uploading a resume.

## Features
- Gated chat: upload a PDF/DOC/DOCX to unlock
- Polished, responsive chat UI (ChatGPT-style)
- Modular components: `Header`, `UploadGate`, `ChatWindow`, `MessageBubble`, `ChatInput`
- Minimal upload API route at `src/app/api/upload/route.js`

## Getting Started

1. Install dependencies
```bash
npm install
```

2. Run dev server
```bash
npm run dev
```

3. Open http://localhost:3000

## Project Structure
- `src/app/layout.js` – Root layout and global styles
- `src/app/page.js` – Home page with upload gate and chat
- `src/components/*` – Modular UI components
- `src/app/api/upload/route.js` – Upload endpoint (demo only)
- `tailwind.config.js`, `postcss.config.js` – Tailwind setup

## API & Business Logic

### Endpoints (`src/app/api/`)
- `upload/route.js` (POST): accepts a file via FormData (`file`), validates type, extracts text (PDF via `pdf-parse`) and returns `{ success, size, text }`.
- `chat/route.js` (POST): accepts `{ message, resumeText, sessionId }` and returns `{ reply }`. Currently uses a mock service; replace with your LLM/RAG logic.

### Services (`src/services/`)
- `resumeService.js`: domain gateway for resume extraction. Exposes `extractTextFromFile({ buffer, fileName, mimeType })`. Add DOCX parsing and any pre/post-processing here.
- `pdfService.js`: low-level PDF parsing using dynamic import of `pdf-parse`.
- `chatService.js`: orchestrates chat reply generation. Replace mock with your pipeline (embeddings, retrieval, LLM call).

### Infrastructure (`src/lib/`)
- `pinecone.js`: lazy-initialized Pinecone client via `getPinecone()`. Set `PINECONE_API_KEY` in environment to enable.

### Path Aliases
- `jsconfig.json` sets `baseUrl: src` and alias `@/*` to `src/*`. Import services as `@/services/...`.

## Where to put business logic
- Parsing, normalization, chunking, and enrichment: `src/services/resumeService.js` (call low-level parsers; add DOCX via `mammoth` if needed).
- Embedding and vector upsert/query: create `src/services/embeddingService.js` and `src/services/vectorService.js` (use `src/lib/pinecone.js`).
- Chat orchestration (RAG, prompts, streaming): `src/services/chatService.js` and wire from `src/app/api/chat/route.js`.

## Extending
- Add DOCX parsing: install `mammoth` and implement in `resumeService.js`.
- Add embeddings: choose OpenAI/other, store vectors in Pinecone via `src/lib/pinecone.js`.
- Stream chat: convert `chat` route to a streaming response and update UI to stream tokens.

## Notes
- The upload route currently validates file type and reads into memory only (no persistence). Hook your processing/storage as needed.
- Chat replies are mocked; integrate your own backend or LLM as needed.
