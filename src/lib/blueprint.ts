import type { Difficulty, Domain } from "@/lib/labels"
import { DIFFICULTIES, DOMAINS } from "@/lib/labels"

export const MODULE_QUESTION_COUNT = 27
export const MODULE_SECONDS = 32 * 60
export const FULL_LENGTH_QUESTIONS = 54
export const FULL_LENGTH_MINUTES = 64
export const STRONG_MODULE_CORRECT = 18

export const DOMAIN_QUOTAS: Record<Domain, number> = {
  CRAFT_AND_STRUCTURE: 8,
  INFORMATION_AND_IDEAS: 7,
  STANDARD_ENGLISH_CONVENTIONS: 7,
  EXPRESSION_OF_IDEAS: 5,
}

export type Mix = "balanced" | "hard"
export type DifficultyMatrix = Record<Domain, Record<Difficulty, number>>

export type SelectableQuestion = {
  id: string
  domain: Domain
  difficulty: Difficulty
}

export const BALANCED_MATRIX: DifficultyMatrix = {
  CRAFT_AND_STRUCTURE: { EASY: 2, MEDIUM: 4, HARD: 2 },
  INFORMATION_AND_IDEAS: { EASY: 2, MEDIUM: 4, HARD: 1 },
  STANDARD_ENGLISH_CONVENTIONS: { EASY: 2, MEDIUM: 4, HARD: 1 },
  EXPRESSION_OF_IDEAS: { EASY: 2, MEDIUM: 2, HARD: 1 },
}

export const HARD_MATRIX: DifficultyMatrix = {
  CRAFT_AND_STRUCTURE: { EASY: 1, MEDIUM: 3, HARD: 4 },
  INFORMATION_AND_IDEAS: { EASY: 1, MEDIUM: 3, HARD: 3 },
  STANDARD_ENGLISH_CONVENTIONS: { EASY: 1, MEDIUM: 3, HARD: 3 },
  EXPRESSION_OF_IDEAS: { EASY: 0, MEDIUM: 2, HARD: 3 },
}

export function difficultyQuotas(mix: Mix) {
  const matrix = mix === "hard" ? HARD_MATRIX : BALANCED_MATRIX
  const totals = { EASY: 0, MEDIUM: 0, HARD: 0 }
  for (const domain of DOMAINS) {
    for (const difficulty of DIFFICULTIES) {
      totals[difficulty] += matrix[domain][difficulty]
    }
  }
  return totals
}

export function adaptMatrix(
  matrix: DifficultyMatrix,
  rows: Array<{ domain: Domain; totalAttempted: number; accuracyRate: number }>,
) {
  const weak = weakDomainsFromProficiency(rows)
  if (!weak.length) return matrix
  const recipient = weak[0]
  const donor = DOMAINS.filter((domain) => domain !== recipient).sort((a, b) => {
    const accuracy = (domain: Domain) =>
      rows.find((row) => row.domain === domain)?.accuracyRate ?? 1
    return accuracy(b) - accuracy(a)
  })[0]
  const next = structuredClone(matrix)
  const amount = Math.min(2, next[donor].MEDIUM - 1)
  if (amount <= 0) return matrix
  next[donor].MEDIUM -= amount
  next[recipient].MEDIUM += amount
  return next
}

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function selectByMatrix<T extends SelectableQuestion>(
  bank: T[],
  matrix: DifficultyMatrix,
  usedIds: Set<string>,
) {
  const selected: T[] = []
  const used = new Set(usedIds)
  for (const domain of DOMAINS) {
    for (const difficulty of DIFFICULTIES) {
      const need = matrix[domain][difficulty]
      const matches = shuffle(
        bank.filter(
          (question) =>
            !used.has(question.id) &&
            question.domain === domain &&
            question.difficulty === difficulty,
        ),
      )
      if (matches.length < need) {
        const extras = shuffle(
          bank.filter(
            (question) =>
              !used.has(question.id) &&
              question.domain === domain &&
              question.difficulty !== difficulty &&
              !matches.includes(question),
          ),
        )
        matches.push(...extras.slice(0, need - matches.length))
      }
      if (matches.length < need) {
        throw new Error(
          `Question bank cannot fill ${domain} ${difficulty}: need ${need}, have ${matches.length}.`,
        )
      }
      for (const question of matches.slice(0, need)) {
        selected.push(question)
        used.add(question.id)
      }
    }
  }
  return shuffle(selected)
}

export function selectDrillQuestions<T extends SelectableQuestion>(
  bank: T[],
  options: { domain?: Domain | "ALL"; difficulty?: Difficulty | "MIXED"; count: number },
) {
  let pool = bank.filter((question) => true)
  if (options.domain && options.domain !== "ALL") {
    pool = pool.filter((question) => question.domain === options.domain)
  }
  if (options.difficulty && options.difficulty !== "MIXED") {
    const strict = pool.filter((question) => question.difficulty === options.difficulty)
    if (strict.length) pool = strict
  }
  return shuffle(pool).slice(0, Math.max(1, options.count))
}

export function weakDomainsFromProficiency(
  rows: Array<{ domain: Domain; totalAttempted: number; accuracyRate: number }>,
) {
  const attempted = rows.filter((row) => row.totalAttempted >= 4)
  if (!attempted.length) return [] as Domain[]
  const sorted = [...attempted].sort((a, b) => a.accuracyRate - b.accuracyRate)
  const weakest = sorted[0]
  if (weakest.accuracyRate >= 0.75) return [] as Domain[]
  return [weakest.domain]
}
