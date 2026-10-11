# HighSchoolLearner - SAT English Prep Studio

Practice app for the Digital SAT Reading and Writing section, built for a student in Bentonville, Arkansas.

The studio runs full-length tests (2 modules, 27 questions, 32 minutes each), adaptive focus tests that lean on weaker domains, and short drills. The question bank is original and aligned to the official blueprint. It does not reproduce College Board or CrackSAT items.

Projected 200–800 scores appear only on full-length tests. They are estimates, not official College Board scores.

## Run locally

PostgreSQL must be available. The local development database is:

```bash
DATABASE_URL=postgresql://satprep:satprep@127.0.0.1:5432/satprep
```

```bash
cp .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://127.0.0.1:3847.

Answer explanations use the Vercel AI SDK when `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` is set. Without a key, a heuristic explanation is stored instead.

## Import your own questions

Importers upsert by source name and prompt. They accept files you supply. They do not download College Board or CrackSAT archives.

```bash
npm run ingest:json -- scripts/fixtures/sample-question.json
npm run ingest:html -- scripts/fixtures/sample-question.html
npm run ingest:pdf -- path/to/questions.pdf
npm run ingest:url -- https://example.com/my-questions.html
```

HTML and URL pages should use `article.question` with `data-domain`, `data-subskill`, `data-difficulty`, `data-correct`, plus `.source`, `.passage`, `.prompt`, `li[data-id]`, and `.rationale`.

PDF text should use blocks like:

```text
---QUESTION---
SOURCE: My notes
DOMAIN: CRAFT_AND_STRUCTURE
SUBSKILL: WORDS_IN_CONTEXT
DIFFICULTY: MEDIUM
CORRECT: B
PASSAGE:
...
PROMPT:
...
A) ...
B) ...
C) ...
D) ...
RATIONALE:
...
---END---
```

`ingest:url` needs Chrome. Set `CHROME_PATH` if it is not at `/usr/bin/google-chrome`.

## Deploy

`railway.json` builds the Dockerfile. On start, the container runs `prisma migrate deploy`, seeds the original bank if needed (the seed upserts, so reruns are safe), and serves the app on `$PORT`. Health check: `/api/health`.
