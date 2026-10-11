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

const page = await browser.newPage()
page.setDefaultTimeout(20000)
await page.setViewport({ width: 1280, height: 900 })

async function waitForTestId(id) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await page.waitForSelector(`[data-testid="${id}"]`, { timeout: 15000 })
      return
    } catch (error) {
      if (attempt === 3) throw error
      await page.goto(base, { waitUntil: "domcontentloaded" }).catch(() => {})
    }
  }
}

try {
  await page.goto(base, { waitUntil: "domcontentloaded" })
  await waitForTestId("rescan")
  await page.evaluate(() => document.querySelector('[data-testid="rescan"]')?.click())
  await page.waitForFunction(() =>
    document.body.innerText.includes("Rescanning sources") ||
    document.querySelector("[data-testid='rescan-result']"),
  )
  await page.waitForSelector("[data-testid='rescan-result']")
  const rescanText = await page.$eval("[data-testid='rescan-result']", (node) => node.textContent)
  console.log("rescan", rescanText)
  if (!/Added \d+ new question/.test(rescanText ?? "")) {
    throw new Error(`Unexpected rescan result: ${rescanText}`)
  }
  await shot(page, "rescan-added")

  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) =>
      node.textContent?.includes("Build a drill"),
    )
    button?.click()
  })
  await page.waitForFunction(() => document.body.innerText.includes("Start drill"))
  const selects = await page.$$("select")
  await selects[2].select("3")
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) =>
      node.textContent?.includes("Start drill"),
    )
    button?.click()
  })
  await page.waitForSelector('[data-testid="choice-A"]')
  await page.click('[data-testid="choice-A"]')
  await page.click('[data-testid="flag"]')
  const clockBefore = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) => /\d:\d\d/.test(node.textContent ?? ""))
    return button?.textContent?.trim() ?? ""
  })
  await page.click('[data-testid="pause"]')
  await page.waitForSelector('[data-testid="paused-banner"]')
  await new Promise((resolve) => setTimeout(resolve, 1500))
  const clockAfter = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) => /\d:\d\d/.test(node.textContent ?? ""))
    return button?.textContent?.trim() ?? ""
  })
  console.log("clock", clockBefore, clockAfter)
  if (!clockBefore || clockBefore !== clockAfter) {
    throw new Error(`Timer moved while paused: ${clockBefore} -> ${clockAfter}`)
  }
  await shot(page, "exam-paused")

  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForSelector('[data-testid="paused-banner"]')
  await page.waitForSelector('[data-testid="choice-A"]')
  const stillSelected = await page.$eval('[data-testid="choice-A"]', (node) =>
    node.className.includes("bg-primary"),
  )
  if (!stillSelected) throw new Error("Answer A was not restored after refresh")
  await page.click('[data-testid="close-session"]')
  await page.waitForSelector('[data-testid="confirm-close"]')
  await page.click('[data-testid="confirm-close"]')
  await page.waitForSelector('[data-testid="continue-session"]')
  await page.waitForFunction(() => document.body.innerText.includes("Paused"))
  await shot(page, "studio-paused-session")

  await page.click('[data-testid="continue-session"]')
  await page.waitForSelector('[data-testid="paused-banner"]')
  await page.waitForSelector('[data-testid="resume"]')
  const restoredClock = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) => /\d:\d\d/.test(node.textContent ?? ""))
    return button?.textContent?.trim() ?? ""
  })
  if (restoredClock !== clockAfter) {
    throw new Error(`Frozen time changed after return: ${clockAfter} -> ${restoredClock}`)
  }
  await shot(page, "exam-resumed-paused")

  const sessionId = new URL(page.url()).pathname.split("/").pop()
  await page.evaluate(async (id) => {
    const response = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeRemainingSec: 0, isPaused: true, resumeIndex: 0 }),
    })
    if (!response.ok) throw new Error("Could not store a finished clock")
  }, sessionId)
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForFunction(() => document.body.innerText.includes("Paused at 0:00"))
  await shot(page, "exam-time-up-paused")
  await page.click('[data-testid="resume"]')
  await page.waitForSelector('[data-testid="time-up"]')
  await page.click('[data-testid="choice-A"]')
  const next = await page.$("button::-p-text(Next)")
  if (next) {
    await next.click()
    await page.waitForSelector('[data-testid="choice-B"]')
    await page.click('[data-testid="choice-B"]')
  }
  const nextAgain = await page.$("button::-p-text(Next)")
  if (nextAgain) {
    await nextAgain.click()
    await page.waitForSelector('[data-testid="choice-A"]')
    await page.click('[data-testid="choice-A"]')
  }
  await page.click('[data-testid="review"]')
  await page.waitForSelector('[data-testid="submit-module"]')
  await page.click('[data-testid="submit-module"]')
  await page.waitForFunction(() => location.pathname.includes("/results/"))
  await page.waitForFunction(() => document.body.innerText.includes("Question review"))
  await shot(page, "results-after-long-timer")
  console.log(JSON.stringify({ ok: true, rescanText, shots }, null, 2))
} catch (error) {
  console.error(error)
  await shot(page, "feature-check-error").catch(() => {})
  process.exitCode = 1
} finally {
  await Promise.race([
    browser.close(),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ])
}
