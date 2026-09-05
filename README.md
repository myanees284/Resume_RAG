# Resume RAG backend

Ingest resume PDFs, turn them into structured data + a Mistral embedding, and store them in MongoDB. Retrieval is not built yet; use the same app and `resumes` collection when you add it.

**Stack:** Node.js, TypeScript, Express, MongoDB Atlas, Mistral embeddings (`mistral-embed`, 1024 dims). Groq is optional (LLM parse only).

## Setup

```bash
npm install
```

Create `.env` (do not commit secrets):

```env
PORT=3000
NODE_ENV=development

MONGODB_URI=your_atlas_uri
DB_NAME=rag_testcases
COLLECTION_NAME=resumes
VECTOR_INDEX_NAME=resumes_index

MISTRAL_API_KEY=your_key
MISTRAL_EMBED_MODEL=mistral-embed
EMBEDDING_DIMENSION=1024

USE_LLM_PARSER=false
GROQ_API_KEY=your_key
GROQ_MODEL=openai/gpt-oss-120b

MAX_UPLOAD_SIZE_MB=5
```

Keep `USE_LLM_PARSER=false` for bulk ingest. Embeddings always use Mistral, not Groq.

## Run the API

```bash
npm run dev
```

Server: `http://localhost:3000`

```bash
curl http://localhost:3000/v1/health
curl http://localhost:3000/v1/health/db
```

## Ingest one PDF

```bash
curl -X POST http://localhost:3000/v1/resume/ingest \
  -F "file=@/path/to/resume.pdf"
```

Flow: upload → extract text → clean → algorithm parse → embed → MongoDB.

PDF only, max 5 MB.

## Ingest a folder

Put PDFs in `Resumes/`. Word files (`.doc` / `.docx`) are skipped.

```bash
npm run ingest:folder
```

This does **not** need `npm run dev`. It talks to Mongo and Mistral directly.

- Default: **5 PDFs at a time**
- Same file bytes are skipped (SHA-256)
- Report: `reports/ingest-folder-report.json`

```bash
npm run ingest:folder -- --limit=5
npm run ingest:folder -- --concurrency=2
npm run ingest:folder -- --dir=/absolute/path/to/Resumes
```

If Mistral returns `429`, the client retries with backoff. If it still fails, use `--concurrency=2` or `--concurrency=1` and run again.

## Useful APIs

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/health` | App up |
| GET | `/v1/health/db` | Mongo up |
| POST | `/v1/resume/ingest` | Full pipeline (file) |
| POST | `/v1/resume/extract` | PDF text |
| POST | `/v1/resume/clean` | `{ "rawText": "..." }` |
| POST | `/v1/resume/parse` | Algorithm parser |
| POST | `/v1/resume/llm-parse` | Groq parser (`USE_LLM_PARSER=true`) |
| POST | `/v1/resume/embed` | Mistral vector |
| POST | `/v1/resume/store` | Save metadata + embedding |

Errors look like:

```json
{
  "success": false,
  "requestId": "...",
  "errorCode": "FILE_REQUIRED",
  "message": "Resume PDF is required"
}
```

## MongoDB

Database and collection come from `.env` (`DB_NAME`, `COLLECTION_NAME`). Each stored resume has `rawText`, metadata, `embedding` (length 1024), and `embeddingModel`.

To reload from scratch: delete documents in `resumes` only, then `npm run ingest:folder`.

## Tests

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest
```
