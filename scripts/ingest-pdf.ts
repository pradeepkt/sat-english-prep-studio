import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import "./load-env"
import type { Difficulty, Domain, SubSkill } from "../src/lib/labels"
import type { IncomingQuestion } from "../src/lib/upsert-questions"
import { upsertQuestions } from "../src/lib/upsert-questions"

const require = createRequire(import.meta.url)
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (data: Buffer) => Promise<{ text: string }>

const file = process.argv[2]
if (!file) {
  console.error("Usage: npm run ingest:pdf -- questions.pdf")
  process.exit(1)
}

export function questionsFromPdfText(text: string): IncomingQuestion[] {
  const blocks = text.split(/---QUESTION---/).slice(1)
  return blocks.map((block) => {
    const body = block.split("---END---")[0] ?? block
    const field = (name: string) => {
      const match = body.match(new RegExp(`${name}:\\s*([\\s\\S]*?)(?=\\n[A-Z][A-Z ]+:|\\n[A-D]\\)|$)`))
      return match?.[1]?.trim() ?? ""
    }
    const option = (letter: string) => {
      const match = body.match(new RegExp(`\\n${letter}\\)\\s*([\\s\\S]*?)(?=\\n[A-D]\\)|\\nRATIONALE:|$)`))
      return match?.[1]?.trim() ?? ""
    }
    return {
      sourceName: field("SOURCE") || "User PDF import",
      sourceUrl: field("URL") || null,
      domain: field("DOMAIN") as Domain,
      subSkill: field("SUBSKILL") as SubSkill,
      difficulty: field("DIFFICULTY") as Difficulty,
      passage: field("PASSAGE"),
      prompt: field("PROMPT"),
      options: (["A", "B", "C", "D"] as const).map((id) => ({ id, text: option(id) })),
      correctOption: field("CORRECT"),
      staticRationale: field("RATIONALE"),
    }
  })
}

async function main() {
  const parsed = await pdfParse(readFileSync(file))
  const questions = questionsFromPdfText(parsed.text)
  if (!questions.length) throw new Error("No ---QUESTION--- blocks found in the PDF text.")
  const result = await upsertQuestions(questions)
  console.log(`Ingested PDF. Created ${result.created}, updated ${result.updated}.`)
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
