export const DOMAINS = [
  "CRAFT_AND_STRUCTURE",
  "INFORMATION_AND_IDEAS",
  "STANDARD_ENGLISH_CONVENTIONS",
  "EXPRESSION_OF_IDEAS",
] as const

export const SUBSKILLS = [
  "WORDS_IN_CONTEXT",
  "TEXT_STRUCTURE_AND_PURPOSE",
  "CROSS_TEXT_CONNECTIONS",
  "CENTRAL_IDEAS_AND_DETAILS",
  "COMMAND_OF_EVIDENCE_TEXTUAL",
  "COMMAND_OF_EVIDENCE_QUANTITATIVE",
  "INFERENCES",
  "BOUNDARIES_AND_PUNCTUATION",
  "FORM_STRUCTURE_AND_SENSE",
  "RHETORICAL_SYNTHESIS",
  "TRANSITIONS",
] as const

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const

export type Domain = (typeof DOMAINS)[number]
export type SubSkill = (typeof SUBSKILLS)[number]
export type Difficulty = (typeof DIFFICULTIES)[number]
export type ChoiceId = "A" | "B" | "C" | "D"

export const DOMAIN_LABELS: Record<Domain, string> = {
  CRAFT_AND_STRUCTURE: "Craft and Structure",
  INFORMATION_AND_IDEAS: "Information and Ideas",
  STANDARD_ENGLISH_CONVENTIONS: "Standard English Conventions",
  EXPRESSION_OF_IDEAS: "Expression of Ideas",
}

export const SUBSKILL_LABELS: Record<SubSkill, string> = {
  WORDS_IN_CONTEXT: "Words in Context",
  TEXT_STRUCTURE_AND_PURPOSE: "Text Structure and Purpose",
  CROSS_TEXT_CONNECTIONS: "Cross-Text Connections",
  CENTRAL_IDEAS_AND_DETAILS: "Central Ideas and Details",
  COMMAND_OF_EVIDENCE_TEXTUAL: "Command of Evidence (Textual)",
  COMMAND_OF_EVIDENCE_QUANTITATIVE: "Command of Evidence (Quantitative)",
  INFERENCES: "Inferences",
  BOUNDARIES_AND_PUNCTUATION: "Boundaries and Punctuation",
  FORM_STRUCTURE_AND_SENSE: "Form, Structure, and Sense",
  RHETORICAL_SYNTHESIS: "Rhetorical Synthesis",
  TRANSITIONS: "Transitions",
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
}

export const SUBSKILL_DOMAIN: Record<SubSkill, Domain> = {
  WORDS_IN_CONTEXT: "CRAFT_AND_STRUCTURE",
  TEXT_STRUCTURE_AND_PURPOSE: "CRAFT_AND_STRUCTURE",
  CROSS_TEXT_CONNECTIONS: "CRAFT_AND_STRUCTURE",
  CENTRAL_IDEAS_AND_DETAILS: "INFORMATION_AND_IDEAS",
  COMMAND_OF_EVIDENCE_TEXTUAL: "INFORMATION_AND_IDEAS",
  COMMAND_OF_EVIDENCE_QUANTITATIVE: "INFORMATION_AND_IDEAS",
  INFERENCES: "INFORMATION_AND_IDEAS",
  BOUNDARIES_AND_PUNCTUATION: "STANDARD_ENGLISH_CONVENTIONS",
  FORM_STRUCTURE_AND_SENSE: "STANDARD_ENGLISH_CONVENTIONS",
  RHETORICAL_SYNTHESIS: "EXPRESSION_OF_IDEAS",
  TRANSITIONS: "EXPRESSION_OF_IDEAS",
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
