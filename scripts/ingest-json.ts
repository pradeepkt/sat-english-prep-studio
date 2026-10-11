import { readFileSync } from "node:fs"
import "./load-env"
import type { IncomingQuestion } from "../src/lib/upsert-questions"
import { upsertQuestions } from "../src/lib/upsert-questions"

const file = process.argv[2]
if (!file) {
  console.error("Usage: npm run ingest:json -- questions.json")
  process.exit(1)
}

const parsed = JSON.parse(readFileSync(file, "utf8")) as { questions?: IncomingQuestion[] } | IncomingQuestion[]
const questions = Array.isArray(parsed) ? parsed : parsed.questions
if (!questions?.length) {
  console.error("JSON must be an array of questions or { questions: [...] }.")
  process.exit(1)
}

upsertQuestions(questions)
  .then((result) => {
    console.log(`Ingested JSON. Created ${result.created}, updated ${result.updated}.`)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma")
    await prisma.$disconnect()
  })
