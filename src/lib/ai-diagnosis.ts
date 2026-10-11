import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { openai } from "@ai-sdk/openai"
import type { SubSkill } from "@/lib/labels"
import { SUBSKILL_LABELS } from "@/lib/labels"

const MISTAKE_BY_SKILL: Record<SubSkill, string> = {
  WORDS_IN_CONTEXT: "Connotation Mismatch",
  TEXT_STRUCTURE_AND_PURPOSE: "Function vs Topic Swap",
  CROSS_TEXT_CONNECTIONS: "Relationship Reversal",
  CENTRAL_IDEAS_AND_DETAILS: "Detail vs Main Idea",
  COMMAND_OF_EVIDENCE_TEXTUAL: "Unsupported Claim",
  COMMAND_OF_EVIDENCE_QUANTITATIVE: "Chart Misread",
  INFERENCES: "Too-Far Inference",
  BOUNDARIES_AND_PUNCTUATION: "Boundary Error",
  FORM_STRUCTURE_AND_SENSE: "Agreement or Form Error",
  RHETORICAL_SYNTHESIS: "Off-Goal Synthesis",
  TRANSITIONS: "Logical Relation Miss",
}

export type DiagnosisInput = {
  subSkill: SubSkill
  prompt: string
  passage: string
  options: Array<{ id: string; text: string }>
  correctOption: string
  selectedOption: string | null
  staticRationale: string
  timeSpentSeconds: number
  isCorrect: boolean
}

export type Diagnosis = {
  analysis: string
  mistakeType: string | null
  source: "openai" | "google" | "heuristic"
}

function timingNote(seconds: number) {
  if (seconds > 0 && seconds < 20) {
    return " The clock shows a very fast decision, so it is worth rereading the sentence the choice turns on."
  }
  if (seconds > 120) {
    return " The time on this item was long, so mark the line that actually decides it and move once that line is clear."
  }
  return ""
}

export function heuristicDiagnosis(input: DiagnosisInput): Diagnosis {
  const choice = input.options.find((option) => option.id === input.selectedOption)
  const correct = input.options.find((option) => option.id === input.correctOption)
  if (input.isCorrect) {
    return {
      mistakeType: null,
      source: "heuristic",
      analysis: `This choice matches the passage. ${input.staticRationale}${timingNote(input.timeSpentSeconds)}`,
    }
  }
  if (!input.selectedOption) {
    return {
      mistakeType: "Left Blank",
      source: "heuristic",
      analysis: `No choice was entered, so the item was marked incorrect. The keyed choice is ${input.correctOption}. ${input.staticRationale}`,
    }
  }
  const mistakeType = MISTAKE_BY_SKILL[input.subSkill]
  return {
    mistakeType,
    source: "heuristic",
    analysis: `The selected choice (${input.selectedOption}: ${choice?.text ?? "unknown"}) does not answer the ${SUBSKILL_LABELS[input.subSkill].toLowerCase()} task. The keyed choice is ${input.correctOption}: ${correct?.text ?? ""}. ${input.staticRationale} A useful label for this miss is “${mistakeType}.”${timingNote(input.timeSpentSeconds)}`,
  }
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as { analysis?: string; mistakeType?: string | null }
    if (!parsed.analysis) return null
    return {
      analysis: parsed.analysis,
      mistakeType: parsed.mistakeType ?? null,
    }
  } catch {
    return null
  }
}

export async function diagnose(input: DiagnosisInput): Promise<Diagnosis> {
  const fallback = heuristicDiagnosis(input)
  const prompt = `You are a Digital SAT Reading and Writing tutor. Explain this one item for a high school student in Bentonville, Arkansas. Be specific to the choice they made. Do not be vague or congratulatory filler.

Skill: ${SUBSKILL_LABELS[input.subSkill]}
Time spent seconds: ${input.timeSpentSeconds}
Passage:
${input.passage}

Question:
${input.prompt}

Choices:
${input.options.map((option) => `${option.id}. ${option.text}`).join("\n")}

Student choice: ${input.selectedOption ?? "(blank)"}
Keyed choice: ${input.correctOption}
Official rationale: ${input.staticRationale}

Return JSON only: {"analysis":"string under 140 words","mistakeType":null or a short label such as "${fallback.mistakeType ?? "None"}"}`

  try {
    if (process.env.OPENAI_API_KEY) {
      const result = await generateText({ model: openai("gpt-4o-mini"), prompt })
      const parsed = extractJson(result.text)
      if (parsed) return { ...parsed, source: "openai" }
    } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const result = await generateText({ model: google("gemini-2.0-flash"), prompt })
      const parsed = extractJson(result.text)
      if (parsed) return { ...parsed, source: "google" }
    }
  } catch {
    return fallback
  }
  return fallback
}
