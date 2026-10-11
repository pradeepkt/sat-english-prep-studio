import puppeteer from "puppeteer-core";

const base = "http://127.0.0.1:3847";
const media = "/cursor/stores/bc-4a9d35fe-7a1e-4561-817a-40d583aadaa6/media";
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
page.setDefaultTimeout(20000);
const logs = [];
page.on("pageerror", (err) => logs.push("PAGEERROR " + err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") logs.push("CONSOLE " + msg.text());
});

async function clickText(text) {
  const ok = await page.evaluate((label) => {
    const el = [...document.querySelectorAll("button, a")].find((node) =>
      node.textContent?.replace(/\s+/g, " ").includes(label),
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok) throw new Error("Could not click " + text);
}

await page.setViewport({ width: 1440, height: 900 });
await page.goto(base, { waitUntil: "networkidle0" });
await page.waitForFunction(() => document.body.innerText.includes("No sessions yet"));
await page.screenshot({ path: `${media}/studio-home-empty.png`, fullPage: true });

await page.setViewport({ width: 390, height: 844 });
await page.screenshot({ path: `${media}/studio-home-empty-mobile.png`, fullPage: true });

await page.setViewport({ width: 1440, height: 900 });
await clickText("Build a drill");
await page.waitForFunction(() => document.body.innerText.includes("Targeted drill"));
await page.evaluate(() => {
  const selects = [...document.querySelectorAll("select")];
  const count = selects[2];
  count.value = "3";
  count.dispatchEvent(new Event("change", { bubbles: true }));
});
await clickText("Start drill");
await page.waitForSelector("[data-testid='choice-A']");
await page.click("[data-testid='choice-A']");
await page.click("[data-testid='strike-mode']");
await new Promise((r) => setTimeout(r, 200));
await page.click("[data-testid='choice-B']");
await page.click("[data-testid='flag']");
const struck = await page.$eval("[data-testid='choice-B']", (el) => el.className.includes("line-through"));
if (!struck) throw new Error("Choice B was not struck through");
await page.waitForFunction(() => document.body.innerText.includes("Flagged"));
const leak = await page.evaluate(async () => {
  const id = location.pathname.split("/").pop();
  const response = await fetch(`/api/sessions/${id}`);
  const body = await response.json();
  return JSON.stringify(body).includes("correctOption");
});
await page.screenshot({ path: `${media}/exam-room.png`, fullPage: true });

await page.setViewport({ width: 390, height: 844 });
await page.screenshot({ path: `${media}/exam-room-mobile.png`, fullPage: true });
await page.evaluate(() => {
  const tab = [...document.querySelectorAll("button")].find((node) => node.textContent?.trim() === "Question");
  tab?.click();
});
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${media}/exam-room-mobile-question.png`, fullPage: true });

await page.setViewport({ width: 1440, height: 900 });
await page.click("[data-testid='review']");
await page.waitForFunction(() => document.body.innerText.includes("Check your work"));
await page.screenshot({ path: `${media}/exam-review.png`, fullPage: true });
await page.click("[data-testid='submit-module']");
await page.waitForFunction(() => document.body.innerText.includes("Raw score"), { timeout: 20000 });
await page.screenshot({ path: `${media}/results.png`, fullPage: true });
const explain = await page.$("[data-testid='explain']");
if (explain) {
  await explain.click();
  await page.waitForFunction(() => document.body.innerText.includes("Near-Synonym") || document.body.innerText.includes("Trap") || document.body.innerText.includes("None") || document.body.innerText.includes("You chose") || document.body.innerText.includes("credited"), { timeout: 20000 });
}
await page.screenshot({ path: `${media}/results-explained.png`, fullPage: true });

await page.goto(base, { waitUntil: "networkidle0" });
await page.waitForFunction(() => document.body.innerText.includes("Scored") || document.body.innerText.includes("Drill"));
await page.screenshot({ path: `${media}/studio-home-history.png`, fullPage: true });

console.log(JSON.stringify({ leakDuringExam: leak, logs }, null, 2));
await browser.close();
