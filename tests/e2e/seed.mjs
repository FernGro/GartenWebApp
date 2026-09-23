import { createClient } from "@supabase/supabase-js";
import { URL, ANON, SERVICE, PW, users } from "./env.mjs";

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const testEmails = new Set(Object.values(users).map((u) => u.email).concat("paula@test.local"));
for (const u of (await admin.auth.admin.listUsers({ perPage: 1000 })).data.users) {
  if (testEmails.has(u.email)) await admin.from("gardens").delete().eq("created_by", u.id);
}
for (const u of (await admin.auth.admin.listUsers({ perPage: 1000 })).data.users) {
  if (testEmails.has(u.email)) await admin.auth.admin.deleteUser(u.id);
}
const ids = {};
for (const [key, u] of Object.entries(users)) {
  const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: PW, email_confirm: true, user_metadata: { display_name: u.name } });
  if (error && !error.message.includes("already")) throw error;
  ids[key] = data?.user?.id ?? (await admin.auth.admin.listUsers()).data.users.find((x) => x.email === u.email).id;
}
async function as(key) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: users[key].email, password: PW });
  if (error) throw error;
  return c;
}
const owner = await as("owner");
const { data: gardenId, error: gErr } = await owner.rpc("create_garden_with_owner", { garden_name: "Testgarten" });
if (gErr) throw gErr;
for (const [key, role] of [["admin", "admin"], ["member", "member"]]) {
  const { data: inv, error } = await owner.from("garden_invites").insert({ garden_id: gardenId, role, created_by: ids.owner }).select("token").single();
  if (error) throw error;
  const c = await as(key);
  const { error: aErr } = await c.rpc("accept_garden_invite", { invite_token: inv.token });
  if (aErr) throw aErr;
}
const today = new Date().toISOString().slice(0, 10);
const past = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10);
const { error: tErr } = await admin.from("tasks").insert([
  { garden_id: gardenId, title: "Rasen maehen", points: 3, status: "assigned", due_date: today, assigned_to: ids.member, original_assignee: ids.member },
  { garden_id: gardenId, title: "Hecke schneiden", points: 4, status: "overdue", due_date: past, assigned_to: ids.admin, original_assignee: ids.admin },
  { garden_id: gardenId, title: "Laub rechen", points: 2, status: "assigned", due_date: today, assigned_to: ids.owner, original_assignee: ids.owner },
  { garden_id: gardenId, title: "Unkraut jaeten", points: 2, status: "open", due_date: today },
]);
if (tErr) throw tErr;
console.log(`seeded Testgarten ${gardenId}`);
