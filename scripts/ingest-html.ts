import { readFileSync } from "node:fs"
import * as cheerio from "cheerio"
import "./load-env"
import type { Difficulty, Domain, SubSkill } from "../src/lib/labels"
import type { IncomingQuestion } from "../src/lib/upsert-questions"
import { upsertQuestions } from "../src/lib/upsert-questions"

const file = process.argv[2]
if (!file) {
  console.error("Usage: npm run ingest:html -- questions.html")
  process.exit(1)
}

function questionsFromHtml(html: string): IncomingQuestion[] {
  const $ = cheerio.load(html)
  const questions: IncomingQuestion[] = []
  $("article.question").each((_, element) => {
    const node = $(element)
    const options = node
      .find("li")
      .toArray()
      .map((item) => ({
        id: $(item).attr("data-id") ?? "",
        text: $(item).text().trim(),
      }))
    questions.push({
      sourceName: node.find(".source").text().trim() || "User HTML import",
      sourceUrl: node.attr("data-source-url") || null,
      domain: (node.attr("data-domain") ?? "") as Domain,
      subSkill: (node.attr("data-subskill") ?? "") as SubSkill,
      difficulty: (node.attr("data-difficulty") ?? "") as Difficulty,
      passage: node.find(".passage").text().trim(),
      prompt: node.find(".prompt").text().trim(),
      options,
      correctOption: node.attr("data-correct") ?? "",
      staticRationale: node.find(".rationale").text().trim(),
    })
  })
  return questions
}

const questions = questionsFromHtml(readFileSync(file, "utf8"))
if (!questions.length) {
  console.error("No article.question blocks found.")
  process.exit(1)
}

upsertQuestions(questions)
  .then((result) => {
    console.log(`Ingested HTML. Created ${result.created}, updated ${result.updated}.`)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma")
    await prisma.$disconnect()
  })
