import puppeteer from "puppeteer-core"
import "./load-env"
import { upsertQuestions, type IncomingQuestion } from "../src/lib/upsert-questions"

const url = process.argv[2]
if (!url) {
  console.error("Usage: npm run ingest:url -- https://example.com/my-questions.html")
  process.exit(1)
}

const blocked = ["collegeboard.org", "cracksat.net", "cracksat.com"]
const host = new URL(url).hostname.toLowerCase()
if (blocked.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
  console.error("This importer does not fetch College Board or CrackSAT pages.")
  process.exit(1)
}

function chromePath() {
  return (
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/usr/bin/google-chrome"
  )
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 })
    const questions = await page.$$eval("article.question", (nodes) =>
      nodes.map((node) => {
        const text = (selector: string) =>
          node.querySelector(selector)?.textContent?.trim() ?? ""
        const options = Array.from(node.querySelectorAll("li")).map((item) => ({
          id: item.getAttribute("data-id") ?? "",
          text: item.textContent?.trim() ?? "",
        }))
        return {
          sourceName: text(".source") || "User URL import",
          sourceUrl: node.getAttribute("data-source-url"),
          domain: node.getAttribute("data-domain") ?? "",
          subSkill: node.getAttribute("data-subskill") ?? "",
          difficulty: node.getAttribute("data-difficulty") ?? "",
          passage: text(".passage"),
          prompt: text(".prompt"),
          options,
          correctOption: node.getAttribute("data-correct") ?? "",
          staticRationale: text(".rationale"),
        }
      }),
    )
    if (!questions.length) throw new Error("The page has no article.question blocks.")
    const result = await upsertQuestions(questions as IncomingQuestion[])
    console.log(`Ingested URL. Created ${result.created}, updated ${result.updated}.`)
  } finally {
    await browser.close()
  }
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
