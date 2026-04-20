# Tastefari RAG MVP V2

Multi-merchant restaurant wine marketing copy generator built as a hybrid RAG system:
vector retrieval for long-form context plus structured entities for high-signal facts.

## Stack

- Next.js 16 (App Router + route handlers)
- TypeScript + PNPM
- Supabase Postgres + pgvector
- Convex (job lifecycle and generation history state)
- OpenAI (embeddings + generation)
- LangChain splitters for chunking

## Product direction

- Build around two knowledge domains:
  - Ops knowledge (`ops`) for wine facts and approved guidance
  - Merchant knowledge (`restaurant`) for restaurant profile/menu/tone
- Keep retrieval separated by source domain, then assemble one grounded context package.
- Generate in two stages:
  - structured draft
  - final polished copy

## Quick setup

1. Copy env vars:
   ```bash
   cp .env.example .env.local
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start Next.js:
   ```bash
   pnpm dev
   ```
4. Start Convex dev (separate terminal):
   ```bash
   pnpm dev:convex
   ```
5. Open `http://localhost:3000/dashboard`.

## Environment variables

See `.env.example`.

Required now:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOY_KEY`

Future auth (planned):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## API routes

- `POST /api/ingest`
  - Accepts multipart files plus `merchantId` and `sourceType`
  - Triggers ingestion workflow and returns job-aware summary
- `POST /api/generate`
  - Accepts merchant + brief
  - Runs dual-source retrieval and two-step generation
  - Persists generation result/history
- `POST /api/seeds/ops`
  - Seeds Ops wine content for local testing

## Core docs

- `docs/architecture.md`
- `docs/ingestion-and-chunking.md`
- `docs/retrieval-strategy.md`
- `docs/operations.md`

## Evaluation

- Eval pack: `evals/retrieval-generation-pack.json`
- Run local eval harness:
  ```bash
  pnpm eval:pack
  ```
  (requires local app server running at `http://localhost:3000` or `EVAL_API_BASE_URL` set)

## Current MVP constraints

- Supported uploads: `pdf`, `docx`, `jpg`, `jpeg`, `png`, `txt`
- Legacy `.doc` intentionally fails with conversion guidance
- Merchant isolation currently requires server-side enforcement on every route
- Clerk integration is planned after MVP core is stable
