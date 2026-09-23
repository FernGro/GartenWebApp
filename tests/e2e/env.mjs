export const URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const ANON = process.env.E2E_SUPABASE_ANON_KEY ?? "";
export const SERVICE = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? "";
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3200";
export const CHROME = process.env.E2E_CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const PW = "Testpass123!";
export const users = {
  owner: { email: "owner@test.local", name: "Olga Owner" },
  admin: { email: "admin@test.local", name: "Adam Admin" },
  member: { email: "member@test.local", name: "Mia Member" },
  newbie: { email: "newbie@test.local", name: "Nico Neu" },
  stranger: { email: "stranger@test.local", name: "Sam Fremd" },
};

// Tests delete and create data; never point them at a real project.
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL)) {
  throw new Error(`E2E tests only run against a local Supabase (got ${URL}).`);
}
if (!ANON || !SERVICE) {
  throw new Error("Set E2E_SUPABASE_ANON_KEY and E2E_SUPABASE_SERVICE_ROLE_KEY (see tests/e2e/README.md).");
}
