import "./load-env"
import { prisma } from "../src/lib/prisma"
import { createPracticeSession, getSession, patchSession, submitModule } from "../src/lib/sessions"

async function main() {
const session = await createPracticeSession({ mode: "full" })
const view = await getSession(session.id, false)
if (!view || view.questions.length !== 27) throw new Error("module 1 size")
if (JSON.stringify(view).includes("correctOption")) throw new Error("leaked answer")
const rows = await prisma.testQuestion.findMany({
  where: { testSessionId: session.id },
  include: { question: true },
})
await patchSession(session.id, {
  timeRemainingSec: 1000,
  questions: rows.map((row) => ({
    id: row.id,
    selectedOption: row.question.correctOption,
    timeSpentSeconds: 30,
  })),
})
const advanced = await submitModule(session.id)
if (!advanced || !("advanced" in advanced) || !advanced.advanced) {
  throw new Error("did not advance " + JSON.stringify(advanced))
}
const module2 = await getSession(session.id, false)
if (module2?.currentModule !== 2 || module2.questions.length !== 27) {
  throw new Error("module 2 missing")
}
if (JSON.stringify(module2).includes("correctOption")) throw new Error("leaked module 2")
const hard = await prisma.testQuestion.findMany({
  where: { testSessionId: session.id, moduleNumber: 2 },
  include: { question: true },
})
const counts = { EASY: 0, MEDIUM: 0, HARD: 0 }
for (const row of hard) counts[row.question.difficulty] += 1
if (counts.EASY !== 3 || counts.MEDIUM !== 11 || counts.HARD !== 13) {
  throw new Error("hard route mix " + JSON.stringify(counts))
}
await patchSession(session.id, {
  questions: hard.map((row) => ({
    id: row.id,
    selectedOption: row.question.correctOption,
    timeSpentSeconds: 20,
  })),
})
const done = await submitModule(session.id)
if (!done || !("scoreScaled" in done) || done.scoreRaw !== 54 || done.scoreScaled !== 800) {
  throw new Error("score " + JSON.stringify(done))
}
console.log(JSON.stringify({ module2Difficulty: counts, score: done }))
await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  const { prisma } = await import("../src/lib/prisma")
  await prisma.$disconnect()
  process.exit(1)
})
