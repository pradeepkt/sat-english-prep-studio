import "../scripts/load-env"
import { questionBank } from "../src/lib/question-bank"
import { upsertQuestions } from "../src/lib/upsert-questions"
import {
  BALANCED_MATRIX,
  HARD_MATRIX,
  selectByMatrix,
} from "../src/lib/blueprint"

async function assertAssembly() {
  const bank = questionBank.map((question, index) => ({
    id: String(index),
    domain: question.domain,
    difficulty: question.difficulty,
  }))
  const moduleOne = selectByMatrix(bank, BALANCED_MATRIX, new Set())
  const used = new Set(moduleOne.map((question) => question.id))
  const hard = selectByMatrix(bank, HARD_MATRIX, used)
  const balancedAgain = selectByMatrix(bank, BALANCED_MATRIX, used)
  if (moduleOne.length !== 27 || hard.length !== 27 || balancedAgain.length !== 27) {
    throw new Error("The bank cannot build both module routes.")
  }
}

async function main() {
  await assertAssembly()
  const result = await upsertQuestions(
    questionBank.map((question) => ({
      ...question,
      sourceUrl: null,
    })),
  )
  console.log(
    `Question bank ready. Created ${result.created}, updated ${result.updated}, total ${result.total}.`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma")
    await prisma.$disconnect()
  })
