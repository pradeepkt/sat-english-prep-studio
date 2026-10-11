import type { Difficulty, Domain, Prisma, SubSkill } from "@prisma/client"
import { DIFFICULTIES, DOMAINS, SUBSKILLS } from "@/lib/labels"
import { prisma } from "@/lib/prisma"

export type IncomingQuestion = {
  sourceName: string
  sourceUrl?: string | null
  domain: Domain
  subSkill: SubSkill
  difficulty: Difficulty
  passage: string
  prompt: string
  options: Array<{ id: string; text: string }>
  correctOption: string
  staticRationale: string
}

export function assertQuestion(value: IncomingQuestion) {
  if (!value.sourceName?.trim() || !value.passage?.trim() || !value.prompt?.trim()) {
    throw new Error("Each question needs a source, passage, and prompt.")
  }
  if (!DOMAINS.includes(value.domain)) throw new Error(`Unknown domain: ${value.domain}`)
  if (!SUBSKILLS.includes(value.subSkill)) throw new Error(`Unknown subskill: ${value.subSkill}`)
  if (!DIFFICULTIES.includes(value.difficulty)) {
    throw new Error(`Unknown difficulty: ${value.difficulty}`)
  }
  if (!["A", "B", "C", "D"].includes(value.correctOption)) {
    throw new Error("correctOption must be A, B, C, or D.")
  }
  if (!Array.isArray(value.options) || value.options.length !== 4) {
    throw new Error("Each question needs exactly four options.")
  }
  if (!value.staticRationale?.trim()) throw new Error("Each question needs a rationale.")
}

export async function upsertQuestions(questions: IncomingQuestion[]) {
  let created = 0
  let updated = 0
  for (const question of questions) {
    assertQuestion(question)
    const existing = await prisma.question.findFirst({
      where: { sourceName: question.sourceName, prompt: question.prompt },
    })
    const data = {
      sourceName: question.sourceName,
      sourceUrl: question.sourceUrl ?? null,
      domain: question.domain,
      subSkill: question.subSkill,
      difficulty: question.difficulty,
      passage: question.passage,
      prompt: question.prompt,
      options: question.options as Prisma.InputJsonValue,
      correctOption: question.correctOption,
      staticRationale: question.staticRationale,
    }
    if (existing) {
      await prisma.question.update({ where: { id: existing.id }, data })
      updated += 1
    } else {
      await prisma.question.create({ data })
      created += 1
    }
  }
  return { created, updated, total: questions.length }
}
