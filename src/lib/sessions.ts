import type { Difficulty, Domain, Prisma } from "@prisma/client"
import {
  BALANCED_MATRIX,
  FULL_LENGTH_MINUTES,
  FULL_LENGTH_QUESTIONS,
  HARD_MATRIX,
  MODULE_QUESTION_COUNT,
  MODULE_SECONDS,
  STRONG_MODULE_CORRECT,
  adaptMatrix,
  selectByMatrix,
  selectDrillQuestions,
} from "@/lib/blueprint"
import { diagnoseMistake } from "@/lib/diagnostics"
import type { Choice, ExamQuestion, ExamSession } from "@/lib/exam-types"
import { DOMAIN_LABELS, DIFFICULTY_LABELS } from "@/lib/labels"
import { prisma } from "@/lib/prisma"
import { projectScaledScore } from "@/lib/scoring"

const CHOICES = new Set(["A", "B", "C", "D"])

function asChoices(value: Prisma.JsonValue): Choice[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return []
    const id = "id" in entry ? String(entry.id) : ""
    const text = "text" in entry ? String(entry.text) : ""
    if (!CHOICES.has(id)) return []
    return [{ id: id as Choice["id"], text }]
  })
}

function moduleCount(totalQuestions: number) {
  return totalQuestions >= FULL_LENGTH_QUESTIONS ? 2 : 1
}

type QuestionRow = Prisma.TestQuestionGetPayload<{ include: { question: true } }>

function toExamQuestion(row: QuestionRow, review: boolean): ExamQuestion {
  const base: ExamQuestion = {
    id: row.id,
    orderIndex: row.orderIndex,
    moduleNumber: row.moduleNumber,
    passage: row.question.passage,
    prompt: row.question.prompt,
    options: asChoices(row.question.options),
    domain: row.question.domain,
    subSkill: row.question.subSkill,
    difficulty: row.question.difficulty,
    selectedOption: row.selectedOption,
    isFlaggedForReview: row.isFlaggedForReview,
    eliminatedOptions: row.eliminatedOptions,
    timeSpentSeconds: row.timeSpentSeconds,
  }
  if (!review) return base
  return {
    ...base,
    correctOption: row.question.correctOption,
    isCorrect: row.isCorrect,
    staticRationale: row.question.staticRationale,
    dynamicAiAnalysis: row.dynamicAiAnalysis,
    cognitiveMistakeType: row.cognitiveMistakeType,
  }
}

function presentSession(
  session: Prisma.TestSessionGetPayload<{ include: { testQuestions: { include: { question: true } } } }>,
  review: boolean,
): ExamSession {
  const questions = session.testQuestions
    .filter((row) => review || row.moduleNumber === session.currentModule)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((row) => toExamQuestion(row, review))
  return {
    id: session.id,
    title: session.title,
    status: session.status,
    currentModule: session.currentModule,
    moduleCount: moduleCount(session.totalQuestions),
    timeRemainingSec: session.timeRemainingSec,
    totalQuestions: session.totalQuestions,
    totalTimeMinutes: session.totalTimeMinutes,
    isAdaptiveFocus: session.isAdaptiveFocus,
    scoreRaw: review ? session.scoreRaw : null,
    scoreScaled: review ? session.scoreScaled : null,
    questions,
  }
}

const includeQuestions = {
  testQuestions: { include: { question: true } },
} satisfies Prisma.TestSessionInclude

export async function getStudio() {
  const [questionCount, proficiency, sessions] = await Promise.all([
    prisma.question.count(),
    prisma.studentDomainProficiency.findMany(),
    prisma.testSession.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ])
  const byDomain = new Map(proficiency.map((row) => [row.domain, row]))
  return {
    questionCount,
    domains: (Object.keys(DOMAIN_LABELS) as Domain[]).map((domain) => {
      const row = byDomain.get(domain)
      return {
        domain,
        totalAttempted: row?.totalAttempted ?? 0,
        totalCorrect: row?.totalCorrect ?? 0,
        accuracyRate: row?.accuracyRate ?? 0,
        avgTimeSpentSeconds: row?.avgTimeSpentSeconds ?? 0,
      }
    }),
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      status: session.status,
      scoreRaw: session.status === "COMPLETED" ? session.scoreRaw : null,
      scoreScaled:
        session.status === "COMPLETED" && !session.isAdaptiveFocus ? session.scoreScaled : null,
      totalQuestions: session.totalQuestions,
      isAdaptiveFocus: session.isAdaptiveFocus,
      currentModule: session.currentModule,
      createdAt: session.createdAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
    })),
  }
}

export async function createPracticeSession(input: {
  mode: "full" | "adaptive" | "drill"
  domain?: Domain | "ALL"
  difficulty?: Difficulty | "MIXED"
  count?: number
}) {
  const bank = await prisma.question.findMany({
    select: { id: true, domain: true, difficulty: true },
  })
  if (bank.length < MODULE_QUESTION_COUNT) {
    throw new Error("The question bank is not ready yet. Seed it and try again.")
  }

  if (input.mode === "drill") {
    const count = Math.min(15, Math.max(1, input.count ?? 6))
    const picked = selectDrillQuestions(bank, {
      domain: input.domain ?? "ALL",
      difficulty: input.difficulty ?? "MIXED",
      count,
    })
    if (!picked.length) throw new Error("No questions match that drill.")
    const seconds = Math.max(
      180,
      Math.round(picked.length * (MODULE_SECONDS / MODULE_QUESTION_COUNT)),
    )
    const domainName =
      input.domain && input.domain !== "ALL" ? DOMAIN_LABELS[input.domain] : "Mixed domains"
    const difficultyName =
      input.difficulty && input.difficulty !== "MIXED"
        ? DIFFICULTY_LABELS[input.difficulty]
        : "Mixed difficulty"
    return prisma.testSession.create({
      data: {
        title: `Drill · ${domainName} · ${difficultyName}`,
        totalQuestions: picked.length,
        totalTimeMinutes: Math.ceil(seconds / 60),
        status: "IN_PROGRESS",
        currentModule: 1,
        timeRemainingSec: seconds,
        startedAt: new Date(),
        isAdaptiveFocus: false,
        testQuestions: {
          create: picked.map((question, index) => ({
            questionId: question.id,
            moduleNumber: 1,
            orderIndex: index + 1,
            eliminatedOptions: [],
          })),
        },
      },
    })
  }

  const proficiency = await prisma.studentDomainProficiency.findMany()
  const base = BALANCED_MATRIX
  const matrix = input.mode === "adaptive" ? adaptMatrix(base, proficiency) : base
  let moduleOne
  try {
    moduleOne = selectByMatrix(bank, matrix, new Set())
  } catch {
    moduleOne = selectByMatrix(bank, base, new Set())
  }

  return prisma.testSession.create({
    data: {
      title:
        input.mode === "adaptive"
          ? "Adaptive focus · Reading and Writing"
          : "Full-length Reading and Writing",
      totalQuestions: FULL_LENGTH_QUESTIONS,
      totalTimeMinutes: FULL_LENGTH_MINUTES,
      status: "IN_PROGRESS",
      currentModule: 1,
      timeRemainingSec: MODULE_SECONDS,
      startedAt: new Date(),
      isAdaptiveFocus: input.mode === "adaptive",
      testQuestions: {
        create: moduleOne.map((question, index) => ({
          questionId: question.id,
          moduleNumber: 1,
          orderIndex: index + 1,
          eliminatedOptions: [],
        })),
      },
    },
  })
}

export async function getSession(id: string, review: boolean) {
  const session = await prisma.testSession.findUnique({
    where: { id },
    include: includeQuestions,
  })
  if (!session) return null
  if (review && session.status !== "COMPLETED") {
    throw new Error("Results are available after the session is submitted.")
  }
  return presentSession(session, review && session.status === "COMPLETED")
}

type PatchBody = {
  timeRemainingSec?: number
  questions?: Array<{
    id: string
    selectedOption?: string | null
    isFlaggedForReview?: boolean
    eliminatedOptions?: string[]
    timeSpentSeconds?: number
  }>
}

export async function patchSession(id: string, body: PatchBody) {
  const session = await prisma.testSession.findUnique({ where: { id } })
  if (!session) return null
  if (session.status !== "IN_PROGRESS") {
    throw new Error("This session is no longer in progress.")
  }
  if (typeof body.timeRemainingSec === "number" && Number.isFinite(body.timeRemainingSec)) {
    await prisma.testSession.update({
      where: { id },
      data: { timeRemainingSec: Math.max(0, Math.round(body.timeRemainingSec)) },
    })
  }
  if (body.questions?.length) {
    const owned = await prisma.testQuestion.findMany({
      where: { testSessionId: id, moduleNumber: session.currentModule },
      select: { id: true },
    })
    const allowed = new Set(owned.map((row) => row.id))
    await prisma.$transaction(
      body.questions
        .filter((question) => allowed.has(question.id))
        .map((question) => {
          const data: Prisma.TestQuestionUpdateInput = {}
          if (question.selectedOption === null) data.selectedOption = null
          if (question.selectedOption && CHOICES.has(question.selectedOption)) {
            data.selectedOption = question.selectedOption
          }
          if (typeof question.isFlaggedForReview === "boolean") {
            data.isFlaggedForReview = question.isFlaggedForReview
          }
          if (Array.isArray(question.eliminatedOptions)) {
            data.eliminatedOptions = question.eliminatedOptions.filter((option) => CHOICES.has(option))
          }
          if (typeof question.timeSpentSeconds === "number") {
            data.timeSpentSeconds = Math.max(0, Math.round(question.timeSpentSeconds))
          }
          return prisma.testQuestion.update({ where: { id: question.id }, data })
        }),
    )
  }
  return getSession(id, false)
}

async function updateProficiency(sessionId: string) {
  const rows = await prisma.testQuestion.findMany({
    where: { testSessionId: sessionId },
    include: { question: { select: { domain: true } } },
  })
  const grouped = new Map<Domain, { attempted: number; correct: number; seconds: number }>()
  for (const row of rows) {
    const bucket = grouped.get(row.question.domain) ?? { attempted: 0, correct: 0, seconds: 0 }
    bucket.attempted += 1
    bucket.correct += row.isCorrect ? 1 : 0
    bucket.seconds += row.timeSpentSeconds
    grouped.set(row.question.domain, bucket)
  }
  for (const [domain, bucket] of grouped) {
    const existing = await prisma.studentDomainProficiency.findUnique({ where: { domain } })
    const totalAttempted = (existing?.totalAttempted ?? 0) + bucket.attempted
    const totalCorrect = (existing?.totalCorrect ?? 0) + bucket.correct
    const previousWeight = (existing?.avgTimeSpentSeconds ?? 0) * (existing?.totalAttempted ?? 0)
    const avgTimeSpentSeconds = totalAttempted
      ? (previousWeight + bucket.seconds) / totalAttempted
      : 0
    await prisma.studentDomainProficiency.upsert({
      where: { domain },
      create: {
        domain,
        totalAttempted,
        totalCorrect,
        accuracyRate: totalAttempted ? totalCorrect / totalAttempted : 0,
        avgTimeSpentSeconds,
      },
      update: {
        totalAttempted,
        totalCorrect,
        accuracyRate: totalAttempted ? totalCorrect / totalAttempted : 0,
        avgTimeSpentSeconds,
      },
    })
  }
}

export async function submitModule(id: string) {
  const session = await prisma.testSession.findUnique({
    where: { id },
    include: includeQuestions,
  })
  if (!session) return null
  if (session.status !== "IN_PROGRESS") {
    throw new Error("This session is no longer in progress.")
  }

  const current = session.testQuestions.filter((row) => row.moduleNumber === session.currentModule)
  await prisma.$transaction(
    current.map((row) =>
      prisma.testQuestion.update({
        where: { id: row.id },
        data: { isCorrect: row.selectedOption === row.question.correctOption },
      }),
    ),
  )

  const hasAnotherModule =
    session.totalQuestions >= FULL_LENGTH_QUESTIONS && session.currentModule === 1
  if (hasAnotherModule) {
    const correct = current.filter((row) => row.selectedOption === row.question.correctOption).length
    const mix = correct >= STRONG_MODULE_CORRECT ? HARD_MATRIX : BALANCED_MATRIX
    const proficiency = session.isAdaptiveFocus
      ? await prisma.studentDomainProficiency.findMany()
      : []
    const matrix = session.isAdaptiveFocus ? adaptMatrix(mix, proficiency) : mix
    const used = new Set(session.testQuestions.map((row) => row.questionId))
    const bank = await prisma.question.findMany({
      select: { id: true, domain: true, difficulty: true },
    })
    let moduleTwo
    try {
      moduleTwo = selectByMatrix(bank, matrix, used)
    } catch {
      moduleTwo = selectByMatrix(bank, mix, used)
    }
    await prisma.testQuestion.createMany({
      data: moduleTwo.map((question, index) => ({
        testSessionId: id,
        questionId: question.id,
        moduleNumber: 2,
        orderIndex: index + 1,
        eliminatedOptions: [],
      })),
    })
    await prisma.testSession.update({
      where: { id },
      data: { currentModule: 2, timeRemainingSec: MODULE_SECONDS },
    })
    return { advanced: true as const, currentModule: 2 }
  }

  const graded = await prisma.testQuestion.findMany({ where: { testSessionId: id } })
  const scoreRaw = graded.filter((row) => row.isCorrect).length
  const fullLength = session.totalQuestions >= FULL_LENGTH_QUESTIONS && !session.isAdaptiveFocus
  const scoreScaled = fullLength ? projectScaledScore(scoreRaw, FULL_LENGTH_QUESTIONS) : null
  await updateProficiency(id)
  await prisma.testSession.update({
    where: { id },
    data: {
      status: "COMPLETED",
      scoreRaw,
      scoreScaled,
      completedAt: new Date(),
      timeRemainingSec: 0,
    },
  })
  return { advanced: false as const, completed: true, scoreRaw, scoreScaled }
}

export async function abandonSession(id: string, body: PatchBody) {
  const session = await prisma.testSession.findUnique({ where: { id } })
  if (!session) return null
  if (session.status === "COMPLETED") {
    throw new Error("A completed session cannot be abandoned.")
  }
  if (session.status === "IN_PROGRESS") {
    await patchSession(id, body)
    await prisma.testSession.update({
      where: { id },
      data: { status: "ABANDONED", abandonedAt: new Date() },
    })
  }
  return { abandoned: true }
}

export async function explainMistake(sessionId: string, testQuestionId: string) {
  const row = await prisma.testQuestion.findFirst({
    where: { id: testQuestionId, testSessionId: sessionId },
    include: { question: true, testSession: true },
  })
  if (!row) return null
  if (row.testSession.status !== "COMPLETED") {
    throw new Error("Explanations open after you submit the session.")
  }
  const options = asChoices(row.question.options)
  const isCorrect = row.selectedOption === row.question.correctOption
  const diagnosis = await diagnoseMistake({
    passage: row.question.passage,
    prompt: row.question.prompt,
    options,
    correctOption: row.question.correctOption,
    selectedOption: row.selectedOption,
    subSkill: row.question.subSkill,
    staticRationale: row.question.staticRationale,
    timeSpentSeconds: row.timeSpentSeconds,
    isCorrect,
  })
  await prisma.testQuestion.update({
    where: { id: row.id },
    data: {
      dynamicAiAnalysis: diagnosis.dynamicAiAnalysis,
      cognitiveMistakeType: diagnosis.cognitiveMistakeType,
      isCorrect,
    },
  })
  return diagnosis
}
