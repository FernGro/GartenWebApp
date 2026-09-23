import { chromium } from "playwright-core";
import { BASE_URL, CHROME, PW, users } from "./env.mjs";
export const BASE = BASE_URL;
export async function launch() {
  return chromium.launch({ executablePath: CHROME, headless: true });
}
export async function login(browser, key, viewport = { width: 375, height: 800 }) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 200)}`); });
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url().replace(BASE, "")}`); });
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.fill("#email", users[key].email);
  await page.fill("#password", PW);
  await Promise.all([page.waitForURL(/dashboard/, { timeout: 15000 }), page.locator("form button[type=submit]").click()]);
  return { context, page, problems };
}
export async function overflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    if (document.documentElement.scrollWidth > vw + 1) {
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 0) {
          let hidden = false;
          for (let p = el.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (["hidden", "auto", "scroll", "clip"].includes(s.overflowX)) { hidden = true; break; }
          }
          if (!hidden) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} right=${Math.round(r.right)}`);
        }
      }
    }
    return { scrollWidth: document.documentElement.scrollWidth, vw, offenders: out.slice(0, 6) };
  });
}
export async function pageText(page) {
  return page.evaluate(() => document.body.innerText);
}
