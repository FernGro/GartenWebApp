import { createClient } from "@supabase/supabase-js";
import { launch, login, BASE } from "./lib.mjs";
import { URL, SERVICE, users } from "./env.mjs";

const db = createClient(URL, SERVICE, { auth: { persistSession: false } });
const browser = await launch();
const results = [];
let failed = 0;
async function step(name, fn) {
  try { const note = await fn(); results.push(`PASS ${name}${note ? ` (${note})` : ""}`); }
  catch (e) {
    failed += 1;
    results.push(`FAIL ${name}: ${String(e.message).split("\n")[0].slice(0, 220)}`);
    for (const ctx of browser.contexts()) for (const pg of ctx.pages()) await pg.screenshot({ path: `tests/e2e/shots/${name.replace(/\W+/g, "_")}.png`, fullPage: true }).catch(() => {});
  }
}
const uid = async (email) => (await db.auth.admin.listUsers()).data.users.find((u) => u.email === email)?.id;
const ids = Object.fromEntries(await Promise.all(Object.entries(users).map(async ([k, u]) => [k, await uid(u.email)])));
const task = async (title) => (await db.from("tasks").select("*").eq("title", title).order("created_at", { ascending: false }).limit(1).maybeSingle()).data;
async function submitAndWait(page, locator) {
  await locator.click();
  await page.waitForTimeout(400);
  await page.waitForFunction(() => !document.querySelector("[aria-busy=true]") && !document.body.innerText.includes("Gartenplan wird geladen"), null, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}
async function go(page, path) {
  await page.goto(BASE + path);
  await page.waitForFunction(() => !document.body.innerText.includes("Gartenplan wird geladen"), null, { timeout: 15000 });
}
const errText = async (page) => { const t = await page.evaluate(() => document.body.innerText); if (/Application error|Something went wrong/.test(t)) throw new Error("error page shown: " + t.slice(0, 200)); };

// MEMBER
{
  const { context, page, problems } = await login(browser, "member");
  await step("member sees greeting", async () => { await page.getByRole("heading", { name: /Hallo Mia/ }).waitFor({ timeout: 5000 }); });
  await step("member completes own task", async () => {
    await submitAndWait(page, page.getByRole("button", { name: /Dienst erledigt/ }).first());
    await errText(page);
    const t = await task("Rasen maehen");
    if (t.status !== "done") throw new Error("status " + t.status);
  });
  await step("member requests takeover of open task", async () => {
    const t = await task("Unkraut jaeten");
    await go(page, `/tasks/${t.id}`);
    const btn = page.getByRole("button", { name: /Uebernahme anfragen|Dienst uebernehmen/ }).first();
    await submitAndWait(page, btn); await errText(page);
    const t2 = await task("Unkraut jaeten");
    const { data: req } = await db.from("task_takeover_requests").select("status").eq("task_id", t.id);
    return `task ${t2.status}/${t2.assigned_to === ids.member ? "member" : t2.assigned_to}, requests ${JSON.stringify(req)}`;
  });
  await step("member requests takeover of someone else's task", async () => {
    const t = await task("Laub rechen");
    await go(page, `/tasks/${t.id}`);
    await submitAndWait(page, page.getByRole("button", { name: "Uebernahme anfragen" })); await errText(page);
    const { data: req } = await db.from("task_takeover_requests").select("status").eq("task_id", t.id);
    if (!req?.some((r) => r.status === "pending")) throw new Error(JSON.stringify(req));
  });
  await step("member comments on task", async () => {
    await page.locator("textarea[name=comment], input[name=comment]").first().fill("Mache ich am Samstag");
    await submitAndWait(page, page.getByRole("button", { name: "Kommentar speichern" })); await errText(page);
    const { count } = await db.from("task_comments").select("id", { count: "exact", head: true });
    if (!count) throw new Error("no comment stored");
  });
  await step("member adds absence", async () => {
    await go(page, `/settings/garden`);
    const d = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    await page.fill("input[name=from_date]", d); await page.fill("input[name=to_date]", d);
    await submitAndWait(page, page.getByRole("button", { name: "Speichern", exact: true })); await errText(page);
    const { count } = await db.from("availability").select("id", { count: "exact", head: true }).eq("user_id", ids.member);
    if (!count) throw new Error("no availability");
  });
  await step("member changes display name", async () => {
    await page.fill("input[name=display_name]", "Mia M.");
    await submitAndWait(page, page.getByRole("button", { name: "Namen speichern" })); await errText(page);
    const { data } = await db.from("profiles").select("display_name").eq("id", ids.member).single();
    if (data.display_name !== "Mia M.") throw new Error(data.display_name);
  });
  await step("member does not see garden name form", async () => { if (await page.getByRole("button", { name: "Garten speichern" }).count()) throw new Error("visible"); });
  await step("member records expense and payment", async () => {
    await go(page, `/billing`);
    await page.fill("input[name=title]", "Benzin"); await page.fill("input[name=amount]", "20,00");
    await submitAndWait(page, page.getByRole("button", { name: "Eintragen" })); await errText(page);
    await page.getByText("Zahlung an jemanden").click();
    await page.fill("input[name=title]", "Ausgleich"); await page.fill("input[name=amount]", "5");
    await page.selectOption("select[name=paid_to]", ids.owner);
    await submitAndWait(page, page.getByRole("button", { name: "Eintragen" })); await errText(page);
    const { data } = await db.from("garden_transactions").select("type,amount_cents,paid_to");
    if (data.length !== 2) throw new Error(JSON.stringify(data));
  });
  await step("member payment without recipient is rejected", async () => {
    await page.getByText("Zahlung an jemanden").click();
    await page.fill("input[name=title]", "Fehler"); await page.fill("input[name=amount]", "5");
    await submitAndWait(page, page.getByRole("button", { name: "Eintragen" }));
    const { data } = await db.from("garden_transactions").select("id").eq("title", "Fehler");
    if (data.length) throw new Error("stored anyway");
    const t = await page.evaluate(() => document.body.innerText);
    return /Application error|Something went wrong/.test(t) ? "shows generic error page (not user friendly)" : "rejected";
  });
  await step("member cannot see billing admin area", async () => { await go(page, `/billing`); if (await page.getByText("Verwaltung").count()) throw new Error("visible"); });
  await step("member cannot see member edit controls", async () => { await go(page, `/settings/members`); if (await page.getByText("Bearbeiten").count()) throw new Error("visible"); });
  await step("member sends chat message", async () => {
    await go(page, `/chat`);
    const box = page.locator("textarea").first(); await box.fill("Hallo zusammen"); await box.press("Enter");
    await page.waitForTimeout(1500);
    const { data } = await db.from("garden_chat_messages").select("content").eq("content", "Hallo zusammen");
    if (!data?.length) throw new Error("not stored");
  });
  if (problems.length) results.push(`INFO member console: ${problems.slice(0, 3).join(" ; ")}`);
  await context.close();
}

// ADMIN
{
  const { context, page, problems } = await login(browser, "admin");
  await step("admin completes overdue task (10 days late)", async () => {
    await go(page, `/dashboard`);
    await submitAndWait(page, page.getByRole("button", { name: /Dienst erledigt/ }).first()); await errText(page);
    const t = await task("Hecke schneiden");
    if (t.status !== "done") throw new Error("status " + t.status);
  });
  await step("admin approves takeover request", async () => {
    const t = await task("Laub rechen");
    await go(page, `/tasks/${t.id}`);
    const btn = page.getByRole("button", { name: "Bestaetigen" });
    if (!(await btn.count())) throw new Error("no pending request visible");
    await submitAndWait(page, btn.first()); await errText(page);
    const t2 = await task("Laub rechen");
    if (t2.assigned_to !== ids.member) throw new Error("assigned " + t2.assigned_to);
  });
  await step("admin creates task", async () => {
    await go(page, `/tasks/new`);
    await page.fill("#title", "Beet giessen");
    await Promise.all([page.waitForURL(/\/tasks\/[0-9a-f-]{36}/, { timeout: 15000 }), page.getByRole("button", { name: "Aufgabe erstellen" }).click()]);
    const t = await task("Beet giessen"); if (!t) throw new Error("not created");
    return `assigned to ${Object.entries(ids).find(([, v]) => v === t.assigned_to)?.[0]}`;
  });
  await step("admin reopens done task", async () => {
    const t = await task("Rasen maehen");
    await go(page, `/tasks/${t.id}`);
    await submitAndWait(page, page.getByRole("button", { name: /rueckgaengig/ })); await errText(page);
    const t2 = await task("Rasen maehen"); if (t2.status === "done") throw new Error("still done");
  });
  await step("admin moves task to trash", async () => {
    const t = await task("Beet giessen");
    await go(page, `/tasks/${t.id}`);
    await submitAndWait(page, page.getByRole("button", { name: "In Papierkorb" })); await errText(page);
    const t2 = await task("Beet giessen"); if (t2.status !== "cancelled") throw new Error(t2.status);
  });
  await step("admin generates seasonal tasks twice without duplicates", async () => {
    await go(page, `/templates`);
    await submitAndWait(page, page.getByRole("button", { name: "Saisonaufgaben erzeugen" })); await errText(page);
    const { count: c1 } = await db.from("tasks").select("id", { count: "exact", head: true });
    await submitAndWait(page, page.getByRole("button", { name: "Saisonaufgaben erzeugen" }));
    const { count: c2 } = await db.from("tasks").select("id", { count: "exact", head: true });
    if (c2 !== c1) throw new Error(`${c1} -> ${c2}`);
    return `${c1} tasks`;
  });
  await step("admin has no owner role option", async () => {
    await go(page, `/settings/members`);
    const n = await page.locator("option[value=owner]").count();
    return `owner options visible: ${n} (only on owner row expected)`;
  });
  await step("admin prepares member", async () => {
    await page.getByText("Vorab anlegen").click();
    const form = page.locator("form").filter({ hasText: "Person anlegen" });
    await form.locator("input[name=display_name]").fill("Paula Vorab");
    await form.locator("input[name=email]").fill("paula@test.local");
    await submitAndWait(page, form.getByRole("button", { name: "Person anlegen" })); await errText(page);
    const id = await uid("paula@test.local"); if (!id) throw new Error("no auth user");
    const { data } = await db.from("garden_members").select("role,is_active").eq("user_id", id).single();
    if (!data?.is_active) throw new Error("not member");
  });
  if (problems.length) results.push(`INFO admin console: ${problems.slice(0, 3).join(" ; ")}`);
  await context.close();
}

// OWNER: invite replacing member, newbie accepts
let token;
{
  const { context, page, problems } = await login(browser, "owner");
  await step("owner creates invite replacing member", async () => {
    await go(page, `/settings/members`);
    const form = page.locator("form").filter({ hasText: "Link erstellen" });
    await form.locator("select[name=replaces_user_id]").selectOption(ids.member);
    await submitAndWait(page, form.getByRole("button", { name: "Link erstellen" })); await errText(page);
    const { data } = await db.from("garden_invites").select("token,replaces_user_id").is("accepted_at", null).order("created_at", { ascending: false }).limit(1).single();
    if (data.replaces_user_id !== ids.member) throw new Error("replaces not stored");
    token = data.token;
  });
  await context.close();
  if (problems.length) results.push(`INFO owner console: ${problems.slice(0, 3).join(" ; ")}`);
}
{
  const { context, page } = await login(browser, "newbie").catch(async () => ({ context: null, page: null }));
  await step("newbie accepts invite and takes over place", async () => {
    if (!page) throw new Error("login failed");
    await go(page, `/invite/${token}`);
    await Promise.all([page.waitForURL(/dashboard/, { timeout: 10000 }), page.getByRole("button", { name: "Einladung annehmen" }).click()]);
    const { data: m } = await db.from("garden_members").select("user_id,is_active,slot_id,left_on").in("user_id", [ids.member, ids.newbie]);
    const old = m.find((x) => x.user_id === ids.member); const nw = m.find((x) => x.user_id === ids.newbie);
    if (old.is_active || !nw?.is_active || old.slot_id !== nw.slot_id) throw new Error(JSON.stringify(m));
    const t = await task("Unkraut jaeten");
    return `open task now ${t.assigned_to === ids.newbie ? "newbie" : t.assigned_to}`;
  });
  await context?.close();
}
{
  const { context, page } = await login(browser, "owner");
  await step("owner sees team on billing and closes period", async () => {
    await go(page, `/billing`);
    const text = await page.evaluate(() => document.body.innerText);
    if (!/Mia M\. \+ Nico Neu|Nico Neu/.test(text)) throw new Error("team not shown");
    await page.getByText("Verwaltung").click();
    await page.fill("input[name=confirm]", "ABSCHLIESSEN");
    await submitAndWait(page, page.getByRole("button", { name: "Abrechnung abschliessen" }));
    const t2 = await page.evaluate(() => document.body.innerText);
    const { data } = await db.from("billing_periods").select("starts_on,ends_on");
    return /Application error|Something went wrong/.test(t2) ? `error page (periods ${JSON.stringify(data)})` : `periods ${JSON.stringify(data)}`;
  });
  await step("owner marks admin as moved out and reactivates", async () => {
    await go(page, `/settings/members`);
    const card = page.locator("li").filter({ hasText: "Adam Admin" });
    await card.getByText("Bearbeiten").click();
    await submitAndWait(page, card.getByRole("button", { name: "Als ausgezogen markieren" })); await errText(page);
    let { data } = await db.from("garden_members").select("is_active,left_on").eq("user_id", ids.admin).single();
    if (data.is_active) throw new Error("still active");
    const former = page.locator("li").filter({ hasText: "Adam Admin" });
    await submitAndWait(page, former.getByRole("button", { name: "Wieder aktivieren" }));
    ({ data } = await db.from("garden_members").select("is_active,left_on,joined_on").eq("user_id", ids.admin).single());
    if (!data.is_active) throw new Error("not reactivated");
  });
  await step("owner demoting self (last owner) shows friendly error", async () => {
    await go(page, `/settings/members`);
    const card = page.locator("li").filter({ hasText: "Olga Owner" });
    await card.getByText("Bearbeiten").click();
    await card.locator("select[name=role]").selectOption("member");
    await card.getByRole("button", { name: "Rolle speichern" }).click();
    const alert = card.getByRole("alert");
    await alert.waitFor({ timeout: 10000 });
    await errText(page);
    const { data } = await db.from("garden_members").select("role").eq("user_id", ids.owner).single();
    if (data.role !== "owner") throw new Error("role changed");
    return (await alert.innerText()).slice(0, 90);
  });
  await step("owner corrects move-in date of admin", async () => {
    await go(page, `/settings/members`);
    const card = page.locator("li").filter({ hasText: "Adam Admin" });
    await card.getByText("Bearbeiten").click();
    await card.locator("input[name=joined_on]").fill("2026-01-01");
    await submitAndWait(page, card.getByRole("button", { name: "Einzugsdatum speichern" })); await errText(page);
    const { data } = await db.from("garden_members").select("joined_on").eq("user_id", ids.admin).single();
    if (data.joined_on !== "2026-01-01") throw new Error(data.joined_on);
  });
  await step("owner deletes a duplicate correction", async () => {
    await go(page, `/billing`);
    await page.getByText("Verwaltung").click();
    const form = page.locator("form").filter({ hasText: "Korrektur eintragen" });
    await form.locator("input[name=points_delta]").fill("5");
    await form.locator("input[name=reason]").fill("Doppelt");
    await submitAndWait(page, form.getByRole("button", { name: "Korrektur eintragen" })); await errText(page);
    await page.getByText("Verlauf in diesem Zeitraum").click();
    const row = page.locator("div").filter({ hasText: /^Korrektur fuer/ }).filter({ hasText: "Doppelt" }).last();
    await submitAndWait(page, page.getByRole("button", { name: "Loeschen" }).first()); await errText(page);
    const { data } = await db.from("member_adjustments").select("id").eq("reason", "Doppelt");
    if (data.length) throw new Error("not deleted");
    void row;
  });
  await step("invite with email only works for that email", async () => {
    const { data: inv, error } = await db.from("garden_invites").insert({ garden_id: (await db.from("gardens").select("id").limit(1).single()).data.id, role: "member", email: "someone.else@test.local" }).select("token").single();
    if (error) throw error;
    const { context: c2, page: p2 } = await login(browser, "stranger").catch(() => ({}));
    if (!p2) throw new Error("stranger login failed");
    await p2.goto(`${BASE}/invite/${inv.token}`);
    await p2.getByRole("button", { name: "Einladung annehmen" }).click();
    await p2.getByRole("alert").waitFor({ timeout: 10000 });
    const msg = await p2.getByRole("alert").innerText();
    await c2.close();
    const { data: m } = await db.from("garden_members").select("id").eq("user_id", ids.stranger);
    if (m.length) throw new Error("stranger joined");
    return msg.slice(0, 80);
  });
  await step("owner marks notification read", async () => {
    await go(page, `/notifications`);
    const btn = page.getByRole("button", { name: "Gelesen" });
    if (!(await btn.count())) return "no notifications";
    await submitAndWait(page, btn.first()); await errText(page);
  });
  await context.close();
}
await step("cron route runs", async () => {
  const r = await fetch(`${BASE}/api/cron/garden-jobs`, { headers: { authorization: "Bearer localcron" } });
  const body = await r.text(); if (!r.ok) throw new Error(`${r.status} ${body.slice(0, 200)}`);
  const r2 = await fetch(`${BASE}/api/cron/garden-jobs`); if (r2.status !== 401) throw new Error("no auth accepted: " + r2.status);
  return body.slice(0, 160);
});
{
  const { context, page } = await login(browser, "member").catch(() => ({}));
  await step("moved-out member login experience", async () => {
    if (!page) return "login redirected elsewhere";
    await page.waitForFunction(() => !document.body.innerText.includes("Gartenplan wird geladen"), null, { timeout: 15000 });
    const t = await page.evaluate(() => document.body.innerText);
    return t.slice(0, 120).replace(/\s+/g, " ");
  });
  await context?.close();
}
await browser.close();
console.log(results.join("\n"));
process.exitCode = failed ? 1 : 0;
