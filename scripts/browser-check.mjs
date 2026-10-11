import puppeteer from "puppeteer-core"

const base = process.env.BASE_URL ?? "http://127.0.0.1:3847"
const outDir =
  process.env.SHOT_DIR ??
  "/cursor/stores/bc-4a9d35fe-7a1e-4561-817a-40d583aadaa6/media"

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
})

const shots = []

async function shot(page, name) {
  const path = `${outDir}/${name}.png`
  await page.screenshot({ path, fullPage: true })
  shots.push(path)
  console.log("shot", path)
}

try {
  const page = await browser.newPage()
  page.setDefaultTimeout(45000)
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto(base, { waitUntil: "networkidle2" })
  await page.waitForFunction(() => document.body.innerText.includes("Build a drill"))
  await shot(page, "studio-home-desktop")

  await page.locator("button::-p-text(Build a drill)").click()
  await page.waitForFunction(() => document.body.innerText.includes("Targeted drill"))
  await page.select("select", "STANDARD_ENGLISH_CONVENTIONS")
  const selects = await page.$$("select")
  await selects[1].select("EASY")
  await selects[2].select("3")
  await shot(page, "drill-dialog-desktop")
  await page.locator("button::-p-text(Start drill)").click()
  await page.waitForSelector('[data-testid="choice-A"]')
  await shot(page, "exam-desktop")

  await page.click('[data-testid="strike-mode"]')
  await page.click('[data-testid="choice-C"]')
  await page.click('[data-testid="strike-mode"]')
  await page.click('[data-testid="choice-A"]')
  await page.click('[data-testid="flag"]')
  await page.click('[data-testid="highlighter"]')
  const passage = await page.$(".font-serif")
  if (passage) {
    const box = await passage.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 24, box.y + 40)
      await page.mouse.down()
      await page.mouse.move(box.x + 220, box.y + 40)
      await page.mouse.up()
    }
  }
  await shot(page, "exam-answered-desktop")

  for (let i = 0; i < 2; i++) {
    const next = await page.$("button::-p-text(Next)")
    if (!next) break
    await next.click()
    await page.waitForSelector('[data-testid="choice-A"]')
    await page.click('[data-testid="choice-B"]')
  }
  await page.click('[data-testid="review"]')
  await page.waitForFunction(() => document.body.innerText.includes("Check your work"))
  await shot(page, "exam-review-desktop")
  await page.click('[data-testid="submit-module"]')
  await page.waitForFunction(
    () => location.pathname.includes("/results/") || document.body.innerText.includes("Question review"),
    { timeout: 30000 },
  )
  await page.waitForFunction(() => document.body.innerText.includes("Question review"))
  await shot(page, "results-desktop")
  const explain = await page.$('[data-testid="explain"], button::-p-text(Why this is right)')
  if (explain) {
    await explain.click()
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Writing the note") === false &&
        (document.body.innerText.includes("You chose") ||
          document.body.innerText.includes("mistake") ||
          document.body.innerText.length > 400),
      { timeout: 20000 },
    )
    await shot(page, "results-explained-desktop")
  }

  await page.setViewport({ width: 390, height: 844 })
  await page.goto(base, { waitUntil: "networkidle2" })
  await page.waitForFunction(() => document.body.innerText.includes("Build a drill"))
  await shot(page, "studio-home-mobile")

  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) =>
      node.textContent?.includes("Build a drill"),
    )
    button?.click()
  })
  await page.waitForFunction(() => document.body.innerText.includes("Start drill"))
  const mobileSelects = await page.$$("select")
  await mobileSelects[2].select("3")
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) =>
      node.textContent?.includes("Start drill"),
    )
    button?.click()
  })
  await page.waitForFunction(() => document.body.innerText.includes("Passage"))
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll("[data-slot='tabs-trigger']")].find((node) =>
      node.textContent?.includes("Question"),
    )
    if (tab instanceof HTMLElement) tab.click()
  })
  await page.waitForFunction(() =>
    [...document.querySelectorAll("[data-testid='choice-A']")].some(
      (node) => node.getBoundingClientRect().height > 0,
    ),
  )
  await page.evaluate(() => {
    const visible = (selector) =>
      [...document.querySelectorAll(selector)].find(
        (node) => node.getBoundingClientRect().height > 0,
      )
    const choice = visible("[data-testid='choice-A']")
    if (choice instanceof HTMLElement) choice.click()
    const flag = visible("[data-testid='flag']")
    if (flag instanceof HTMLElement) flag.click()
  })
  await shot(page, "exam-mobile")

  console.log(JSON.stringify({ ok: true, shots }, null, 2))
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
}
