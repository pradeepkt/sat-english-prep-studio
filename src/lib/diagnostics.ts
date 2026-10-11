import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { openai } from "@ai-sdk/openai"
import type { Choice } from "@/lib/exam-types"
import { SUBSKILL_LABELS, type SubSkill } from "@/lib/labels"

type DiagnoseInput = {
  passage: string
  prompt: string
  options: Choice[]
  correctOption: string
  selectedOption: string | null
  subSkill: SubSkill
  staticRationale: string
  timeSpentSeconds: number
  isCorrect: boolean
}

const EXTREME = /\b(always|never|only|every|all|none|completely|entirely|prove|impossible|everyone)\b/i

const DEFAULT_TRAP: Record<SubSkill, string> = {
  WORDS_IN_CONTEXT: "Near-Synonym Trap",
  TEXT_STRUCTURE_AND_PURPOSE: "Purpose vs Summary Swap",
  CROSS_TEXT_CONNECTIONS: "Relationship Reversal",
  CENTRAL_IDEAS_AND_DETAILS: "Detail as Main Idea",
  COMMAND_OF_EVIDENCE_TEXTUAL: "Off-Topic Evidence",
  COMMAND_OF_EVIDENCE_QUANTITATIVE: "Trend Misread",
  INFERENCES: "Too Far Inference",
  BOUNDARIES_AND_PUNCTUATION: "Boundary Mix-up",
  FORM_STRUCTURE_AND_SENSE: "Agreement Slip",
  RHETORICAL_SYNTHESIS: "Goal Mismatch",
  TRANSITIONS: "Transition Mismatch",
}

function choiceText(options: Choice[], id: string | null) {
  return options.find((option) => option.id === id)?.text ?? "(no choice)"
}

export function heuristicDiagnosis(input: DiagnoseInput) {
  const skill = SUBSKILL_LABELS[input.subSkill]
  if (!input.selectedOption) {
    return {
      cognitiveMistakeType: "Left Blank",
      dynamicAiAnalysis: `This item was left blank after about ${input.timeSpentSeconds} seconds. On ${skill} questions, a blank is a missed point with no extra penalty, but it usually means the clock won. Next time, mark a flag, pick the best remaining choice, and move. ${input.staticRationale}`,
    }
  }

  const selected = choiceText(input.options, input.selectedOption)
  const correct = choiceText(input.options, input.correctOption)

  if (input.isCorrect) {
    return {
      cognitiveMistakeType: "None",
      dynamicAiAnalysis: `You chose ${input.selectedOption}, the credited answer, in about ${input.timeSpentSeconds} seconds. ${input.staticRationale}`,
    }
  }

  let cognitiveMistakeType = DEFAULT_TRAP[input.subSkill]
  if (EXTREME.test(selected) && !EXTREME.test(correct)) {
    cognitiveMistakeType = "Extreme Word Trap"
  }
  if (
    input.subSkill === "TRANSITIONS" &&
    /\b(however|nevertheless|but|although|despite)\b/i.test(selected) &&
    /\b(therefore|thus|because|so)\b/i.test(correct)
  ) {
    cognitiveMistakeType = "Reversed Causality"
  }
  if (
    input.subSkill === "COMMAND_OF_EVIDENCE_QUANTITATIVE" &&
    /\b(every|each|all|no|never)\b/i.test(selected)
  ) {
    cognitiveMistakeType = "Trend Misread"
  }
  if (input.subSkill === "FORM_STRUCTURE_AND_SENSE" && input.timeSpentSeconds < 20) {
    cognitiveMistakeType = "Rushed Agreement"
  }
  if (input.subSkill === "INFERENCES" && selected.length > correct.length + 40) {
    cognitiveMistakeType = "Scope Mismatch"
  }

  const pace =
    input.timeSpentSeconds < 25
      ? "The choice landed quickly, which often means a familiar trap was not checked against the passage."
      : input.timeSpentSeconds > 90
        ? "The long pause suggests the two close choices were hard to separate. The text, not the more impressive wording, decides it."
        : "The time spent is in a normal range for this item, so the miss is about the relationship in the text rather than the clock."

  return {
    cognitiveMistakeType,
    dynamicAiAnalysis: `You chose ${input.selectedOption} (“${selected}”). The credited answer is ${input.correctOption} (“${correct}”). This is a ${skill} item, and the pattern fits ${cognitiveMistakeType}. ${pace} ${input.staticRationale}`,
  }
}

function model() {
  if (process.env.OPENAI_API_KEY) {
    return openai(process.env.OPENAI_MODEL || "gpt-4o-mini")
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(process.env.GOOGLE_MODEL || "gemini-2.0-flash")
  }
  return null
}

export async function diagnoseMistake(input: DiagnoseInput) {
  const fallback = heuristicDiagnosis(input)
  const selected = model()
  if (!selected) return { ...fallback, source: "heuristic" as const }

  try {
    const { text } = await generateText({
      model: selected,
      system:
        "You diagnose Digital SAT Reading and Writing misses for a Bentonville high school student. Be specific, calm, and concrete. Do not invent passage facts. Reply with JSON only: {\"cognitiveMistakeType\": string, \"dynamicAiAnalysis\": string}. The analysis should be 2 short paragraphs naming the student's choice, the credited choice, and the next habit.",
      prompt: JSON.stringify({
        subSkill: input.subSkill,
        passage: input.passage,
        prompt: input.prompt,
        options: input.options,
        selectedOption: input.selectedOption,
        correctOption: input.correctOption,
        officialRationale: input.staticRationale,
        timeSpentSeconds: input.timeSpentSeconds,
        isCorrect: input.isCorrect,
      }),
    })
    const jsonStart = text.indexOf("{")
    const jsonEnd = text.lastIndexOf("}")
    if (jsonStart === -1 || jsonEnd === -1) return { ...fallback, source: "heuristic" as const }
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      cognitiveMistakeType?: string
      dynamicAiAnalysis?: string
    }
    if (!parsed.dynamicAiAnalysis || !parsed.cognitiveMistakeType) {
      return { ...fallback, source: "heuristic" as const }
    }
    return {
      cognitiveMistakeType: parsed.cognitiveMistakeType.slice(0, 80),
      dynamicAiAnalysis: parsed.dynamicAiAnalysis,
      source: "ai" as const,
    }
  } catch {
    return { ...fallback, source: "heuristic" as const }
  }
}
