import { readFileSync } from "node:fs"
import path from "node:path"
import type { IncomingQuestion } from "@/lib/upsert-questions"
import { upsertQuestions } from "@/lib/upsert-questions"
import { questionBank } from "@/lib/question-bank"
import { supplementalSource } from "@/lib/supplemental-source"
import { prisma } from "@/lib/prisma"

function readFixtureQuestions(): IncomingQuestion[] {
  const fixturePath = path.join(process.cwd(), "scripts/fixtures/sample-question.json")
  const parsed = JSON.parse(readFileSync(fixturePath, "utf8")) as
    | { questions?: IncomingQuestion[] }
    | IncomingQuestion[]
  const questions = Array.isArray(parsed) ? parsed : parsed.questions
  return questions ?? []
}

export async function rescanQuestionSources() {
  const fromBank: IncomingQuestion[] = [...questionBank, ...supplementalSource].map((question) => ({
    ...question,
    sourceUrl: null,
  }))
  const questions = [...fromBank, ...readFixtureQuestions()]
  const result = await upsertQuestions(questions)
  const questionCount = await prisma.question.count()
  return {
    created: result.created,
    updated: result.updated,
    scanned: result.total,
    questionCount,
  }
}
