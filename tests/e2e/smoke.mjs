import { launch, login, overflow, pageText, BASE } from "./lib.mjs";
let issues = 0;
const pages = ["/dashboard", "/tasks", "/tasks/new", "/calendar", "/forecast", "/billing", "/notifications", "/chat", "/log", "/settings/garden", "/settings/members", "/templates", "/help", "/install"];
const browser = await launch();
for (const role of ["owner", "admin", "member"]) {
  for (const viewport of [{ width: 375, height: 800 }, { width: 1280, height: 900 }]) {
    const { context, page, problems } = await login(browser, role, viewport);
    const taskHref = await page.locator('a[href^="/tasks/"]').filter({ hasNotText: "Neue" }).first().getAttribute("href").catch(() => null);
    const list = [...pages, ...(taskHref && !taskHref.endsWith("/new") ? [taskHref] : [])];
    for (const path of list) {
      problems.length = 0;
      const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
      const text = await pageText(page);
      const bad = /Application error|Something went wrong|Unhandled Runtime Error/.test(text);
      const ov = viewport.width < 500 ? await overflow(page) : { offenders: [] };
      const flags = [];
      if (res.status() >= 400) flags.push(`HTTP ${res.status()}`);
      if (bad) flags.push("ERROR PAGE");
      if (ov.offenders?.length) flags.push(`OVERFLOW ${ov.scrollWidth}>${ov.vw}: ${ov.offenders.join(" | ")}`);
      if (problems.length) flags.push(problems.join(" ; "));
      if (flags.length) issues += 1;
      if (flags.length) console.log(`[${role} ${viewport.width}] ${path}: ${flags.join(" || ")}`);
    }
    await context.close();
  }
}
await browser.close();
console.log(issues ? `smoke: ${issues} page(s) with problems` : "smoke: all pages ok");
process.exitCode = issues ? 1 : 0;
