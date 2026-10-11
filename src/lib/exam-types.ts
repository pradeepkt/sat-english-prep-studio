import type { Difficulty, Domain, SubSkill } from "@/lib/labels"

export type Choice = { id: "A" | "B" | "C" | "D"; text: string }

export type ExamQuestion = {
  id: string
  orderIndex: number
  moduleNumber: number
  passage: string
  prompt: string
  options: Choice[]
  domain: Domain
  subSkill: SubSkill
  difficulty: Difficulty
  selectedOption: string | null
  isFlaggedForReview: boolean
  eliminatedOptions: string[]
  timeSpentSeconds: number
  correctOption?: string
  isCorrect?: boolean | null
  staticRationale?: string
  dynamicAiAnalysis?: string | null
  cognitiveMistakeType?: string | null
}

export type ExamSession = {
  id: string
  title: string
  status: "NOT_STARTED" | "IN_PROGRESS" | "ABANDONED" | "COMPLETED"
  currentModule: number
  moduleCount: number
  timeRemainingSec: number
  totalQuestions: number
  totalTimeMinutes: number
  isAdaptiveFocus: boolean
  isPaused: boolean
  resumeIndex: number
  scoreRaw: number | null
  scoreScaled: number | null
  questions: ExamQuestion[]
}

export type StudioDomain = {
  domain: Domain
  totalAttempted: number
  totalCorrect: number
  accuracyRate: number
  avgTimeSpentSeconds: number
}

export type StudioSession = {
  id: string
  title: string
  status: ExamSession["status"]
  scoreRaw: number | null
  scoreScaled: number | null
  totalQuestions: number
  isAdaptiveFocus: boolean
  currentModule: number
  isPaused: boolean
  createdAt: string
  completedAt: string | null
}

export type StudioPayload = {
  questionCount: number
  domains: StudioDomain[]
  sessions: StudioSession[]
}
